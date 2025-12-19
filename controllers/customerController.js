// Dummy books
const books = [
    { isbn: '111', title: 'Database Systems', price: 200, stock: 5 },
    { isbn: '222', title: 'Operating Systems', price: 180, stock: 0 },
    { isbn: '333', title: 'Computer Networks', price: 150, stock: 10 }
];

// Login / Logout
exports.getLogin = (req, res) => res.render('customer/login', { error: null });
exports.postLogin = (req, res) => res.redirect('/customer/product_list');
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/customer/login');
};

// Profile
exports.getProfile = (req, res) => {
    res.render('customer/profile', { user: req.session.user });
};
const { usersTable } = require('../routes/auth'); // تأكد إنك استوردت ال array بتاعت المستخدمين

exports.updateProfile = (req, res) => {
    const sessionUser = req.session.user;

    const userInTable = usersTable.find(u => u.username === sessionUser.username);
    if (userInTable) {
        Object.assign(userInTable, req.body);

        req.session.user = { ...req.session.user, ...req.body };
    }

    res.redirect('/customer/profile');
};

// Books
exports.searchBooks = (req, res) => res.render('customer/product_list', { books });

// Cart
exports.addToCart = (req, res) => {
    const { isbn } = req.params;
    const book = books.find(b => b.isbn === isbn);
    if (!book) return res.redirect('/customer/product_list');

    const cart = req.session.cart || [];
    const existing = cart.find(item => item.isbn === isbn);
    if (existing) existing.quantity += 1;
    else cart.push({ isbn: book.isbn, title: book.title, price: book.price, quantity: 1 });
    req.session.cart = cart;

    res.redirect('/customer/cart');
};
exports.viewCart = (req, res) => res.render('customer/cart', { cart: req.session.cart || [] });
exports.removeFromCart = (req, res) => {
    req.session.cart = (req.session.cart || []).filter(item => item.isbn !== req.params.isbn);
    res.redirect('/customer/cart');
};

// Checkout
exports.getCheckout = (req, res) => res.render('customer/checkout', { error: null });
exports.postCheckout = (req, res) => {
    req.session.cart = [];
    res.redirect('/customer/orders');
};

// Orders
exports.viewOrders = (req, res) => {
    const orders = [
        { id: 1, date: '2025-12-01', total: 380 },
        { id: 2, date: '2025-12-10', total: 150 }
    ];
    res.render('customer/orders', { orders });
};
exports.viewOrderDetails = (req, res) => {
    const order = {
        id: req.params.id,
        items: [
            { title: 'Database Systems', quantity: 2, price: 200 },
            { title: 'Computer Networks', quantity: 1, price: 150 }
        ],
        total: 550
    };
    res.render('customer/orderDetails', { order });
};