// Dummy data
let books = [
  { isbn: '111', title: 'Physics', author: 'John', publisher: 'Uni Press', stock: 5, threshold: 3, category: 'Science' },
  { isbn: '222', title: 'Art', author: 'Alice', publisher: 'Art House', stock: 2, threshold: 5, category: 'Art' }
];

let orders = []; // Pending orders

// Dashboard
exports.dashboard = (req, res) => {
  res.render('admin/dashboard', {
    totalBooks: books.length,
    totalSales: 1500,
    pendingOrders: orders.filter(o => o.status === 'Pending').length
  });
};

// Products page
exports.products = (req, res) => {
  const error = req.session.error;  // get error from session
  req.session.error = null;         // clear after use
  res.render('admin/product_management', { books, orders, error });
};

// Add book
exports.addBook = (req, res) => {
  const { isbn, title, author, publisher, stock, threshold, category } = req.body;
  books.push({ isbn, title, author, publisher, stock: parseInt(stock), threshold: parseInt(threshold), category });
  res.redirect('/admin/products');
};

// Update book
exports.updateBook = (req, res) => {
  const { isbn, stock } = req.body;
  const book = books.find(b => b.isbn === isbn);

  if (!book) {
    req.session.error = 'Book not found';
    return res.redirect('/admin/products');
  }

  if (parseInt(stock) < 0) {
    req.session.error = 'Update rejected: Stock cannot be negative';
    return res.redirect('/admin/products');
  }

  book.stock = parseInt(stock);

  // Place order if stock < threshold
  if (book.stock < book.threshold) {
    const existingOrder = orders.find(o => o.isbn === isbn && o.status === 'Pending');
    if (!existingOrder) {
      orders.push({ isbn: book.isbn, quantity: 10, status: 'Pending' });
    }
  }

  res.redirect('/admin/products');
};
// Confirm order
exports.confirmOrder = (req, res) => {
  const { isbn } = req.params;
  const order = orders.find(o => o.isbn === isbn && o.status === 'Pending');
  if (order) {
    const book = books.find(b => b.isbn === isbn);
    if (book) book.stock += order.quantity;
    order.status = 'Confirmed';
  }
  res.redirect('/admin/products');
};

// Search books
exports.searchBooks = (req, res) => {
  const { query } = req.query;
  const filtered = books.filter(b =>
    b.isbn.includes(query) ||
    b.title.toLowerCase().includes(query.toLowerCase()) ||
    b.author.toLowerCase().includes(query.toLowerCase()) ||
    b.publisher.toLowerCase().includes(query.toLowerCase()) ||
    b.category.toLowerCase().includes(query.toLowerCase())
  );
  res.render('admin/product_management', { books: filtered, orders, error: null });
};

// Reports page
// Reports page
exports.reports = (req, res) => {
  const { date, isbn } = req.query;

  // -------------------------
  // Dummy sales data (simulation)
  // -------------------------
  const totalSalesMonth = 1000; // Previous month sales (required)
  
  // Sales on a specific day (requirement)
  const totalSalesDate = date ? 250 : null;

  // Top 5 customers (last 3 months)
  const topCustomers = [
    { name: 'Alice', total: 300 },
    { name: 'Bob', total: 200 },
    { name: 'Charlie', total: 180 },
    { name: 'Dina', total: 150 },
    { name: 'Omar', total: 120 }
  ];

  // Top 10 selling books (last 3 months)
  const topBooks = [
    { isbn: '111', title: 'Physics', sold: 50 },
    { isbn: '222', title: 'Art', sold: 30 },
    { isbn: '333', title: 'History', sold: 25 }
  ];

  // -------------------------
  // Number of times a book was ordered (replenishment orders)
  // -------------------------
  let bookOrdersCount = null;
  if (isbn) {
    bookOrdersCount = orders.filter(o => o.isbn === isbn).length;
  }

  res.render('admin/reports', {
    totalSalesMonth,
    totalSalesDate,
    topCustomers,
    topBooks,
    bookOrdersCount,
    selectedDate: date || '',
    searchedISBN: isbn || ''
  });
};


