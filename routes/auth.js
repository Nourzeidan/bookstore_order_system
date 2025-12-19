const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const db = require('../config/database');

// // Dummy users
// let usersTable = [
//     {
//         id: 1,
//         username: 'admin',
//         password_hash: '$2a$12$/JRIiz9xNCHaz.91GO2W5OEkjLVMLziVvnbdaYqtZFwOqyveHoBtG',
//         user_role: 'Admin'
//     }
// ];

// Views
router.get('/login', (req, res) => res.render('login', { error: null }));
router.get('/signup', (req, res) => res.render('signup', { error: null }));

// Signup
router.post('/signup', async (req, res) => {
    const { username, password, email, address, phone } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        // query to insert a new customer
        await db.query(
            'INSERT INTO CUSTOMER (Username, Password, Email, Address, Phone) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, email, address, phone]
        );
        
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.render('signup', { error: 'Username already exists or data is invalid.' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Search BOTH tables simultaneously
        const [admin] = await db.query('SELECT *, "Admin" as role FROM ADMIN WHERE Username = ?', [username]);
        const [customer] = await db.query('SELECT *, "Customer" as role FROM CUSTOMER WHERE Username = ?', [username]);

        // Combine results
        const allMatches = [...admin, ...customer];

        if (allMatches.length === 0) {
            return res.render('login', { error: 'Invalid username' });
        }

        // Check passwords for all matches (in case of duplicates)
        for (const user of allMatches) {
            const match = await bcrypt.compare(password, user.Password);
            if (match) {
            // We use user.Username because we know it exists from the WHERE clause
            req.session.userId = user.Username || user.username || user.Admin_ID; 
            req.session.role = user.role;
            req.session.user = { username: user.Username || user.username };

            console.log("Login Successful! Session ID set to:", req.session.userId);

            return (user.role === 'Admin') 
                ? res.redirect('/admin/dashboard') 
                : res.redirect('/customer/product_list');
        }
        }

        res.render('login', { error: 'Invalid password' });
    } catch (error) {
        res.render('login', { error: 'Database error' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});
console.log('--- AUTH.JS EXPORTED SUCCESSFULLY ---');
module.exports = router;