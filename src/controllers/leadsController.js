const { pool } = require('../config/db');

const getLeads = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      `SELECT l.*, u.name as assigned_name 
       FROM leads l
       LEFT JOIN users u ON l.assigned_to = u.id
       WHERE l.company_id = $1 
       ORDER BY l.created_at DESC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

const createLead = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { name, company, email, phone, stage, value, source, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO leads (company_id, name, company, email, phone, stage, value, source, notes, assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [companyId, name, company, email, phone, stage||'new', value||0, source, notes, userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
};

const updateLead = async (req, res) => {
  // auto-create customer logic at end
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { name, company, email, phone, stage, value, source, notes } = req.body;
    const result = await pool.query(
      `UPDATE leads SET name=$1, company=$2, email=$3, phone=$4, 
       stage=$5, value=$6, source=$7, notes=$8, updated_at=CURRENT_TIMESTAMP
       WHERE id=$9 AND company_id=$10 RETURNING *`,
      [name, company, email, phone, stage, value, source, notes, id, companyId]
    );
    
    // Auto-create customer when lead is won
    if (req.body.stage === 'won') {
      try {
        const existing = await pool.query(
          'SELECT id FROM customers WHERE company_id=$1 AND (email=$2 OR phone=$3) LIMIT 1',
          [companyId, req.body.email || '', req.body.phone || '']
        );
        if (!existing.rows[0]) {
          await pool.query(
            `INSERT INTO customers (company_id, name, email, phone, company, type, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [companyId, req.body.name, req.body.email || '', req.body.phone || '', 
             req.body.company || '', req.body.company ? 'company' : 'individual',
             'Auto-created from won lead']
          );
        }
      } catch (e) { console.log('Customer auto-create skipped:', e.message); }
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

const deleteLead = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    await pool.query('DELETE FROM leads WHERE id=$1 AND company_id=$2', [id, companyId]);
    res.json({ message: 'Lead deleted' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
};

module.exports = { getLeads, createLead, updateLead, deleteLead };
