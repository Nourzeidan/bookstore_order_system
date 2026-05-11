
// Unit Tests for adminController.js, customerController.js, and auth.js
// All DB calls are mocked — no real database connection needed.
// Run with: npx jest unit.test.js

// ─── Mock database BEFORE requiring any controller ────────────────────────
jest.mock('../config/database', () => ({
    query:   jest.fn(),
    execute: jest.fn(),
}));

const db                 = require('../config/database');
const adminController    = require('../controllers/adminController');
const customerController = require('../controllers/customerController');

// ─── Reusable mock req/res builders ───────────────────────────────────────
const mockRes = () => {
    const res = {};
    res.render    = jest.fn().mockReturnValue(res);
    res.redirect  = jest.fn().mockReturnValue(res);
    res.send      = jest.fn().mockReturnValue(res);
    res.status    = jest.fn().mockReturnValue(res);
    return res;
};

const mockReq = (overrides = {}) => ({
    body:    {},
    params:  {},
    query:   {},
    session: { user: { username: 'testuser', role: 'Customer' }, save: jest.fn(cb => cb()) },
    ...overrides,
});

beforeEach(() => jest.clearAllMocks());


// ══════════════════════════════════════════════════════════════════════════════
// 1. ADMIN CONTROLLER — dashboard()
// ══════════════════════════════════════════════════════════════════════════════
describe('adminController.dashboard()', () => {

    test('TC-U01 | renders dashboard with correct totals from DB', async () => {
        db.query
            .mockResolvedValueOnce([[{ totalBooks: 42 }]])
            .mockResolvedValueOnce([[{ totalSales: 1500.00 }]])
            .mockResolvedValueOnce([[{ pendingOrders: 3 }]]);

        const req = mockReq();
        const res = mockRes();

        await adminController.dashboard(req, res);

        expect(res.render).toHaveBeenCalledWith('admin/dashboard', {
            totalBooks:    42,
            totalSales:    1500.00,
            pendingOrders: 3,
        });
    });

    test('TC-U02 | sends "Database error" when DB query fails', async () => {
        db.query.mockRejectedValue(new Error('DB connection lost'));

        const req = mockReq();
        const res = mockRes();

        await adminController.dashboard(req, res);

        expect(res.send).toHaveBeenCalledWith('Database error');
        expect(res.render).not.toHaveBeenCalled();
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 2. ADMIN CONTROLLER — addBook()
// ══════════════════════════════════════════════════════════════════════════════
describe('adminController.addBook()', () => {

    const baseReq = () => mockReq({
        body: {
            isbn:          '9780132350884',
            title:         'Clean Code',
            stock:         '10',
            threshold:     '3',
            category:      'Programming',
            selling_price: '45.00',
            publisher_id:  '1',
            author_id:     ['2'],
        },
        session: { user: { username: 'admin', role: 'admin' }, save: jest.fn(cb => cb()), error: null },
    });

    test('TC-U03 | inserts book + author rows and redirects to /admin/products', async () => {
        db.query
            .mockResolvedValueOnce([{ affectedRows: 1 }])   // INSERT BOOK
            .mockResolvedValueOnce([{ affectedRows: 1 }])   // INSERT BOOK_AUTHOR
            .mockResolvedValueOnce([[]]);                   // replenishment check — none triggered

        const req = baseReq();
        const res = mockRes();

        await adminController.addBook(req, res);

        expect(db.query).toHaveBeenCalledTimes(3);
        expect(res.redirect).toHaveBeenCalledWith('/admin/products');
    });

    test('TC-U04 | sets session error on duplicate ISBN (ER_DUP_ENTRY)', async () => {
        const err  = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
        db.query.mockRejectedValue(err);

        const req = baseReq();
        const res = mockRes();

        await adminController.addBook(req, res);

        expect(req.session.error).toBe('ISBN already exists. Please enter a unique ISBN.');
        expect(res.redirect).toHaveBeenCalledWith('/admin/products');
    });

    test('TC-U05 | sets session error on trigger rejection for negative stock (sqlState 45000)', async () => {
        const err = Object.assign(new Error('Stock cannot be negative'), {
            sqlState: '45000', sqlMessage: 'Stock cannot be negative',
        });
        db.query.mockRejectedValue(err);

        const req = baseReq();
        const res = mockRes();

        await adminController.addBook(req, res);

        expect(req.session.error).toBe('Stock cannot be negative');
        expect(res.redirect).toHaveBeenCalledWith('/admin/products');
    });

    test('TC-U06 | inserts one BOOK_AUTHOR row per author when multiple authors provided', async () => {
        db.query
            .mockResolvedValueOnce([{ affectedRows: 1 }])   // INSERT BOOK
            .mockResolvedValueOnce([{ affectedRows: 1 }])   // INSERT BOOK_AUTHOR — author 2
            .mockResolvedValueOnce([{ affectedRows: 1 }])   // INSERT BOOK_AUTHOR — author 5
            .mockResolvedValueOnce([[]]);                   // replenishment check

        const req         = baseReq();
        req.body.author_id = ['2', '5'];
        const res         = mockRes();

        await adminController.addBook(req, res);

        // BOOK + 2×BOOK_AUTHOR + replenishment check = 4 total calls
        expect(db.query).toHaveBeenCalledTimes(4);
        expect(res.redirect).toHaveBeenCalledWith('/admin/products');
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 3. ADMIN CONTROLLER — updateBook()
// ══════════════════════════════════════════════════════════════════════════════
describe('adminController.updateBook()', () => {

    test('TC-U07 | updates stock and redirects when book exists', async () => {
        db.query
            .mockResolvedValueOnce([[{ ISBN: '978', Title: 'Clean Code', Quantity_In_Stock: 5 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }])
            .mockResolvedValueOnce([[]]);

        const req = mockReq({
            body:    { isbn: '978', stock: '20' },
            session: { user: { username: 'admin' }, error: null, save: jest.fn(cb => cb()) },
        });
        const res = mockRes();

        await adminController.updateBook(req, res);

        expect(db.query).toHaveBeenCalledWith(
            'UPDATE BOOK SET Quantity_In_Stock=? WHERE ISBN=?',
            [20, '978']
        );
        expect(res.redirect).toHaveBeenCalledWith('/admin/products');
    });

    test('TC-U08 | sets session error and redirects when book is not found', async () => {
        db.query.mockResolvedValueOnce([[]]); // empty — book not found

        const req = mockReq({
            body:    { isbn: '000', stock: '5' },
            session: { user: { username: 'admin' }, error: null, save: jest.fn(cb => cb()) },
        });
        const res = mockRes();

        await adminController.updateBook(req, res);

        expect(req.session.error).toBe('Book not found');
        expect(res.redirect).toHaveBeenCalledWith('/admin/products');
    });

    test('TC-U09 | sets session error on trigger rejection for negative stock', async () => {
        db.query
            .mockResolvedValueOnce([[{ ISBN: '978', Title: 'Clean Code' }]])
            .mockRejectedValueOnce(Object.assign(new Error('neg'), {
                sqlState: '45000', sqlMessage: 'Invalid stock: cannot be negative.',
            }));

        const req = mockReq({
            body:    { isbn: '978', stock: '-5' },
            session: { user: { username: 'admin' }, error: null, save: jest.fn(cb => cb()) },
        });
        const res = mockRes();

        await adminController.updateBook(req, res);

        expect(req.session.error).toBe('Invalid stock: cannot be negative.');
        expect(res.redirect).toHaveBeenCalledWith('/admin/products');
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 4. ADMIN CONTROLLER — confirmOrder()
// ══════════════════════════════════════════════════════════════════════════════
describe('adminController.confirmOrder()', () => {

    test('TC-U10 | confirms pending order, updates stock and status, redirects', async () => {
        db.query
            .mockResolvedValueOnce([[{ Order_ID: 7, ISBN: '978', Quantity: 20 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const req = mockReq({ params: { isbn: '978' } });
        const res = mockRes();

        await adminController.confirmOrder(req, res);

        expect(db.query).toHaveBeenCalledTimes(2);
        expect(res.redirect).toHaveBeenCalledWith('/admin/products');
    });

    test('TC-U11 | skips DB update when no pending order exists and still redirects', async () => {
        db.query.mockResolvedValueOnce([[]]); // no order

        const req = mockReq({ params: { isbn: '978' } });
        const res = mockRes();

        await adminController.confirmOrder(req, res);

        expect(db.query).toHaveBeenCalledTimes(1); // only SELECT, no UPDATE
        expect(res.redirect).toHaveBeenCalledWith('/admin/products');
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 5. CUSTOMER CONTROLLER — addToCart()
// ══════════════════════════════════════════════════════════════════════════════
describe('customerController.addToCart()', () => {

    test('TC-U12 | increments quantity when book already exists in cart', async () => {
        db.execute
            .mockResolvedValueOnce([[{ Cart_ID: 1 }]])
            .mockResolvedValueOnce([[{ Quantity: 2 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const req = mockReq({ params: { isbn: '978' } });
        const res = mockRes();

        await customerController.addToCart(req, res);

        expect(db.execute).toHaveBeenCalledWith(
            'UPDATE CART_ITEM SET Quantity = ? WHERE Cart_ID = ? AND ISBN = ?',
            [3, 1, '978']
        );
        expect(res.redirect).toHaveBeenCalledWith('/customer/cart');
    });

    test('TC-U13 | inserts new cart row when book is not yet in cart', async () => {
        db.execute
            .mockResolvedValueOnce([[{ Cart_ID: 1 }]])
            .mockResolvedValueOnce([[undefined]])
            .mockResolvedValueOnce([[{ ISBN: '978' }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const req = mockReq({ params: { isbn: '978' } });
        const res = mockRes();

        await customerController.addToCart(req, res);

        expect(db.execute).toHaveBeenCalledWith(
            'INSERT INTO CART_ITEM (Cart_ID, ISBN, Quantity) VALUES (?, ?, 1)',
            [1, '978']
        );
        expect(res.redirect).toHaveBeenCalledWith('/customer/cart');
    });

    test('TC-U14 | returns 404 when ISBN does not exist in BOOK table', async () => {
        db.execute
            .mockResolvedValueOnce([[{ Cart_ID: 1 }]])
            .mockResolvedValueOnce([[undefined]])
            .mockResolvedValueOnce([[undefined]]); // book not found

        const req = mockReq({ params: { isbn: 'INVALID' } });
        const res = mockRes();

        await customerController.addToCart(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith('Book not found in database.');
    });

    test('TC-U15 | returns 400 when shopping cart does not exist for user', async () => {
        db.execute.mockResolvedValueOnce([[undefined]]);

        const req = mockReq({ params: { isbn: '978' } });
        const res = mockRes();

        await customerController.addToCart(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith('Cart not found');
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 6. CUSTOMER CONTROLLER — removeFromCart()
// ══════════════════════════════════════════════════════════════════════════════
describe('customerController.removeFromCart()', () => {

    test('TC-U16 | decrements quantity when item quantity is greater than 1', async () => {
        db.execute
            .mockResolvedValueOnce([[{ Cart_ID: 1 }]])
            .mockResolvedValueOnce([[{ Quantity: 3 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const req = mockReq({ params: { isbn: '978' } });
        const res = mockRes();

        await customerController.removeFromCart(req, res);

        expect(db.execute).toHaveBeenCalledWith(
            'UPDATE CART_ITEM SET Quantity = Quantity - 1 WHERE Cart_ID = ? AND ISBN = ?',
            [1, '978']
        );
        expect(res.redirect).toHaveBeenCalledWith('/customer/cart');
    });

    test('TC-U17 | deletes cart row entirely when item quantity is exactly 1', async () => {
        db.execute
            .mockResolvedValueOnce([[{ Cart_ID: 1 }]])
            .mockResolvedValueOnce([[{ Quantity: 1 }]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]);

        const req = mockReq({ params: { isbn: '978' } });
        const res = mockRes();

        await customerController.removeFromCart(req, res);

        expect(db.execute).toHaveBeenCalledWith(
            'DELETE FROM CART_ITEM WHERE Cart_ID = ? AND ISBN = ?',
            [1, '978']
        );
        expect(res.redirect).toHaveBeenCalledWith('/customer/cart');
    });

    test('TC-U18 | redirects without touching DB when no cart exists for user', async () => {
        db.execute.mockResolvedValueOnce([[undefined]]);

        const req = mockReq({ params: { isbn: '978' } });
        const res = mockRes();

        await customerController.removeFromCart(req, res);

        expect(db.execute).toHaveBeenCalledTimes(1); // only the cart SELECT
        expect(res.redirect).toHaveBeenCalledWith('/customer/cart');
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 7. CUSTOMER CONTROLLER — updateProfile()
// ══════════════════════════════════════════════════════════════════════════════
describe('customerController.updateProfile()', () => {

    test('TC-U19 | uses SHA2 query when password is provided', async () => {
        db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const req = mockReq({
            body: { username: 'newuser', email: 'new@email.com', password: 'newpass123' },
        });
        const res = mockRes();

        await customerController.updateProfile(req, res);

        expect(db.execute).toHaveBeenCalledWith(
            'UPDATE CUSTOMER SET Username = ?, Email = ?, Password = SHA2(?, 256) WHERE Username = ?',
            ['newuser', 'new@email.com', 'newpass123', 'testuser']
        );
    });

    test('TC-U20 | uses 2-field query when password field is blank', async () => {
        db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const req = mockReq({
            body: { username: 'newuser', email: 'new@email.com', password: '' },
        });
        const res = mockRes();

        await customerController.updateProfile(req, res);

        expect(db.execute).toHaveBeenCalledWith(
            'UPDATE CUSTOMER SET Username = ?, Email = ? WHERE Username = ?',
            ['newuser', 'new@email.com', 'testuser']
        );
    });

    test('TC-U21 | updates session username and userId after successful profile update', async () => {
        db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const req = mockReq({
            body: { username: 'updatedUser', email: 'u@u.com', password: '' },
        });
        const res = mockRes();

        await customerController.updateProfile(req, res);

        expect(req.session.user.username).toBe('updatedUser');
        expect(req.session.userId).toBe('updatedUser');
    });
});


// ══════════════════════════════════════════════════════════════════════════════
// 8. CUSTOMER CONTROLLER — postCheckout() — stock validation logic
// ══════════════════════════════════════════════════════════════════════════════
describe('customerController.postCheckout() — stock validation', () => {

    const makeItem = (overrides) => ({
        ISBN:              '978',
        Title:             'Clean Code',
        Selling_Price:     '45.00',
        Quantity:          2,
        Quantity_In_Stock: 10,
        Threshold:         3,
        Publisher_ID:      1,
        ...overrides,
    });

    test('TC-U22 | returns 400 with out-of-stock message when requested qty exceeds stock', async () => {
        db.execute
            .mockResolvedValueOnce([[{ Cart_ID: 1 }]])
            .mockResolvedValueOnce([[makeItem({ Quantity: 5, Quantity_In_Stock: 2 })]]);

        const req = mockReq();
        const res = mockRes();

        await customerController.postCheckout(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const msg = res.send.mock.calls[0][0];
        expect(msg).toContain('Clean Code');
        expect(msg).toContain("don't have enough stock");
    });

    test('TC-U23 | returns 400 and creates replenishment order when purchase drops stock below threshold', async () => {
        // stock=5, threshold=3, buying 3 → remaining=2 which is < threshold
        db.execute
            .mockResolvedValueOnce([[{ Cart_ID: 1 }]])
            .mockResolvedValueOnce([[makeItem({ Quantity: 3, Quantity_In_Stock: 5, Threshold: 3 })]])
            .mockResolvedValueOnce([{ affectedRows: 1 }]); // INSERT replenishment order

        const req = mockReq();
        const res = mockRes();

        await customerController.postCheckout(req, res);

        const replenishCall = db.execute.mock.calls.find(c =>
            c[0].includes('INSERT INTO REPLENISHMENT_ORDER')
        );
        expect(replenishCall).toBeDefined();

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send.mock.calls[0][0]).toContain('low in stock');
    });

    test('TC-U24 | returns 400 with "Cart is empty" when cart has no items', async () => {
        db.execute
            .mockResolvedValueOnce([[{ Cart_ID: 1 }]])
            .mockResolvedValueOnce([[]]); // empty cart

        const req = mockReq();
        const res = mockRes();

        await customerController.postCheckout(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith('Cart is empty');
    });

    test('TC-U25 | returns 400 with "Cart not found" when user has no shopping cart', async () => {
        db.execute.mockResolvedValueOnce([[undefined]]);

        const req = mockReq();
        const res = mockRes();

        await customerController.postCheckout(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith('Cart not found');
    });
});