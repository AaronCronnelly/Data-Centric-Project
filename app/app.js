// Import required packages
const express = require('express'); // Express for web framework
const mysql = require('mysql'); // MySQL for database interaction
const mongodb = require('mongodb'); // MongoDB for NoSQL database
const bodyParser = require('body-parser'); // Body parser for handling HTTP request data
const expressLayouts = require('express-ejs-layouts'); // Layouts for EJS templates

// Create an Express app
const app = express();
const port = process.env.PORT || 3000; // Set the port

// Set EJS as the view engine and use express-ejs-layouts
app.set('view engine', 'ejs');
// app.use(expressLayouts);
// app.set('layout', 'views/layout');

// Content Security Policy middleware
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'");
    next();
});

// Middleware for parsing URL-encoded data
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Connection Pool
const mysqlPool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'Coolermaster',
    database: 'proj2023',
});

// MongoDB Connection
const mongoClient = new mongodb.MongoClient('mongodb://localhost:27017/proj2023MongoDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Connect to MongoDB
async function connectMongoDB() {
    try {
        await mongoClient.connect();
        console.log('Connected to MongoDB database');
    } catch (err) {
        console.error('MongoDB connection failed: ' + err.stack);
    }
}

// Connect to MongoDB
connectMongoDB();

// Define queryMySQL function
function queryMySQL(sql, params) {
    return new Promise((resolve, reject) => {
        mysqlPool.query(sql, params, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Define queryMongoDB function
async function queryMongoDB(collectionName, query) {
    console.log('Entering queryMongoDB');

    const startTime = new Date();
    try {
        const collection = mongoClient.db('proj2023MongoDB').collection(collectionName);
        const results = await collection.find(query || {}).toArray();  // Use the provided query or an empty object if not provided
        const endTime = new Date();
        const duration = endTime - startTime;

        console.log(`MongoDB query duration: ${duration} ms`);
        console.log('MongoDB query results:', results);

        return results;
    } catch (err) {
        console.error('MongoDB query error:', err);
        throw err;
    }
}

// Routes

// Get all stores
app.get('/stores', async (req, res, next) => {
    try {
        const stores = await queryMySQL('SELECT * FROM store');
        res.render('stores', { stores, layout: 'layout', content: 'Stores Page' });
    } catch (err) {
        console.error('Error fetching stores from MySQL: ' + err);
        next(err);
    }
});

// Edit store details
app.post('/stores/edit/:sid', async (req, res, next) => {
    const { sid } = req.params;
    const { location, mgrid } = req.body;

    try {
        // Check if the new Manager ID exists in MongoDB
        const isManagerExists = await queryMongoDB('managers', { _id: mgrid });

        let errorMessage;

        if (!isManagerExists || isManagerExists.length === 0) {
            errorMessage = `Manager ID '${mgrid}' doesn't exist in MongoDB.`;
        } else {
            // Check if the new Manager ID is already assigned to another store
            const isManagerAssigned = await queryMySQL('SELECT * FROM store WHERE mgrid = ? AND sid != ?', [mgrid, sid]);

            if (isManagerAssigned.length > 0) {
                errorMessage = `Manager ID '${mgrid}' is already assigned to another store.`;
            } else {
                // Perform validation and update operation in the database
                await queryMySQL('UPDATE store SET location=?, mgrid=? WHERE sid=?', [location, mgrid, sid]);

                // Redirect to the stores page after updating
                return res.redirect('/stores');
            }
        }

        // Redirect to the edit page with an error query parameter
        res.redirect(`/stores/edit/${sid}?error=${encodeURIComponent(errorMessage)}`);
    } catch (err) {
        console.error('Error updating store: ' + err);
        next(err);
    }
});

// Get edit store page
app.get('/stores/edit/:sid', async (req, res, next) => {
    const { sid } = req.params;
    const error = req.query.error; // Get the error from the query parameter

    try {
        const store = await queryMySQL('SELECT * FROM store WHERE sid = ?', [sid]);
        res.render('editStore', { store: store[0], layout: 'layout', content: "Edit Store Page", error });
    } catch (err) {
        console.error('Error fetching store from MySQL: ' + err);
        next(err);
    }
});

// Add store page
app.get('/stores/add', (req, res) => {
    res.render('addStore', { layout: 'layout', content: 'Add Store Page' });
});

// Add new store
app.post('/stores/add', async (req, res, next) => {
    const { location, mgrid } = req.body;

    try {
        // Perform validation and insert operation in the database
        await queryMySQL('INSERT INTO store (location, mgrid) VALUES (?, ?)', [location, mgrid]);

        // Redirect to the stores page after adding the new store
        res.redirect('/stores');
    } catch (err) {
        console.error('Error adding store: ' + err);
        next(err);
    }
});

// Products Page
app.get('/products', async (req, res, next) => {
    try {
        const products = await queryMySQL(`
            SELECT p.pid, p.productdesc, ps.sid, s.location, ps.price
            FROM product p
            LEFT JOIN product_store ps ON p.pid = ps.pid
            LEFT JOIN store s ON ps.sid = s.sid
            ORDER BY p.pid
        `);

        res.render('products', {
            products: products,
            layout: 'layout',
            content: 'Products Page',
            columns: ['Product ID', 'Product Description', 'Store ID', 'Location', 'Price']
        });
    } catch (err) {
        console.error('Error fetching products from MySQL: ' + err);
        next(err);
    }
});

// Delete Product
app.get('/products/delete/:pid', async (req, res, next) => {
    const { pid } = req.params;

    try {
        // Check if the product is sold in any store
        const isProductSold = await queryMySQL('SELECT * FROM product_store WHERE pid = ?', [pid]);

        if (isProductSold.length > 0) {
            // Product is sold, cannot delete
            const errorMessage = `Product with ID '${pid}' is sold in stores and cannot be deleted.`;

            // Fetch the updated product data and render the Products Page with the error message
            const products = await queryMySQL(`
                SELECT p.pid, p.productdesc, ps.sid, s.location, ps.price
                FROM product p
                LEFT JOIN product_store ps ON p.pid = ps.pid
                LEFT JOIN store s ON ps.sid = s.sid
                ORDER BY p.pid
            `);

            res.render('products', { products, layout: 'layout', content: 'Products Page', error: errorMessage });
        } else {
            // Product is not sold, delete it from the database
            await queryMySQL('DELETE FROM product WHERE pid = ?', [pid]);

            // After successful delete, fetch the updated product data and redirect to Products Page
            const updatedProducts = await queryMySQL(`
                SELECT p.pid, p.productdesc, ps.sid, s.location, ps.price
                FROM product p
                LEFT JOIN product_store ps ON p.pid = ps.pid
                LEFT JOIN store s ON ps.sid = s.sid
                ORDER BY p.pid
            `);

            res.render('products', { products: updatedProducts, layout: 'layout', content: 'Products Page' });
        }
    } catch (err) {
        console.error('Error deleting product: ' + err);
        next(err);
    }
});

// Managers Page
app.get('/managers', async (req, res, next) => {
    console.log('Hit the /managers route'); // Add this log statement
    try {
        const managers = await queryMongoDB('managers');
        console.log('Managers data:', managers);
        res.render('managers', {
            managers,
            layout: 'layout',
            content: 'Managers Page',
            columns: ['Manager ID', 'Name', 'Salary']
        });
    } catch (err) {
        console.error('Error fetching managers from MongoDB:', err);
        next(err);
    }
});

// Add Manager Page
app.get('/managers/add', (req, res) => {
    res.render('addManager', { layout: 'layout', content: "Add Manager Page", error: null });
});

// Handle Add Manager Form Submission
app.post('/managers/add', async (req, res, next) => {
    const { managerId, name, salary } = req.body;

    try {
        // Perform validation for manager ID, name, and salary
       

        // Check if the manager ID already exists
        const existingManager = await queryMongoDB('managers', { _id: managerId });
        if (existingManager.length > 0) {
            const errorMessage = `Manager ID ${managerId} already taken. Please choose a different ID.`;
            res.render('addManager', { layout: 'layout', content: "Add Manager Page", error: errorMessage });
            return; // Stop further processing
        }

        // Perform insertion into MongoDB
        const result = await mongoClient.db('proj2023MongoDB').collection('managers').insertOne({
            _id: managerId,
            name: name,
            salary: parseInt(salary), // Convert salary to integer
        });

        console.log('Manager added:', result.ops[0]);

        // Redirect to the managers page after adding the new manager
        res.redirect('/managers');
    } catch (err) {
        console.error('Error adding manager: ' + err);
        // Pass the error to the next middleware
        res.render('addManager', { layout: 'layout', content: "Add Manager Page", error: err.message });
    }
});

// Edit Store Page
app.get('/stores/edit/:sid', async (req, res, next) => {
    const { sid } = req.params;
    try {
        const store = await queryMySQL('SELECT * FROM store WHERE sid = ?', [sid]);
        res.render('editStore', { store: store[0], layout: 'layout', content: "Edit Store Page" });
    } catch (err) {
        console.error('Error fetching store from MySQL: ' + err);
        next(err); // Pass the error to the next middleware
    }
});

// Home Page
app.get('/', (req, res) => {
    res.render('home', { layout: 'layout' });
});

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send(`Something went wrong! Error details: ${err.message}`);
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
