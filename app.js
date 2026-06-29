const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 9000;


// Database connection
const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || '10.0.1.49',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'new_password',
    database: process.env.DB_NAME || 'loginDB'
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to MySQL database');
        connection.release();
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
        if (err) return res.status(500).send('Error querying database');
        if (result.length === 0) return res.status(400).send('User not found');
        bcrypt.compare(password, result[0].password, (err, isMatch) => {
            if (err) return res.status(500).send('Error checking password');
            if (isMatch) {
                req.session.username = result[0].username;
                return res.send('Login successful');
            }
            return res.status(400).send('Incorrect password');
        });
    });
});

app.get('/dashboard', (req, res) => {
    if (req.session.username) {
        res.send(`
            <h2>Welcome, ${req.session.username}!</h2>
            <form action="/upload" method="POST" enctype="multipart/form-data">
                <input type="file" name="myfile" required />
                <button type="submit">Upload File</button>
            </form>
        `);
    } else {
        res.send('Please log in first.');
    }
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).send('Error hashing password');
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).send('Username already exists');
                return res.status(500).send('Error inserting user');
            }
            res.send('User registered successfully');
        });
    });
});


app.use((err, req, res, next) => {
    if (err) return res.status(400).send(err.message);
    next();
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));
