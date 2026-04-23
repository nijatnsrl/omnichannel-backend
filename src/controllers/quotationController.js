const { pool } = require('../config/db');

const getQuotations = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(`
      SELECT q.*, l.name as lead_name, l.email as lead_email, 
             c.name as customer_name, u.name as created_by_name
      FROM quotations q
      LEFT JOIN leads l ON q.lead_id = l.id
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN users u ON q.created_by = u.id
      WHERE q.company_id = $1
      ORDER BY q.created_at DESC
    `, [companyId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
};

const createQuotation = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { leadId, customerId, items, notes, validUntil, paymentLink, currency } = req.body;

    const total = items.reduce((a, item) => a + (item.qty * item.price), 0);
    const quoteNumber = `QUO-${Date.now().toString().slice(-6)}`;

    const result = await pool.query(`
      INSERT INTO quotations 
      (company_id, lead_id, customer_id, quote_number, items, total, 
       notes, valid_until, payment_link, currency, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11)
      RETURNING *
    `, [companyId, leadId, customerId, quoteNumber, JSON.stringify(items), 
        total, notes, validUntil, paymentLink, currency||'AZN', userId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({ error: 'Failed to create quotation' });
  }
};

const updateQuotation = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { status, paymentLink, notes } = req.body;

    const result = await pool.query(`
      UPDATE quotations SET status=$1, payment_link=$2, notes=$3, updated_at=CURRENT_TIMESTAMP
      WHERE id=$4 AND company_id=$5 RETURNING *
    `, [status, paymentLink, notes, id, companyId]);

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quotation' });
  }
};

const getActivities = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { leadId } = req.params;
    const result = await pool.query(`
      SELECT a.*, u.name as user_name
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.lead_id = $1 AND a.company_id = $2
      ORDER BY a.created_at DESC
    `, [leadId, companyId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

const createActivity = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { leadId, type, note, nextAction, nextActionDate } = req.body;

    const result = await pool.query(`
      INSERT INTO activities 
      (company_id, lead_id, user_id, type, note, next_action, next_action_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [companyId, leadId, userId, type, note, nextAction, nextActionDate]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

module.exports = { getQuotations, createQuotation, updateQuotation, getActivities, createActivity };
