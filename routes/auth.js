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

    // check empty fields
    if (!username || !password || !email || !address || !phone) {
        return res.render('signup', { error: 'All fields are required.' });
    }

    // username length Validation
    if (username.length < 3) {
        return res.render('signup', { error: 'Username must be at least 3 characters long.' });
    }

    // password Strength Validation
    if (password.length < 8) {
        return res.render('signup', { error: 'Password must be at least 8 characters long.' });
    }

    // email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.render('signup', { error: 'Please enter a valid email address.' });
    }

    // phone no only numbers
    if (isNaN(phone) || phone.length < 10) {
        return res.render('signup', { error: 'Please enter a valid numeric phone number.' });
    }

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
            req.session.user = { username: admin[0].Username, role: 'admin' };
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

router.get('/logout', async (req, res) => {
    try {
        // the user is a customer clear their  cart items before destroying the session
        if (req.session.user && req.session.user.role === 'Customer') {
            const username = req.session.user.username;
            
            // find the cart id for this customer
            const [[cart]] = await db.execute(
                'SELECT Cart_ID FROM SHOPPING_CART WHERE Customer_Username = ?',
                [username]
            );

            if (cart) {
                // Remove all items with this cart id
                await db.execute('DELETE FROM CART_ITEM WHERE Cart_ID = ?', [cart.Cart_ID]);
                console.log(`LOG: All items cleared from Cart ${cart.Cart_ID} for user ${username}`);
            }
        }
    } catch (err) {
        console.error("Logout Cart Cleanup Error:", err);
    }

    // Destroy the session and redirect to login
    req.session.destroy();
    res.redirect('/login');
});
console.log('--- AUTH.JS EXPORTED SUCCESSFULLY ---');
module.exports = router;