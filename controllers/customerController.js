const db = require('../config/database');
const bcrypt = require('bcrypt');

exports.searchBooks = async (req, res) => {
    try {
        const [books] = await db.execute(
            `SELECT ISBN AS isbn, Title AS title, Selling_Price AS price, Quantity_In_Stock AS stock FROM BOOK`
        );
        res.render('customer/product_list', { books });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.getProfile = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM CUSTOMER WHERE Username = ?', [req.session.user.username]);
        res.render('customer/profile', { user: rows[0] });
    } catch (err) {
        res.redirect('/login');
    }
};

exports.updateProfile = async (req, res) => {
    const { username, email, password } = req.body;
    const oldUsername = req.session.user.username;

    try {
        if (password && password.trim() !== '') {
            const hashed = await bcrypt.hash(password, 10);
            await db.execute(
                'UPDATE CUSTOMER SET Username = ?, Email = ?, Password = ? WHERE Username = ?',
                [username, email, hashed, oldUsername]
            );
        } else {
            await db.execute(
                'UPDATE CUSTOMER SET Username = ?, Email = ? WHERE Username = ?',
                [username, email, oldUsername]
            );
        }
        req.session.user.username = username;
        res.redirect('/customer/profile');
    } catch (err) {
        res.status(500).send("Update failed: " + err.message);
    }
};

exports.addToCart = async (req, res) => {
    const { isbn } = req.params;
    const username = req.session.user.username;

    try {
        const [[cart]] = await db.execute(
            'SELECT Cart_ID FROM SHOPPING_CART WHERE Customer_Username = ?',
            [username]
        );

        if (!cart) return res.status(400).send("Cart not found");
        const cartId = cart.Cart_ID;

        const [[existingItem]] = await db.execute(
            'SELECT Quantity FROM CART_ITEM WHERE Cart_ID = ? AND ISBN = ?',
            [cartId, isbn]
        );

        if (existingItem) {
            // 2. Branch: Update existing quantity
            const newQuantity = existingItem.Quantity + 1;
            await db.execute(
                'UPDATE CART_ITEM SET Quantity = ? WHERE Cart_ID = ? AND ISBN = ?',
                [newQuantity, cartId, isbn]
            );
            console.log(`LOG: Incremented ${isbn} to ${newQuantity}`);
        } else {
            // 3. Branch: Insert NEW item
            // Check if the book actually exists in the BOOK table first
            const [[bookExists]] = await db.execute('SELECT ISBN FROM BOOK WHERE ISBN = ?', [isbn]);
            
            if (!bookExists) {
                console.error(`LOG ERROR: ISBN ${isbn} does not exist in the BOOK table!`);
                return res.status(404).send("Book not found in database.");
            }

            const [insertResult] = await db.execute(
                'INSERT INTO CART_ITEM (Cart_ID, ISBN, Quantity) VALUES (?, ?, 1)',
                [cartId, isbn]
            );
            console.log(`LOG: Inserted NEW item ${isbn}. Affected rows: ${insertResult.affectedRows}`);
        }

        res.redirect('/customer/cart');
    } catch (err) {
        console.error("Critical AddToCart Error:", err.message);
        res.status(500).send(err.message);
    }
};
exports.viewCart = async (req, res) => {
    try {
        const username = req.session.user.username;

        // 1. We must JOIN three tables to get Title, Price, and the Quantity we just updated
        const [cartItems] = await db.execute(`
            SELECT 
                B.ISBN, 
                B.Title, 
                B.Selling_Price AS price, 
                CI.Quantity AS quantity
            FROM SHOPPING_CART SC
            JOIN CART_ITEM CI ON SC.Cart_ID = CI.Cart_ID
            JOIN BOOK B ON CI.ISBN = B.ISBN
            WHERE SC.Customer_Username = ?`, 
            [username]
        );

        // 2. DEBUG PRINT: Check exactly what is being sent to the EJS template
        console.log("DEBUG: Data sent to Cart Page:", cartItems);

        // 3. Render the page using the DATABASE results, NOT the session
        res.render('customer/cart', { cart: cartItems });
    } catch (err) {
        console.error("View Cart Error:", err);
        res.status(500).send("Error loading cart items.");
    }
};

