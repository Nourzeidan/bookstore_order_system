const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

// hardcoded for now
let usersTable = [
    {
        id: 1,
        username: 'admin',
        // 1234
        password_hash: '$2a$12$/JRIiz9xNCHaz.91GO2W5OEkjLVMLziVvnbdaYqtZFwOqyveHoBtG', 
        user_role: 'Admin'
    }
];

// views
router.get('/login', (req, res) => res.render('login'));
router.get('/signup', (req, res) => res.render('signup'));

// POST: Signup Logic only for customers
router.post('/signup', async (req, res) => {
    try {
        const { username, password, email, user_role } = req.body;

        // 1. Hash the password (Security Requirement)
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 2. HARDCODED INSERT (Pushing to our array)
        const newUser = {
            id: usersTable.length + 1,
            username: username,
            password_hash: hashedPassword,
            user_role: user_role || 'Customer' 
        };
        
        usersTable.push(newUser);
        
        console.log("Current Users in Mock DB:", usersTable);
        res.redirect('/login');
    } catch (error) {
        res.status(500).send("Error during signup");
    }
});

// POST: Login Logic
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt: User=${username}, Pass=${password}`);

    try {
        const user = usersTable.find(u => u.username === username);

        if (!user) {
            console.log("Debug: User not found in array");
            return res.render('login', { error: 'Invalid username or password' });
        }

        console.log("Debug: User found, checking password...");
        
        // bcrypt.compare(plainText, hashedText)
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            console.log("Debug: Password matches! Setting session...");
            req.session.userId = user.id;
            req.session.role = user.user_role;

            if (user.user_role === 'Admin') {
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/customer/home');
            }
        } else {
            console.log("Debug: Password DOES NOT match");
            return res.render('login', { error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).send("Server error");
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;