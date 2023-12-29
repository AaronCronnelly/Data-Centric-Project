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
function queryMongoDB(collectionName) {
    return new Promise((resolve, reject) => {
        const collection = mongoClient.db('proj2023MongoDB').collection(collectionName);
        collection.find({}).toArray((err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
}

// Connect to MongoDB
connectMongoDB();

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

// Add this route handler after your GET /stores/edit/:sid route
app.post('/stores/edit/:sid', async (req, res, next) => {
    const { sid } = req.params;
    const { location, mgrid } = req.body;

    try {
        // Perform validation and update operation in the database
        // You need to implement the update operation using your queryMySQL function
        await queryMySQL('UPDATE store SET location=?, mgrid=? WHERE sid=?', [location, mgrid, sid]);

        // Redirect to the stores page after updating
        res.redirect('/stores');
    } catch (err) {
        console.error('Error updating store: ' + err);
        next(err);
    }
});

app.get('/stores/edit/:sid', async (req, res, next) => {
    const { sid } = req.params;

    try {
        const store = await queryMySQL('SELECT * FROM store WHERE sid = ?', [sid]);
        res.render('editStore', { store: store[0], layout: 'layout', content: "Edit Store Page" });
    } catch (err) {
        console.error('Error fetching store from MySQL: ' + err);
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
    try {
        const managers = await queryMongoDB('managers');
        console.log('Managers data:', managers); // Check if data is retrieved
        res.render('managers', {
            managers: managers,
            layout: 'layout',
            content: 'Managers Page',
            columns: ['Manager ID', 'Name', 'Salary']
        });
    } catch (err) {
        console.error('Error fetching managers from MongoDB: ' + err);
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
