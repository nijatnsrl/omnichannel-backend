const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const getTeam = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      'SELECT id, name, email, role, last_login, created_at FROM users WHERE company_id=$1 ORDER BY created_at DESC',
      [companyId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

const inviteTeamMember = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, email, role, password } = req.body;

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password || 'changeme123', 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, company_id) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role',
      [name, email, hashedPassword, role || 'agent', companyId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Invite team error:', error);
    res.status(500).json({ error: 'Failed to invite team member' });
  }
};

const updateTeamMember = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { name, role } = req.body;
    const result = await pool.query(
      'UPDATE users SET name=$1, role=$2 WHERE id=$3 AND company_id=$4 RETURNING id, name, email, role',
      [name, role, id, companyId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
};

const removeTeamMember = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { id } = req.params;

    if (parseInt(id) === userId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    await pool.query('DELETE FROM users WHERE id=$1 AND company_id=$2', [id, companyId]);
    res.json({ message: 'Team member removed' });
  } catch (error) {
    console.error('Remove team error:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
};

module.exports = { getTeam, inviteTeamMember, updateTeamMember, removeTeamMember };
