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
        // Ensure user is in session
        if (!req.session.user) return res.redirect('/login');

        const [rows] = await db.execute(
            'SELECT Username, Email, First_Name, Last_Name, Address, Phone FROM CUSTOMER WHERE Username = ?', 
            [req.session.user.username]
        );

        if (rows.length === 0) return res.redirect('/login');

        // Render profile and pass the user data
        res.render('customer/profile', { 
            user: rows[0],
            success: req.query.success 
        });
    } catch (err) {
        console.error("Get Profile Error:", err);
        res.redirect('/login');
    }
};

exports.updateProfile = async (req, res) => {
    const { username, email, password } = req.body;
    const oldUsername = req.session.user.username;

    try {
        if (password && password.trim() !== '') {
            // Update Username, Email, and Password
            await db.execute(
                'UPDATE CUSTOMER SET Username = ?, Email = ?, Password = SHA2(?, 256) WHERE Username = ?',
                [username, email, password, oldUsername]
            );
        } else {
            // Update only Username and Email
            await db.execute(
                'UPDATE CUSTOMER SET Username = ?, Email = ? WHERE Username = ?',
                [username, email, oldUsername]
            );
        }

        // Keep the session in sync so the user isn't logged out
        req.session.user.username = username;
        req.session.userId = username;

        req.session.save(() => {
            res.redirect('/customer/profile?success=1');
        });
    } catch (err) {
        console.error("Update Error:", err.message);
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


// checkout
exports.getCheckout = (req, res) => {
    const cart = req.session.cart || [];
    res.render('customer/checkout', { cart, error: null });
};

exports.postCheckout = async (req, res) => {
    const username = req.session.user.username;

    try {
        console.log("=== CHECKOUT STARTED ===");
        console.log("Username:", username);

        // 1. Get the user's cart
        const [[cart]] = await db.execute(
            'SELECT Cart_ID FROM SHOPPING_CART WHERE Customer_Username = ?',
            [username]
        );

        if (!cart) {
            console.log("ERROR: Cart not found");
            return res.status(400).send("Cart not found");
        }

        const cartId = cart.Cart_ID;
        console.log("Cart ID:", cartId);

        // 2. Get all items in the cart with stock information
        const [cartItems] = await db.execute(`
            SELECT 
                CI.ISBN, 
                CI.Quantity, 
                B.Selling_Price,
                B.Title,
                B.Quantity_In_Stock
            FROM CART_ITEM CI
            JOIN BOOK B ON CI.ISBN = B.ISBN
            WHERE CI.Cart_ID = ?`,
            [cartId]
        );

        console.log("Cart Items found:", cartItems.length);

        if (cartItems.length === 0) {
            console.log("ERROR: Cart is empty");
            return res.status(400).send("Cart is empty");
        }

        // 3. Validate stock availability for each item
        console.log("Validating stock availability...");
        const outOfStockItems = [];
        
        for (const item of cartItems) {
            console.log(`  ${item.Title}: Want ${item.Quantity}, Available ${item.Quantity_In_Stock}`);
            
            if (item.Quantity_In_Stock < item.Quantity) {
                outOfStockItems.push({
                    title: item.Title,
                    requested: item.Quantity,
                    available: item.Quantity_In_Stock
                });
            }
        }

        // If any items are out of stock, return error
        if (outOfStockItems.length > 0) {
            console.log("ERROR: Some items are out of stock");
            let errorMsg = "Sorry, the following items don't have enough stock:<br>";
            outOfStockItems.forEach(item => {
                errorMsg += `<br>• ${item.title}: You want ${item.requested}, but only ${item.available} available`;
            });
            return res.status(400).send(errorMsg);
        }

        console.log("✓ All items have sufficient stock");

        // 4. Calculate total price - Convert string to number
        let totalPrice = 0;
        for (const item of cartItems) {
            const price = parseFloat(item.Selling_Price);
            const quantity = parseInt(item.Quantity);
            const itemTotal = price * quantity;
            
            console.log(`${item.Title}: ${price} x ${quantity} = ${itemTotal}`);
            totalPrice += itemTotal;
        }

        console.log("Total Price:", totalPrice);
        
        if (isNaN(totalPrice) || totalPrice === 0) {
            console.error("ERROR: Invalid total price calculation");
            return res.status(500).send("Error calculating order total");
        }

        // 5. Create the order
        const [orderResult] = await db.execute(
            `INSERT INTO ORDERS (Order_Date, Total_Price, Status, Customer_Username) 
             VALUES (CURDATE(), ?, 'Completed', ?)`,
            [totalPrice, username]
        );

        const orderId = orderResult.insertId;
        console.log("✓ Created Order ID:", orderId);

        // 6. Insert items into ORDER_ITEM table
        console.log("Inserting order items...");
        for (const item of cartItems) {
            const price = parseFloat(item.Selling_Price);
            
            await db.execute(
                `INSERT INTO ORDER_ITEM (Order_ID, ISBN, Quantity, Price) 
                 VALUES (?, ?, ?, ?)`,
                [orderId, item.ISBN, item.Quantity, price]
            );
            console.log(`  ✓ Inserted: ${item.Title}`);
        }
        console.log("✓ All order items inserted");

        // 7. Update book stock
        console.log("Updating book stock...");
        for (const item of cartItems) {
            const [result] = await db.execute(
                `UPDATE BOOK 
                 SET Quantity_In_Stock = Quantity_In_Stock - ? 
                 WHERE ISBN = ? AND Quantity_In_Stock >= ?`,
                [item.Quantity, item.ISBN, item.Quantity]
            );
            
            if (result.affectedRows === 0) {
                throw new Error(`Failed to update stock for ${item.Title}. Item may have been purchased by someone else.`);
            }
            
            console.log(`  ✓ Updated stock for ${item.Title}`);
        }
        console.log("✓ Book stock updated");

        // 8. Clear the cart
        console.log("Clearing cart...");
        await db.execute('DELETE FROM CART_ITEM WHERE Cart_ID = ?', [cartId]);
        console.log("✓ Cart cleared");

        console.log("=== ORDER COMPLETED SUCCESSFULLY ===");
        
        res.redirect('/customer/order_history');

    } catch (err) {
        console.error("=== CHECKOUT ERROR ===");
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        res.status(500).send("Checkout failed: " + err.message);
    }
};

exports.viewOrderDetails = async (req, res) => {
    const orderId = req.params.id;
    const username = req.session.user.username;
    
    try {
        // Get order information
        const [[order]] = await db.execute(
            'SELECT * FROM ORDERS WHERE Order_ID = ? AND Customer_Username = ?', 
            [orderId, username]
        );

        if (!order) {
            return res.status(404).send("Order not found");
        }

        // Get order items with book details
        const [items] = await db.execute(`
            SELECT 
                OI.ISBN,
                B.Title,
                A.Author_Name,
                OI.Quantity,
                OI.Price,
                (OI.Quantity * OI.Price) AS Subtotal
            FROM ORDER_ITEM OI
            JOIN BOOK B ON OI.ISBN = B.ISBN
            JOIN BOOK_AUTHOR BA ON B.ISBN = BA.ISBN
            JOIN AUTHOR A ON BA.Author_ID = A.Author_ID
            WHERE OI.Order_ID = ?`,
            [orderId]
        );

        console.log("Order Details:", { order, items });

        res.render('customer/OrderDetails', { 
            order: order,
            items: items 
        });
    } catch (err) {
        console.error("Order Details Error:", err.message);
        res.status(500).send("Error loading order details: " + err.message);
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