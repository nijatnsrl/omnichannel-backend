const { pool } = require('../config/db');

const getAnalytics = async (req, res) => {
  try {
    const { companyId } = req.user;

    const leadsResult = await pool.query(
      'SELECT COUNT(*) as total, COALESCE(SUM(value),0) as total_value FROM leads WHERE company_id=$1',
      [companyId]
    );

    const stagesResult = await pool.query(
      'SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as value FROM leads WHERE company_id=$1 GROUP BY stage',
      [companyId]
    );

    const customersResult = await pool.query(
      'SELECT COUNT(*) as total FROM customers WHERE company_id=$1',
      [companyId]
    );

    const convResult = await pool.query(
      'SELECT COUNT(*) as total FROM conversations WHERE company_id=$1',
      [companyId]
    );

    const wonResult = await pool.query(
      'SELECT COUNT(*) as total FROM leads WHERE company_id=$1 AND stage=$2',
      [companyId, 'won']
    );

    const sourceResult = await pool.query(
      'SELECT source, COUNT(*) as count FROM leads WHERE company_id=$1 AND source IS NOT NULL GROUP BY source',
      [companyId]
    );

    res.json({
      leads: {
        total: parseInt(leadsResult.rows[0].total),
        totalValue: parseFloat(leadsResult.rows[0].total_value),
        won: parseInt(wonResult.rows[0].total),
      },
      stages: stagesResult.rows,
      sources: sourceResult.rows,
      customers: parseInt(customersResult.rows[0].total),
      conversations: parseInt(convResult.rows[0].total),
    });
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAnalytics };
