const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // change to your MySQL user
    password: 'new_password', // change to your MySQL password
    database: 'loginDB' // use your database name
});

db.connect((err) => {
    if (err) {
        console.log('Database connection error:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html'); // Serve the login form
});

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, result) => {
        if (err) {
            return res.status(500).send('Error querying database');
        }

        if (result.length === 0) {
            return res.status(400).send('User not found');
        }

        const user = result[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (isMatch) {
                req.session.username = user.username;
                return res.send('Login successful');
            } else {
                return res.status(400).send('Incorrect password');
            }
        });
    });
});

app.get('/dashboard', (req, res) => {
    if (req.session.username) {
        res.send(`Welcome, ${req.session.username}! This is your dashboard.`);
    } else {
        res.send('Please log in first.');
    }
});

// Registration route
app.post('/register', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).send('Error hashing password');
        }

        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(query, [username, hash], (err, result) => {
            if (err) {
                return res.status(500).send('Error inserting user into database');
            }

            res.send('User registered successfully');
        });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

