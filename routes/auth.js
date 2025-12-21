const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const db = require('../config/database');

// Views
router.get('/login', (req, res) => res.render('login', { error: null }));
router.get('/signup', (req, res) => res.render('signup', { error: null }));

// Signup
router.post('/signup', async (req, res) => {
    const { username, password, email, address, phone, first_name, last_name   } = req.body;

    // --- VALIDATION SECTION ---
    
    // 1. Check for empty fields
    if (!username || !password || !email || !address || !phone) {
        return res.render('signup', { error: 'All fields are required.' });
    }

    // 2. Username Length Validation
    if (username.length < 3) {
        return res.render('signup', { error: 'Username must be at least 3 characters long.' });
    }

    // 3. Password Strength Validation
    if (password.length < 8) {
        return res.render('signup', { error: 'Password must be at least 8 characters long.' });
    }

    // 4. Email Format Validation (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.render('signup', { error: 'Please enter a valid email address.' });
    }

    // 5. Phone Number Validation (Numeric check)
    if (isNaN(phone) || phone.length < 10) {
        return res.render('signup', { error: 'Please enter a valid numeric phone number.' });
    }

    // --- DATABASE EXECUTION ---
    try {
        await db.query(
            `INSERT INTO CUSTOMER (Username, Password, Email, Address, Phone, First_Name, Last_Name)
            VALUES (?, SHA2(?, 256), ?, ?, ?, ?, ?)`,
            [username, password, email, address, phone, first_name, last_name]);

        // Initialize the shopping cart for this new user
        await db.query('INSERT INTO SHOPPING_CART (Customer_Username) VALUES (?)', [username]);
        
        console.log(`New user registered and hashed by DB: ${username}`);
        res.redirect('/login');

    } catch (error) {
        console.error("Signup DB Error:", error);
        // Handle duplicate entries (Username or Email)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.render('signup', { error: 'Username or Email is already taken.' });
        }
        res.render('signup', { error: 'A database error occurred. Please try again.' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Check ADMIN table first
        const [admin] = await db.query(
            'SELECT Username, "Admin" as role FROM ADMIN WHERE Username = ? AND Password = SHA2(?, 256)', 
            [username, password]
        );

        if (admin.length > 0) {
            req.session.user = { username: admin[0].Username, role: 'Admin' };
            console.log("Admin Login Successful!");
            return res.redirect('/admin/dashboard');
        }

        // 2. Check CUSTOMER table
        const [customer] = await db.query(
            'SELECT Username, "Customer" as role FROM CUSTOMER WHERE Username = ? AND Password = SHA2(?, 256)', 
            [username, password]
        );

        if (customer.length > 0) {
            req.session.user = { username: customer[0].Username, role: 'Customer' };
            console.log("Customer Login Successful!");
            return res.redirect('/customer/product_list');
        }

        res.render('login', { error: 'Invalid username or password' });

    } catch (error) {
        console.error("Login Error:", error);
        res.render('login', { error: 'Database error' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});
console.log('--- AUTH.JS EXPORTED SUCCESSFULLY ---');
module.exports = router;