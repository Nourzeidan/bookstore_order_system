// const express = require('express');
// const router = express.Router();
// const customerController = require('../controllers/customerController');
// const { isCustomer } = require('../middleware/auth');

// // Auth
// router.get('/login', customerController.getLogin);
// router.post('/login', customerController.postLogin);
// router.get('/logout', customerController.logout);

// // Profile
// router.get('/profile', isCustomer, customerController.getProfile);
// router.post('/profile', isCustomer, customerController.updateProfile);

// // Products
// router.get('/product_list', isCustomer, customerController.searchBooks);

// // Cart
// router.post('/cart/add/:isbn', isCustomer, customerController.addToCart);
// router.get('/cart', isCustomer, customerController.viewCart);
// router.post('/cart/remove/:isbn', isCustomer, customerController.removeFromCart);

// // Checkout
// router.get('/checkout', isCustomer, customerController.getCheckout);
// router.post('/checkout', isCustomer, customerController.postCheckout);

// // Orders
// router.get('/orders', isCustomer, customerController.viewOrders);
// router.get('/orders/:id', isCustomer, customerController.viewOrderDetails);

// module.exports = router;
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { isCustomer } = require('../middleware/auth');


router.get('/logout', customerController.logout);

// --- 2. PROFILE ---
router.get('/profile', isCustomer, customerController.getProfile);
router.post('/profile', isCustomer, customerController.updateProfile);
// router.get('/profile/update', isCustomer, customerController.updateProfile);

// --- 3. PRODUCTS ---
router.get('/product_list', isCustomer, customerController.searchBooks);
router.get('/products/search', customerController.searchProducts);

// --- 4. CART ---
// Note: If you use the Database cart, make sure these names match
router.post('/cart/add/:isbn', isCustomer, customerController.addToCart);
router.get('/cart', isCustomer, customerController.viewCart);
router.post('/cart/remove/:isbn', isCustomer, customerController.removeFromCart);

// --- 5. CHECKOUT & ORDERS ---
router.get('/checkout', isCustomer, customerController.getCheckout);
router.post('/checkout', isCustomer, customerController.postCheckout);
router.get('/order_history', isCustomer, customerController.viewOrders);
router.get('/orders/:id', isCustomer, customerController.viewOrderDetails);
router.get('/orders', isCustomer, customerController.viewOrders);
module.exports = router;