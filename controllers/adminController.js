
// Dummy data
let books = [
  { isbn: '111', title: 'Physics', stock: 5, threshold: 3 },
  { isbn: '222', title: 'Art', stock: 2, threshold: 5 }
];
exports.dashboard = (req, res) => {
  res.render('admin/dashboard', {
    totalBooks: 2,
    totalSales: 1500,
    pendingOrders: 3
  });
};

// Products page
exports.products = (req, res) => {
  res.render('admin/product_management', { books });
};

// Reports page
exports.reports = (req, res) => {
  // Dummy data for now
  const totalSalesMonth = 1000;
  const topCustomers = [
    { name: 'Alice', total: 300 },
    { name: 'Bob', total: 200 }
  ];
  const topBooks = [
    { isbn: '111', title: 'Physics', sold: 50 },
    { isbn: '222', title: 'Art', sold: 30 }
  ];

  res.render('admin/reports', {
    totalSalesMonth,
    topCustomers,
    topBooks
  });
};

// Add book
exports.addBook = (req, res) => {
  const { isbn, title, stock, threshold } = req.body;
  books.push({ isbn, title, stock, threshold });
  res.redirect('/admin/products');
};
