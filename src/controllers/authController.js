const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const register = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { email, password, name, companyName, role } = req.body;

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
      'INSERT INTO users (email, password, name, company_id, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, company_id, role',
      [email, hashedPassword, name, company.id, role || 'admin']
    );
    const user = userResult.rows[0];

    // Create sample data for demo

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, companyId: company.id, companyName: company.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: { ...user, company_name: company.name },
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

const createSampleData = async (client, companyId, userId, userName) => {
  try {
    // Sample customers
    const customers = [
      { name: 'Anar Həsənov', email: 'anar@tech.az', phone: '+994501234567' },
      { name: 'Nigar Əliyeva', email: 'nigar@style.az', phone: '+994552345678' },
      { name: 'Kamran İsmayılov', email: 'kamran@bizhub.az', phone: '+994503456789' },
      { name: 'Leyla Məmmədova', email: 'leyla@design.az', phone: '+994504567890' },
      { name: 'Rauf Qasımov', email: 'rauf@invest.az', phone: '+994505678901' },
    ];

    const customerIds = [];
    for (const c of customers) {
      const r = await client.query(
        'INSERT INTO customers (name, email, phone, company_id) VALUES ($1, $2, $3, $4) RETURNING id',
        [c.name, c.email, c.phone, companyId]
      );
      customerIds.push(r.rows[0].id);
    }

    // Sample leads
    const leads = [
      { name: 'Anar Həsənov', company: 'Tech.az', email: 'anar@tech.az', stage: 'new', value: 5000, source: 'whatsapp' },
      { name: 'Nigar Əliyeva', company: 'Style LLC', email: 'nigar@style.az', stage: 'contacted', value: 8500, source: 'instagram' },
      { name: 'Kamran İsmayılov', company: 'BizHub', email: 'kamran@bizhub.az', stage: 'proposal', value: 15000, source: 'email' },
      { name: 'Leyla Məmmədova', company: 'Design Studio', email: 'leyla@design.az', stage: 'won', value: 12000, source: 'linkedin' },
      { name: 'Rauf Qasımov', company: 'Invest Group', email: 'rauf@invest.az', stage: 'negotiation', value: 25000, source: 'facebook' },
      { name: 'Sara Rzayeva', company: 'Sara Beauty', email: 'sara@beauty.az', stage: 'new', value: 3500, source: 'instagram' },
      { name: 'Elnur Babayev', company: 'Elnur Co', email: 'elnur@co.az', stage: 'contacted', value: 7000, source: 'whatsapp' },
    ];

    for (const l of leads) {
      await client.query(
        'INSERT INTO leads (name, company, email, stage, value, source, company_id, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [l.name, l.company, l.email, l.stage, l.value, l.source, companyId, userId]
      );
    }

    // Sample conversations
    const channels = ['whatsapp', 'instagram', 'facebook', 'email'];
    const sampleMessages = [
      'Salam, məhsulunuz barədə məlumat almaq istəyirdim',
      'Qiymət haqqında sual vermək istəyirəm',
      'Demo görmək mümkündürmü?',
      'Müqavilə imzalamağa hazıram',
      'Endirim varmı?',
    ];

    for (let i = 0; i < 4; i++) {
      const convResult = await client.query(
        'INSERT INTO conversations (customer_id, channel, status, company_id, assigned_to) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [customerIds[i], channels[i], 'open', companyId, userId]
      );
      const convId = convResult.rows[0].id;

      // Add messages to conversation
      await client.query(
        'INSERT INTO messages (conversation_id, sender_type, content, channel) VALUES ($1, $2, $3, $4)',
        [convId, 'customer', sampleMessages[i], channels[i]]
      );
      await client.query(
        'INSERT INTO messages (conversation_id, sender_type, sender_id, content, channel) VALUES ($1, $2, $3, $4, $5)',
        [convId, 'agent', userId, 'Salam! Necə kömək edə bilərəm?', channels[i]]
      );
      await client.query(
        'INSERT INTO messages (conversation_id, sender_type, content, channel) VALUES ($1, $2, $3, $4)',
        [convId, 'customer', sampleMessages[i + 1] || 'Təşəkkür edirəm!', channels[i]]
      );

      await client.query(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [convId]
      );
    }

    console.log('Sample data created for company:', companyId);
  } catch (error) {
    console.error('Sample data error:', error.message);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, companyId: user.company_id, companyName: user.company_name },
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
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

module.exports = { register, login };
