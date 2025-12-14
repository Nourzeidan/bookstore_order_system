// Import models (will be used later)
const bookModel = require('../models/bookModel');
const orderModel = require('../models/orderModel');

// Dummy data for now
let books = [
  { isbn: '111', title: 'Physics', stock: 5, threshold: 3 },
  { isbn: '222', title: 'Art', stock: 2, threshold: 5 }
];

// GET: Dashboard
exports.dashboard = (req, res) => {
  res.render('admin/dashboard', { books: [] }); // pass dummy array
};

exports.products = (req, res) => {
  res.render('admin/product_management', { books: [] });
};

exports.reports = (req, res) => {
  res.render('admin/reports', {
    totalSalesMonth: 0,
    topCustomers: [],
    topBooks: []
  });
};
// GET: Products page
exports.products = async (req, res) => {
  // Later: const books = await bookModel.getAllBooks();
  res.render('admin/product_management', { books });
};

// POST: Add new book
exports.addBook = async (req, res) => {
  const { isbn, title, stock, threshold, price, category } = req.body;

  // For now: add to dummy array
  books.push({ isbn, title, stock, threshold, price, category });

  // Later: await bookModel.addBook(req.body);
  res.redirect('/admin/products');
};

// POST: Update book stock
exports.updateBook = async (req, res) => {
  const { isbn, stock } = req.body;

  // For now: update dummy array
  const book = books.find(b => b.isbn === isbn);
  if (book) book.stock = stock;

  // Later: await bookModel.updateBookStock(isbn, stock);
  res.redirect('/admin/products');
};

// POST: Confirm order
exports.confirmOrder = async (req, res) => {
  const { isbn } = req.body;
  const orderQuantity = 10; // fixed

  // For now: simulate stock increase
  const book = books.find(b => b.isbn === isbn);
  if (book) book.stock += orderQuantity;

  // Later: await orderModel.confirmOrder(isbn, orderQuantity);
  res.redirect('/admin/products');
};

// GET: Reports
exports.reports = async (req, res) => {
  // Dummy data for reports
  const totalSalesMonth = 1000;
  const topCustomers = [{ name: 'Alice', total: 300 }, { name: 'Bob', total: 200 }];
  const topBooks = [{ isbn: '111', title: 'Physics', sold: 50 }];

  // Later: fetch from database using orderModel
  res.render('admin/reports', { totalSalesMonth, topCustomers, topBooks });
};

