
const express = require('express');
const app = express();
const path = require('path');

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser (for forms)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

// Redirect root
app.get('/', (req, res) => res.redirect('/admin/dashboard'));

// Start server
app.listen(3000, () => console.log('Server running at http://localhost:3000'));

