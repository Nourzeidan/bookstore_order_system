const pool = require('../config/database');// MySQL pool

// DASHBOARD
exports.dashboard = async (req, res) => {
  try {
    const [booksResult] = await pool.query('SELECT COUNT(*) AS totalBooks FROM BOOK');
    const [salesResult] = await pool.query(`
      SELECT IFNULL(SUM(oi.Quantity * oi.Price),0) AS totalSales
      FROM ORDERS o
      JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
    `);
    const [pendingOrdersResult] = await pool.query(`
      SELECT COUNT(*) AS pendingOrders 
      FROM REPLENISHMENT_ORDER 
      WHERE Status='Pending'
    `);

    res.render('admin/dashboard', {
      totalBooks: booksResult[0].totalBooks,
      totalSales: salesResult[0].totalSales,
      pendingOrders: pendingOrdersResult[0].pendingOrders
    });
  } catch (err) {
    console.error(err);
    res.send('Database error');
  }
};

// PRODUCT 
exports.products = async (req, res) => {
  try {
    const error = req.session.error;
    req.session.error = null;

    const [books] = await pool.query(`
      SELECT 
        b.ISBN, 
        b.Title, 
        b.Quantity_In_Stock AS stock, 
        b.Threshold, 
        b.Selling_Price AS selling_price,
        b.Category,
        b.Publisher_ID,
        p.Name AS Publisher_Name,
        GROUP_CONCAT(a.Author_Name SEPARATOR ', ') AS authors
      FROM BOOK b
      JOIN PUBLISHER p ON b.Publisher_ID = p.Publisher_ID
      LEFT JOIN BOOK_AUTHOR ba ON b.ISBN = ba.ISBN
      LEFT JOIN AUTHOR a ON ba.Author_ID = a.Author_ID
      GROUP BY b.ISBN
    `);

    // Fetch pending replenishment orders created by triggers
    const [orders] = await pool.query(`
      SELECT * FROM REPLENISHMENT_ORDER WHERE Status='Pending'
    `);

    const [authors] = await pool.query('SELECT Author_ID, Author_Name FROM AUTHOR');
    const [publishers] = await pool.query('SELECT Publisher_ID, Name FROM PUBLISHER');

    res.render('admin/product_management', { books, orders, error, authors, publishers });
  } catch (err) {
    console.error(err);
    res.send('Database error');
  }
};
// Add Book
exports.addBook = async (req, res) => {
  try {
    const { isbn, title, stock, threshold, category, selling_price, publisher_id } = req.body;

    // Insert book - trigger will enforce non-negative stock
    await pool.query(`
      INSERT INTO BOOK 
      (ISBN, Title, Publication_Year, Quantity_In_Stock, Threshold, Category, Selling_Price, Publisher_ID)
      VALUES (?, ?, YEAR(CURDATE()), ?, ?, ?, ?, ?)
    `, [isbn, title, parseInt(stock), parseInt(threshold), category, parseFloat(selling_price), publisher_id]);

    // Insert authors
    let authors = req.body.author_id;
    if (!Array.isArray(authors)) authors = [authors];
    for (let author_id of authors) {
      await pool.query(`INSERT INTO BOOK_AUTHOR (ISBN, Author_ID) VALUES (?, ?)`, [isbn, author_id]);
    }

    // Check if trigger created a pending replenishment order
    const [orders] = await pool.query(`
      SELECT * FROM REPLENISHMENT_ORDER WHERE ISBN=? AND Status='Pending'
    `, [isbn]);

    if (orders.length) {
      console.log(`📦 Trigger created pending replenishment order(s) for "${title}"`);
    }

    res.redirect('/admin/products');

  } catch (err) {
    console.error(err.sqlMessage || err);

    // Handle duplicate ISBN
    if (err.code === 'ER_DUP_ENTRY') {
      req.session.error = 'ISBN already exists. Please enter a unique ISBN.';
    }
    // Handle trigger error for negative stock
    else if (err.sqlState === '45000') {
      req.session.error = err.sqlMessage || 'Invalid stock: cannot be negative.';
    } 
    else {
      req.session.error = 'Error adding book';
    }

    res.redirect('/admin/products');
  }
};


// Update Book
exports.updateBook = async (req, res) => {
  try {
    const { isbn, stock } = req.body;

    const [book] = await pool.query('SELECT * FROM BOOK WHERE ISBN=?', [isbn]);
    if (!book.length) {
      req.session.error = 'Book not found';
      return res.redirect('/admin/products');
    }

    // Update stock - triggers will handle validation and replenishment
    await pool.query('UPDATE BOOK SET Quantity_In_Stock=? WHERE ISBN=?', [parseInt(stock), isbn]);

    // Get any pending replenishment orders created by the trigger
    const [pendingOrders] = await pool.query(`
      SELECT * FROM REPLENISHMENT_ORDER WHERE ISBN=? AND Status='Pending'
    `, [isbn]);

    if (pendingOrders.length) {
      console.log(` Trigger created pending replenishment orders for ${book[0].Title}`);
    }

    res.redirect('/admin/products');
  } catch (err) {
  console.error(err.sqlMessage || err);

  if (err.sqlState === '45000') {
    req.session.error = err.sqlMessage || 'Invalid stock: cannot be negative.';
  } else {
    req.session.error = err.sqlMessage || 'Error updating book';
  }

  res.redirect('/admin/products');
}
};


//Confirm pending replemnshiment orders
exports.confirmOrder = async (req, res) => {
  try {
    const { isbn } = req.params;
    const [order] = await pool.query(`
      SELECT * FROM REPLENISHMENT_ORDER 
      WHERE ISBN=? AND Status='Pending'
    `, [isbn]);

    if (order.length) {
      await pool.query(`
        UPDATE BOOK b
        JOIN REPLENISHMENT_ORDER r ON b.ISBN = r.ISBN
        SET b.Quantity_In_Stock = b.Quantity_In_Stock + r.Quantity,
            r.Status='Confirmed'
        WHERE r.Order_ID=?;
      `, [order[0].Order_ID]);
    }
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/products');
  }
};

// Search Books
exports.searchBooks = async (req, res) => {
  try {
    const { query } = req.query;

    const [books] = await pool.query(`
      SELECT 
        b.ISBN, 
        b.Title, 
        b.Quantity_In_Stock AS stock, 
        b.Threshold, 
        b.Selling_Price AS selling_price,
        b.Category,
        b.Publisher_ID,
        p.Name AS Publisher_Name,
        GROUP_CONCAT(a.Author_Name SEPARATOR ', ') AS authors
      FROM BOOK b
      JOIN PUBLISHER p ON b.Publisher_ID = p.Publisher_ID
      LEFT JOIN BOOK_AUTHOR ba ON b.ISBN = ba.ISBN
      LEFT JOIN AUTHOR a ON ba.Author_ID = a.Author_ID
      WHERE b.ISBN LIKE ? 
         OR b.Title LIKE ? 
         OR b.Category LIKE ? 
         OR p.Name LIKE ?
         OR b.ISBN IN (
            SELECT ba2.ISBN
            FROM BOOK_AUTHOR ba2
            JOIN AUTHOR a2 ON ba2.Author_ID = a2.Author_ID
            WHERE a2.Author_Name LIKE ?
         )
      GROUP BY b.ISBN
    `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]);

    // Auto Create Replenshimentorders for low stock
    for (const book of books) {
      // Check if stock is below threshold
      if (book.stock < book.Threshold) {
        // Check if a pending order already exists for this book
        const [existingOrder] = await pool.query(`
          SELECT 1 FROM REPLENISHMENT_ORDER 
          WHERE ISBN = ? AND Status = 'Pending'
        `, [book.ISBN]);

        // If no pending order exists, create one
        if (!existingOrder.length) {
          await pool.query(`
            INSERT INTO REPLENISHMENT_ORDER 
            (ISBN, Publisher_ID, Quantity, Order_Date, Status)
            VALUES (?, ?, 20, CURDATE(), 'Pending')
          `, [book.ISBN, book.Publisher_ID]);
          
          console.log(`Auto-created replenishment order for ${book.Title} (ISBN: ${book.ISBN})`);
        }
      }
    }
    
    // Fetch all pending orders (including the ones just created)
    const [orders] = await pool.query(`
      SELECT * FROM REPLENISHMENT_ORDER WHERE Status='Pending'
    `);

    // Fetch authors and publishers for the dropdowns
    const [authors] = await pool.query(`SELECT Author_ID, Author_Name FROM AUTHOR`);
    const [publishers] = await pool.query(`SELECT Publisher_ID, Name FROM PUBLISHER`);

    res.render('admin/product_management', { books, orders, error: null, authors, publishers });
  } catch (err) {
    console.error(err);
    res.send('Database error');
  }
};

//Reports
exports.reports = async (req, res) => {
  try {
    const { date, isbn } = req.query;

    // Total sales last month
    const [totalSalesMonthResult] = await pool.query(`
      SELECT IFNULL(SUM(oi.Quantity * oi.Price), 0) AS totalSalesMonth
      FROM ORDERS o
      JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
      WHERE MONTH(o.Order_Date) = MONTH(CURDATE()) - 1
        AND YEAR(o.Order_Date) = YEAR(CURDATE())
    `);

    //Total sales for selected date
    let totalSalesDate = null;
    if (date) {
      const [dateSalesResult] = await pool.query(`
        SELECT IFNULL(SUM(oi.Quantity * oi.Price), 0) AS totalSalesDate
        FROM ORDERS o
        JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
        WHERE o.Order_Date = ?
      `, [date]);

      totalSalesDate = dateSalesResult[0].totalSalesDate;
    }

    //Top 5 Customers (last 3 months)
    const [topCustomers] = await pool.query(`
      SELECT 
        c.First_Name AS name,
        SUM(oi.Quantity * oi.Price) AS total
      FROM ORDERS o
      JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
      JOIN CUSTOMER c ON o.Customer_Username = c.Username
      WHERE o.Order_Date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY c.Username
      ORDER BY total DESC
      LIMIT 5
    `);

    //Top 10 Books (last 3 months)
    const [topBooks] = await pool.query(`
      SELECT 
        b.ISBN,
        b.Title,
        SUM(oi.Quantity) AS sold
      FROM ORDER_ITEM oi
      JOIN BOOK b ON oi.ISBN = b.ISBN
      JOIN ORDERS o ON oi.Order_ID = o.Order_ID
      WHERE o.Order_Date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY b.ISBN
      ORDER BY sold DESC
      LIMIT 10
    `);

    // Number of Replenishment Orders for a Book
    let bookOrdersCount = null;
    if (isbn) {
      const [countResult] = await pool.query(`
        SELECT COUNT(*) AS cnt
        FROM REPLENISHMENT_ORDER
        WHERE ISBN = ?
      `, [isbn]);

      bookOrdersCount = countResult[0].cnt;
    }

    res.render('admin/reports', {
      totalSalesMonth: totalSalesMonthResult[0].totalSalesMonth,
      totalSalesDate,
      topCustomers,
      topBooks,
      bookOrdersCount,
      selectedDate: date || '',
      searchedISBN: isbn || ''
    });

  } catch (err) {
    console.error(err);
    res.send('Database error');
  }
};

