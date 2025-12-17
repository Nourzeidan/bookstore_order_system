const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// pages
router.get('/dashboard', adminController.dashboard);
router.get('/products', adminController.products);
router.get('/reports', adminController.reports);

// actions
router.post('/products/add', adminController.addBook);

module.exports = router;