const express = require('express');
const { getAnalytics } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);
router.get('/', getAnalytics);
module.exports = router;
