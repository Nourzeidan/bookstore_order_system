const express = require('express');
const router = express.Router();
router.get('/home', (req, res) => res.send('Customer Home Page'));
module.exports = router;