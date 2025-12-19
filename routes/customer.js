const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { isCustomer } = require('../middleware/auth');

// Auth
router.get('/login', customerController.getLogin);
router.post('/login', customerController.postLogin);
router.get('/logout', customerController.logout);

// Profile
router.get('/profile', isCustomer, customerController.getProfile);
router.post('/profile', isCustomer, customerController.updateProfile);

// Products
router.get('/product_list', isCustomer, customerController.searchBooks);

// Cart
router.post('/cart/add/:isbn', isCustomer, customerController.addToCart);
router.get('/cart', isCustomer, customerController.viewCart);
router.post('/cart/remove/:isbn', isCustomer, customerController.removeFromCart);

// Checkout
router.get('/checkout', isCustomer, customerController.getCheckout);
router.post('/checkout', isCustomer, customerController.postCheckout);

// Orders
router.get('/orders', isCustomer, customerController.viewOrders);
router.get('/orders/:id', isCustomer, customerController.viewOrderDetails);

module.exports = router;