exports.viewOrders = async (req, res) => {
    try {
        const [orders] = await db.execute(
            'SELECT * FROM ORDERS WHERE Customer_Username = ?', 
            [req.session.user.username]
        );
        res.render('customer/order_history', { orders });
    } catch (err) {
        // This will print the error to your console so you can see the column names
        console.error("SQL Error in viewOrders:", err.message);
        res.status(500).send(err.message);
    }
};
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
};

// Add these to the bottom of controllers/customerController.js

// 1. Checkout View
exports.getCheckout = (req, res) => {
    const cart = req.session.cart || [];
    res.render('customer/checkout', { cart, error: null });
};

// 2. Process Checkout (The Database part)
exports.postCheckout = async (req, res) => {
    try {
        // Here you would normally insert into ORDERS and ORDER_ITEM tables
        // For now, let's just clear the cart to stop the crash
        req.session.cart = [];
        res.redirect('/customer/order_history');
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. View Order Details
exports.viewOrderDetails = async (req, res) => {
    const orderId = req.params.id;
    try {
        // This is where you query the specific items in an order
        const [details] = await db.execute(
            'SELECT * FROM ORDER_ITEM WHERE Order_ID = ?', 
            [orderId]
        );
        res.render('customer/orderDetails', { details });
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.removeFromCart = async (req, res) => {
    const { isbn } = req.params;
    const username = req.session.user.username;

    try {
        // 1. Get the Cart_ID
        const [[cart]] = await db.execute(
            'SELECT Cart_ID FROM SHOPPING_CART WHERE Customer_Username = ?',
            [username]
        );

        if (!cart) return res.redirect('/customer/cart');

        // 2. Fetch the current item to see how many we have
        const [[item]] = await db.execute(
            'SELECT Quantity FROM CART_ITEM WHERE Cart_ID = ? AND ISBN = ?',
            [cart.Cart_ID, isbn]
        );

        if (item) {
            // Support both 'Quantity' and 'quantity' to avoid undefined errors
            const currentQty = item.Quantity || item.quantity;

            if (currentQty > 1) {
                // Logic: Just reduce the number
                await db.execute(
                    'UPDATE CART_ITEM SET Quantity = Quantity - 1 WHERE Cart_ID = ? AND ISBN = ?',
                    [cart.Cart_ID, isbn]
                );
                console.log(`LOG: Decreased ${isbn} quantity to ${currentQty - 1}`);
            } else {
                // Logic: If it's the last one, remove the row
                await db.execute(
                    'DELETE FROM CART_ITEM WHERE Cart_ID = ? AND ISBN = ?',
                    [cart.Cart_ID, isbn]
                );
                console.log(`LOG: Removed ${isbn} entirely from database`);
            }
        }

        res.redirect('/customer/cart');
    } catch (err) {
        console.error("Remove Error:", err);
        res.status(500).send("Failed to update cart");
    }
};

// 1. View All Products
exports.getProductList = async (req, res) => {
    try {
        const [books] = await db.execute('SELECT * FROM BOOK');
        res.render('customer/product_list', { 
            books: books, 
            searchQuery: null 
        });
    } catch (err) {
        console.error("Error fetching books:", err);
        res.status(500).send("Internal Server Error");
    }
};

// 2. Search Products Logic
exports.searchProducts = async (req, res) => {
    const { query } = req.query;
    
    // If the query is empty, just redirect to the full list
    if (!query) return res.redirect('/customer/product_list');

    try {
        const searchTerm = `%${query}%`;
        
        // Ensure table names and columns match exactly what is in your phpMyAdmin
        const [books] = await db.execute(
        `SELECT * FROM BOOK 
        WHERE Title LIKE ? 
        OR ISBN LIKE ? 
        OR Category LIKE ? `,
        [searchTerm, searchTerm, searchTerm] // 4 placeholders = 4 searchTerms
    );

        console.log(`Search found ${books.length} results for: ${query}`);

        res.render('customer/product_list', { 
            books: books, 
            searchQuery: query 
        });
    } catch (err) {
        // This will print the EXACT database error to your terminal
        console.error("DATABASE ERROR DURING SEARCH:", err.message);
        res.status(500).send("Search failed: " + err.message);
    }
};