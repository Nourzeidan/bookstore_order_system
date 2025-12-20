const pool = require('../config/database');// MySQL pool

// ================== DASHBOARD ==================
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

// ================== PRODUCTS ==================
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
    b.Category
  FROM BOOK b
`);

    const [orders] = await pool.query(`
      SELECT * FROM REPLENISHMENT_ORDER WHERE Status='Pending'
    `);

    res.render('admin/product_management', { books, orders, error });
  } catch (err) {
    console.error(err);
    res.send('Database error');
  }
};

// ================== ADD BOOK ==================
exports.addBook = async (req, res) => {
  try {
    const { isbn, title, stock, threshold, category, selling_price } = req.body;
    await pool.query(`
      INSERT INTO BOOK (ISBN, Title, Quantity_In_Stock, Threshold, Category, Selling_Price, Publisher_ID)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [isbn, title, parseInt(stock), parseInt(threshold), category, parseFloat(selling_price)]);
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    req.session.error = 'Error adding book';
    res.redirect('/admin/products');
  }
};

// ================== UPDATE BOOK ==================
exports.updateBook = async (req, res) => {
  try {
    const { isbn, stock } = req.body;
    const [book] = await pool.query('SELECT * FROM BOOK WHERE ISBN=?', [isbn]);

    if (!book.length) {
      req.session.error = 'Book not found';
      return res.redirect('/admin/products');
    }

    if (parseInt(stock) < 0) {
      req.session.error = 'Stock cannot be negative';
      return res.redirect('/admin/products');
    }

    await pool.query('UPDATE BOOK SET Quantity_In_Stock=? WHERE ISBN=?', [parseInt(stock), isbn]);

    // Auto-order handled by DB trigger

    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    req.session.error = 'Error updating book';
    res.redirect('/admin/products');
  }
};

// ================== CONFIRM ORDER ==================
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

// ================== SEARCH BOOKS ==================
exports.searchBooks = async (req, res) => {
  try {
    const { query } = req.query;
    const [books] = await pool.query(`
      SELECT * FROM BOOK
      WHERE ISBN LIKE ? OR Title LIKE ? OR Category LIKE ?
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);

    const [orders] = await pool.query(`
      SELECT * FROM REPLENISHMENT_ORDER WHERE Status='Pending'
    `);

    res.render('admin/product_management', { books, orders, error: null });
  } catch (err) {
    console.error(err);
    res.send('Database error');
  }
};

// ================== REPORTS ==================
exports.reports = async (req, res) => {
  try {
    const { date, isbn } = req.query;

    // Total Sales Month
    const [totalSalesMonthResult] = await pool.query(`
      SELECT IFNULL(SUM(oi.Quantity*oi.Price),0) AS totalSalesMonth
      FROM ORDERS o
      JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
      WHERE MONTH(o.Order_Date) = MONTH(CURDATE()) - 1
    `);

    // Total Sales Date
    let totalSalesDate = null;
    if (date) {
      const [dateSalesResult] = await pool.query(`
        SELECT IFNULL(SUM(oi.Quantity*oi.Price),0) AS totalSalesDate
        FROM ORDERS o
        JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
        WHERE o.Order_Date=?
      `, [date]);
      totalSalesDate = dateSalesResult[0].totalSalesDate;
    }

    // Top 5 Customers
    const [topCustomers] = await pool.query(`
      SELECT c.First_Name AS name, SUM(oi.Quantity*oi.Price) AS total
      FROM ORDERS o
      JOIN ORDER_ITEM oi ON o.Order_ID = oi.Order_ID
      JOIN CUSTOMER c ON o.Customer_Username = c.Username
      WHERE o.Order_Date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY c.Username
      ORDER BY total DESC
      LIMIT 5
    `);

    // Top 10 Books
    const [topBooks] = await pool.query(`
      SELECT b.ISBN, b.Title, SUM(oi.Quantity) AS sold
      FROM ORDER_ITEM oi
      JOIN BOOK b ON oi.ISBN = b.ISBN
      JOIN ORDERS o ON oi.Order_ID = o.Order_ID
      WHERE o.Order_Date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
      GROUP BY b.ISBN
      ORDER BY sold DESC
      LIMIT 10
    `);

    // Book Orders Count
    let bookOrdersCount = null;
    if (isbn) {
      const [countResult] = await pool.query(`
        SELECT COUNT(*) AS cnt
        FROM REPLENISHMENT_ORDER
        WHERE ISBN=?
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
