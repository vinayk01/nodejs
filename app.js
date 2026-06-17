```javascript
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

const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

const db = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST || '10.0.1.161',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'new_password',
    database: process.env.DB_NAME || 'loginDB'
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL');
        connection.release();
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).send('Password hash error');
        }

        db.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hash],
            (err) => {
                if (err) {
                    return res.status(500).send(err.message);
                }

                res.send('User registered successfully');
            }
        );
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, results) => {
            if (err) {
                return res.status(500).send('Database error');
            }

            if (results.length === 0) {
                return res.status(401).send('Invalid username');
            }

            bcrypt.compare(password, results[0].password, (err, match) => {
                if (match) {
                    req.session.username = username;
                    res.send('Login successful');
                } else {
                    res.status(401).send('Invalid password');
                }
            });
        }
    );
});

app.get('/dashboard', (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('Please login first');
    }

    res.send(`
        <h2>Welcome ${req.session.username}</h2>

        <form action="/upload" method="post" enctype="multipart/form-data">
            <input type="file" name="myfile" required />
            <button type="submit">Upload</button>
        </form>
    `);
});

app.post('/upload', upload.single('myfile'), (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('Please login first');
    }

    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    res.send(`
        <h3>File uploaded successfully</h3>
        <p>${req.file.filename}</p>
        <a href="/uploads/${req.file.filename}" target="_blank">
            View File
        </a>
    `);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
```

