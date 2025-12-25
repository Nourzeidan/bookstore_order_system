const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/auth');
// Pages
router.get('/dashboard', isAdmin, adminController.dashboard);
router.get('/products', isAdmin, adminController.products);
router.get('/reports', isAdmin, adminController.reports);

// Actions
router.post('/products/add', isAdmin, adminController.addBook);
router.post('/products/update', isAdmin, adminController.updateBook);

// Search books
router.get('/products/search', isAdmin, adminController.searchBooks);

// Confirm pending order
router.get('/orders/confirm/:isbn', isAdmin, adminController.confirmOrder);

module.exports = router;
