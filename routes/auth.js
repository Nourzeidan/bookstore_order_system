const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

// Dummy users
let usersTable = [
    {
        id: 1,
        username: 'admin',
        password_hash: '$2a$12$/JRIiz9xNCHaz.91GO2W5OEkjLVMLziVvnbdaYqtZFwOqyveHoBtG',
        user_role: 'Admin'
    }
];

// Views
router.get('/login', (req, res) => res.render('login', { error: null }));
router.get('/signup', (req, res) => res.render('signup', { error: null }));

// Signup
router.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    usersTable.push({
        id: usersTable.length + 1,
        username,
        password_hash: hashedPassword,
        user_role: 'Customer'
    });
    res.redirect('/login');
});

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = usersTable.find(u => u.username === username);
    if (!user) return res.render('login', { error: 'Invalid username or password' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.render('login', { error: 'Invalid username or password' });

    req.session.userId = user.id;
    req.session.role = user.user_role;
    req.session.user = { username: user.username };

    if (user.user_role === 'Admin') return res.redirect('/admin/dashboard');
    return res.redirect('/customer/product_list');
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = { router, usersTable };