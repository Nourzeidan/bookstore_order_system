const isAdmin = (req, res, next) => {
    console.log("Middleware Check -> Role:", req.session.role, "UID:", req.session.userId);
    if (req.session.user && req.session.user.role === 'Admin') {
        return next();
    }
    res.status(403).send('Access Denied: Admins Only');
};
const isCustomer = (req, res, next) => {
    // Check if the user object exists AND the role is 'Customer'
    if (req.session.user && req.session.user.role === 'Customer') {
        return next();
    }
    
    // Log for debugging to see what actually exists in the session
    console.log("Middleware Blocked Access. Session Content:", req.session.user);
    res.redirect('/login');
};

const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

module.exports = { isAdmin, isCustomer, isAuthenticated };