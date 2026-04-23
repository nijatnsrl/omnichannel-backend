const express = require('express');
const { getCustomer360, getTodayTasks, getRevenueDashboard } = require('../controllers/insightsController');
const auth = require('../middleware/auth');
const router = express.Router();
router.use(auth);
router.get('/customer/:id', getCustomer360);
router.get('/today', getTodayTasks);
router.get('/revenue', getRevenueDashboard);
module.exports = router;
