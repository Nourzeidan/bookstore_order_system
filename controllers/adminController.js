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
  res.render('admin/product_management', { books, orders });
};

// Add book
exports.addBook = (req, res) => {
  const { isbn, title, author, publisher, stock, threshold, category } = req.body;
  books.push({ isbn, title, author, publisher, stock: parseInt(stock), threshold: parseInt(threshold), category });
  res.redirect('/admin/products');
};

// Update book
exports.updateBook = (req, res) => {
  const { isbn, stock, title, author, publisher, category } = req.body;
  const book = books.find(b => b.isbn === isbn);

  if (!book) return res.send('Book not found');

  if (stock && parseInt(stock) < 0) {
    return res.send('Stock cannot be negative');
  }

  // Update fields if provided
  if (title) book.title = title;
  if (author) book.author = author;
  if (publisher) book.publisher = publisher;
  if (category) book.category = category;
  if (stock !== undefined) book.stock = parseInt(stock);

  // Place order if stock falls below threshold
  if (book.stock < book.threshold) {
    const existingOrder = orders.find(o => o.isbn === isbn && o.status === 'Pending');
    if (!existingOrder) {
      orders.push({ isbn: book.isbn, quantity: 10, status: 'Pending' }); // constant order quantity = 10
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
  res.render('admin/product_management', { books: filtered, orders });
};

// Reports page
exports.reports = (req, res) => {
  // Dummy data for reports
  const totalSalesMonth = 1000; // total sales last month
  const totalSalesDate = 200;   // total sales on a specific day
  const topCustomers = [
    { name: 'Alice', total: 300 },
    { name: 'Bob', total: 200 }
  ];
  const topBooks = [
    { isbn: '111', title: 'Physics', sold: 50 },
    { isbn: '222', title: 'Art', sold: 30 }
  ];
  const bookOrdersCount = orders.reduce((acc, o) => {
    acc[o.isbn] = (acc[o.isbn] || 0) + 1;
    return acc;
  }, {});

  res.render('admin/reports', {
    totalSalesMonth,
    totalSalesDate,
    topCustomers,
    topBooks,
    bookOrdersCount
  });
};
