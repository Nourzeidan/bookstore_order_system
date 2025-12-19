exports.isAdmin = (req, res, next) => {
    if (req.session.userId && req.session.role === 'Admin') {
        return next(); // User is Admin, allow them through
    }
    res.status(403).send('Access Denied: Admins Only');
};

exports.isCustomer = (req, res, next) => {
    if (req.session.userId && req.session.role === 'Customer') {
        return next(); // Proceed to customer feature
    }
    // If not a customer, redirect to login
    res.redirect('/login');
};
// module.exports = { isAdmin, isCustomer };
exports.isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};