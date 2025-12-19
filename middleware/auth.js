const isAdmin = (req, res, next) => {
    console.log("Middleware Check -> Role:", req.session.role, "UID:", req.session.userId);
    if (req.session.userId && req.session.role === 'Admin') {
        return next();
    }
    res.status(403).send('Access Denied: Admins Only');
};
const isCustomer = (req, res, next) => {
    if (req.session.userId && req.session.role === 'Customer') {
        return next();
    }
    res.redirect('/login');
};

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

// EXPORT ALL THREE PROPERLY
module.exports = { isAdmin, isCustomer, isAuthenticated };