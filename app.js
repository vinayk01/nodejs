const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Database connection using a pool (better for handling errors)
const db = mysql.createPool({
    connectionLimit: 10,
    host: 'logindb.cluster-c5mq0yy40xyg.eu-north-1.rds.amazonaws.com', // Use this instead of 'localhost' if MySQL is on the host machine
    user: 'root',
    password: 'new_password',
    database: 'loginDB'
});

// Check database connection
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

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).send('Error querying database');
        }

        if (result.length === 0) {
            return res.status(400).send('User not found');
        }

        const user = result[0];

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).send('Error checking password');
            }

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
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).send('Error hashing password');
        }

        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(query, [username, hash], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).send('Username already exists');
                }
                console.error('Error inserting user into database:', err);
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
