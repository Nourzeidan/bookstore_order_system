
const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser (for forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Session management
app.use(session({
  secret: 'bookstore_secret', 
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hour session
}));
const { isAdmin, isCustomer } = require('./middleware/auth');
// Routes
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customer');

// 3amltlha comment temporarily 3shan atest
app.use('/admin', isAdmin, adminRoutes); // to make only admins access admin routes
app.use('/customer', isCustomer, customerRoutes)
// app.use('/admin', adminRoutes);
app.use('/', authRoutes);

// Redirect root
// app.get('/', (req, res) => res.redirect('/admin/dashboard'));
app.get('/', (req, res) => {
    res.render('index'); // admin and customer choose login
});
// Start server
app.listen(3000, () => console.log('Server running at http://localhost:3000'));

