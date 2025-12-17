const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Pages
router.get('/dashboard', adminController.dashboard);
router.get('/products', adminController.products);
router.get('/reports', adminController.reports);

// Actions
router.post('/products/add', adminController.addBook);
router.post('/products/update', adminController.updateBook);

// Search books
router.get('/products/search', adminController.searchBooks);

// Confirm pending order
router.get('/orders/confirm/:isbn', adminController.confirmOrder);

module.exports = router;
