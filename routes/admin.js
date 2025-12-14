const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// GET pages
router.get('/dashboard', adminController.dashboard);
router.get('/products', adminController.products);
router.get('/reports', adminController.reports);

// POST routes (dummy handlers for now)
router.post('/products/add', adminController.addBook);
router.post('/products/update', adminController.updateBook);
router.post('/products/confirm', adminController.confirmOrder);

module.exports = router;

