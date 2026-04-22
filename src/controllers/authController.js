const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const register = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { email, password, name, companyName, role } = req.body;

    // Check if user exists
    const userExists = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create company
    const companyResult = await client.query(
      'INSERT INTO companies (name) VALUES ($1) RETURNING id, name',
      [companyName || 'My Company']
    );
    const company = companyResult.rows[0];

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password, name, company_id, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, company_id, role`,
      [email, hashedPassword, name, company.id, role || 'admin']
    );
    const user = userResult.rows[0];

    await client.query('COMMIT');

    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        companyId: company.id,
        companyName: company.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      user: {
        ...user,
        company_name: company.name
      }, 
      token 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with company info
    const result = await pool.query(`
      SELECT u.*, c.name as company_name 
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = $1
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Generate token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        companyId: user.company_id,
        companyName: user.company_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company_name: user.company_name,
        role: user.role
      },
      token
    });
  } catch (error) {
    conso
cat > src/controllers/leadsController.js << 'EOF'
const { pool } = require('../config/db');

const getLeads = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { stage, assignedTo } = req.query;

    let query = `
      SELECT l.*, 
             c.name as customer_name, 
             u.name as assigned_name
      FROM leads l
      LEFT JOIN customers c ON l.customer_id = c.id
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.company_id = $1
    `;
    const params = [companyId];

    if (stage) {
      params.push(stage);
      query += ` AND l.stage = $${params.length}`;
    }

    if (assignedTo) {
      params.push(assignedTo);
      query += ` AND l.assigned_to = $${params.length}`;
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

const createLead = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { name, company, email, phone, stage, value, source } = req.body;

    const result = await pool.query(`
      INSERT INTO leads (
        company_id, name, company, email, phone, 
        stage, value, source, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [companyId, name, company, email, phone, stage || 'new', value || 0, source, userId]);

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
    const updates = req.body;

    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, i) => `${field} = $${i + 3}`).join(', ');
    
    const result = await pool.query(`
      UPDATE leads 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE i
cat > src/routes/leads.js << 'EOF'
const express = require('express');
const { getLeads, createLead, updateLead, deleteLead } = require('../controllers/leadsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getLeads);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

module.exports = router;
