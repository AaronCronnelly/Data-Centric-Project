const express = require('express');
const mysql = require('mysql');
const mongodb = require('mongodb');
const bodyParser = require('body-parser');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const port = process.env.PORT || 3000;

// Set EJS as the view engine and use express-ejs-layouts
app.set('view engine', 'ejs');
// app.use(expressLayouts);
// app.set('layout', 'views/layout');

// Content Security Policy
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'");
    next();
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Connection Pool
const mysqlPool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'Coolermaster',
    database: 'proj2023',
});


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
app.get('/stores', async (req, res, next) => {
    try {
        const stores = await queryMySQL('SELECT * FROM store');
        res.render('stores', { stores, layout: 'layout', content: 'Stores Page' });
    } catch (err) {
        console.error('Error fetching stores from MySQL: ' + err);
        next(err);
    }
});

app.post('/stores/edit/:sid', async (req, res, next) => {
    const { sid } = req.params;
    const { location, mgrid } = req.body;

    try {
        // Check if the new Manager ID already exists in MongoDB
        const isManagerExists = await queryMongoDB('managers', { _id: mgrid });

        let errorMessage;

        if (!isManagerExists) {
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



// code is here to add a store but cannot change SID,
app.get('/stores/add', (req, res) => {
    res.render('addStore', { layout: 'layout', content: 'Add Store Page' });
});

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
        const products = await queryMySQL('SELECT * FROM product');
        console.log('Products data:', products); // Check if data is retrieved
        res.render('products', {
            products: products,
            layout: 'layout',
            content: 'Products Page',
            columns: ['Product ID', 'Description', 'Store ID', 'Location', 'Price']
        });
    } catch (err) {
        console.error('Error fetching products from MySQL: ' + err);
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

// Add Manager Page
app.get('/managers/add', (req, res) => {
    res.render('addManager', { layout: 'layout', content: "Add Manager Page" });
});

// Home Page
app.get('/', (req, res) => {
    const content = "Home Page";
    res.render('home', { layout: 'layout', content: content });
});

//  error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send(`Something went wrong! Error details: ${err.message}`);
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
