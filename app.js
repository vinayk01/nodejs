```javascript
const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 9000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'new_password',
    database: process.env.DB_NAME || 'loginDB'
});

db.connect((err) => {
    if (err) {
        console.error('MySQL Connection Failed:', err);
        return;
    }
    console.log('Connected to MySQL');
});

app.get('/', (req, res) => {
    res.send(`
        <html>
        <body>
            <h2>Login</h2>

            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Username" required><br><br>
                <input type="password" name="password" placeholder="Password" required><br><br>
                <button type="submit">Login</button>
            </form>

            <hr>

            <h2>Register</h2>

            <form action="/register" method="POST">
                <input type="text" name="username" placeholder="Username" required><br><br>
                <input type="password" name="password" placeholder="Password" required><br><br>
                <button type="submit">Register</button>
            </form>
        </body>
        </html>
    `);
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            return res.status(500).send('Password hash failed');
        }

        db.query(
            'INSERT INTO users(username,password) VALUES (?,?)',
            [username, hash],
            (err) => {
                if (err) {
                    return res.status(500).send(err.message);
                }

                res.send('User Registered Successfully');
            }
        );
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query(
        'SELECT * FROM users WHERE username=?',
        [username],
        (err, result) => {

            if (err) {
                return res.status(500).send('Database Error');
            }

            if (result.length === 0) {
                return res.status(401).send('User Not Found');
            }

            bcrypt.compare(password, result[0].password, (err, match) => {

                if (match) {
                    req.session.username = username;
                    return res.redirect('/dashboard');
                }

                return res.status(401).send('Invalid Password');
            });
        }
    );
});

app.get('/dashboard', (req, res) => {

    if (!req.session.username) {
        return res.redirect('/');
    }

    res.send(`
        <html>
        <body>
            <h1>Welcome ${req.session.username}</h1>
            <a href="/logout">Logout</a>
        </body>
        </html>
    `);
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.listen(port, () => {
    console.log('Server running on port ' + port);
});
```

