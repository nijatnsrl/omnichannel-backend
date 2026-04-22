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
