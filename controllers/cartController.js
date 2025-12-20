const db = require('../config/database');

// exports.addToCart = async (req, res) => {
//     const isbn = req.params.isbn;

//     try {
//         // 1. Fetch from database using your exact schema columns
//         const [rows] = await db.query('SELECT * FROM BOOK WHERE ISBN = ?', [isbn]);
        
//         if (rows.length === 0) return res.status(404).send('Book not found');

//         const book = rows[0];

//         // 2. Threshold Check (Based on your schema: Default 5)
//         // Check if we even have enough to sell
//         if (book.Quantity_In_Stock <= 0) {
//             return res.status(400).send('Out of Stock');
//         }

//         // 3. Optional: Warning if approaching or at threshold
//         if (book.Quantity_In_Stock <= book.Threshold) {
//             console.log(`Warning: ${book.Title} is at or below the Threshold (${book.Threshold})`);
//             // You can pass this warning to your EJS view later
//         }

//         // 4. Cart Logic
//         if (!req.session.cart) req.session.cart = [];
//         const cartItem = req.session.cart.find(item => item.isbn === isbn);

//         if (cartItem) {
//             // Prevent adding more than what's physically in the database
//             if (cartItem.quantity + 1 > book.Quantity_In_Stock) {
//                 return res.status(400).send('Cannot exceed physical stock');
//             }
//             cartItem.quantity += 1;
//         } else {
//             req.session.cart.push({
//                 isbn: book.ISBN,
//                 title: book.Title,
//                 price: book.Selling_Price,
//                 quantity: 1
//             });
//         }

//         res.redirect('/customer/cart');
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Database Error');
//     }
// };

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