// Dummy cart stored in session
// Each user will have their own cart in session: req.session.cart = []

// Add book to cart
exports.addToCart = (req, res) => {
    const isbn = req.params.isbn;
    const book = req.session.books.find(b => b.isbn === isbn); // dummy books array in session

    if (!book) {
        return res.status(404).send('Book not found');
    }

    if (!req.session.cart) req.session.cart = [];

    // Check if book already in cart
    const cartItem = req.session.cart.find(item => item.isbn === isbn);
    if (cartItem) {
        cartItem.quantity += 1;
    } else {
        req.session.cart.push({
            isbn: book.isbn,
            title: book.title,
            price: book.price,
            quantity: 1
        });
    }

    res.redirect('/customer/cart');
};

// View Cart
exports.viewCart = (req, res) => {
    const cart = req.session.cart || [];
    res.render('customer/cart', { cart });
};

// Remove book from cart
exports.removeFromCart = (req, res) => {
    const isbn = req.params.isbn;
    if (!req.session.cart) req.session.cart = [];

    req.session.cart = req.session.cart.filter(item => item.isbn !== isbn);

    res.redirect('/customer/cart');
};