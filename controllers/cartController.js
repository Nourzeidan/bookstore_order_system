const db = require('../config/database');
// View Cart
exports.viewCart = (req, res) => {
    // The cart is already in the session, no DB query needed here
    const cart = req.session.cart || [];
    res.render('customer/cart', { cart });
};

// Remove book from cart
exports.removeFromCart = (req, res) => {
    const isbn = req.params.isbn;
    if (req.session.cart) {
        // We filter out the book that matches the ISBN clicked
        req.session.cart = req.session.cart.filter(item => item.isbn !== isbn);
    }
    res.redirect('/customer/cart');
};