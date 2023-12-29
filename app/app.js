const express = require('express');
const mysql = require('mysql');
const mongodb = require('mongodb');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Routes
// Home Page
app.get('/', (req, res) => {
    res.render('home');
});

// Stores Page
app.get('/stores', async (req, res) => {
    try {
        const stores = await queryMySQL('SELECT * FROM store');
        res.render('stores', { stores });
    } catch (err) {
        console.error('Error fetching stores from MySQL: ' + err);
        res.status(500).send('Internal Server Error');
    }
});

// Products Page
app.get('/products', async (req, res) => {
    try {
        const products = await queryMySQL('SELECT * FROM product');
        res.render('products', { products });
    } catch (err) {
        console.error('Error fetching products from MySQL: ' + err);
        res.status(500).send('Internal Server Error');
    }
});

// Managers Page
app.get('/managers', async (req, res) => {
    try {
        const managers = await queryMongoDB('managers');
        res.render('managers', { managers });
    } catch (err) {
        console.error('Error fetching managers from MongoDB: ' + err);
        res.status(500).send('Internal Server Error');
    }
});

// Edit Store Page
app.get('/stores/edit/:sid', async (req, res) => {
    const { sid } = req.params;
    try {
        const store = await queryMySQL('SELECT * FROM store WHERE sid = ?', [sid]);
        res.render('editStore', { store: store[0] });
    } catch (err) {
        console.error('Error fetching store from MySQL: ' + err);
        res.status(500).send('Internal Server Error');
    }
});

// Add Manager Page
app.get('/managers/add', (req, res) => {
    res.render('addManager');
});

// Handle the form submission to add a manager to MongoDB
app.post('/managers/add', async (req, res) => {
    const { managerId, name, salary } = req.body;

    try {
        const managersCollection = mongoClient.db('proj2023MongoDB').collection('managers');
        await managersCollection.insertOne({ _id: managerId, name, salary: parseFloat(salary) });
        res.redirect('/managers');
    } catch (err) {
        console.error('Error adding manager to MongoDB: ' + err);
        res.status(500).send('Internal Server Error');
    }
});

// Helper function to query MySQL
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

// Helper function to query MongoDB
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
