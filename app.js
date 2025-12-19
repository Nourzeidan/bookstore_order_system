const express = require('express');
const path = require('path');
const session = require('express-session');

const app = express();

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'bookstore_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 }
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const { router: authRoutes } = require('./routes/auth');
const customerRoutes = require('./routes/customer');
const adminRoutes = require('./routes/admin');
const { isAdmin, isCustomer } = require('./middleware/auth');

app.use('/', authRoutes);
app.use('/customer', isCustomer,customerRoutes);
app.use('/admin', isAdmin, adminRoutes);

// Redirect root
app.get('/', (req, res) => {
    res.render('index');
});

// Start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));