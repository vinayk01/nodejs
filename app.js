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

// Create uploads folder if not exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Multer storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

// File type filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpg|jpeg|png|pdf|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname || mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Only jpg, jpeg, png, pdf, txt files are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: fileFilter
});

// Database connection using a pool
const db = mysql.createPool({
    connectionLimit: 10,
    host: '192.168.49.1',
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
        res.send(`
            <h2>Welcome, ${req.session.username}!</h2>
            <p>This is your dashboard.</p>

            <form action="/upload" method="POST" enctype="multipart/form-data">
                <input type="file" name="myfile" required />
                <button type="submit">Upload File</button>
            </form>
        `);
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

// File upload route
app.post('/upload', upload.single('myfile'), (req, res) => {
    if (!req.session.username) {
        return res.status(401).send('Please log in first.');
    }

    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    res.send(`
        <h3>File uploaded successfully</h3>
        <p>File name: ${req.file.filename}</p>
        <p><a href="/uploads/${req.file.filename}" target="_blank">View File</a></p>
    `);
});

// Error handler for multer
app.use((err, req, res, next) => {
    if (err) {
        return res.status(400).send(err.message);
    }
    next();
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // folder must exist
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Upload route
app.post('/upload', upload.single('myfile'), (req, res) => {
  if (!req.file) {
    return res.send('No file uploaded');
  }

  res.send(`File uploaded successfully: ${req.file.filename}`);
});
