const { pool } = require('../config/db');

const getAnalytics = async (req, res) => {
  try {
    const { companyId } = req.user;

    const [leadsResult, stagesResult, customersResult, convResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, SUM(value) as total_value FROM leads WHERE company_id=$1', [companyId]),
      pool.query('SELECT stage, COUNT(*) as count, SUM(value) as value FROM leads WHERE company_id=$1 GROUP BY stage', [companyId]),
      pool.query('SELECT COUNT(*) as total FROM customers WHERE company_id=$1', [companyId]),
      pool.query('SELECT COUNT(*) as total FROM conversations WHERE company_id=$1', [companyId]),
    ]);

    res.json({
      leads: {
        total: parseInt(leadsResult.rows[0].total),
        totalValue: parseFloat(leadsResult.rows[0].total_value || 0),
      },
      stages: stagesResult.rows,
      customers: parseInt(customersResult.rows[0].total),
      conversations: parseInt(convResult.rows[0].total),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

module.exports = { getAnalytics };
