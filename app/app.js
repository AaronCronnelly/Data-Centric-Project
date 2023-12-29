const express = require('express');
const mysql = require('mysql');
const mongodb = require('mongodb');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Connection
const mysqlConnection = mysql.createConnection({
  host: 'your-mysql-host',
  user: 'your-mysql-username',
  password: 'your-mysql-password',
  database: 'proj2023',
});

mysqlConnection.connect((err) => {
  if (err) {
    console.error('MySQL connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL database');
});

// MongoDB Connection
const mongoClient = new mongodb.MongoClient('your-mongodb-connection-string', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoClient.connect((err) => {
  if (err) {
    console.error('MongoDB connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to MongoDB database');
});

// Routes
// Define your routes and handlers here

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
