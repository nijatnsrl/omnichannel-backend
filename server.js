require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./src/config/db');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/leads', require('./src/routes/leads'));
app.use('/api/customers', require('./src/routes/customers'));
app.use('/api/analytics', require('./src/routes/analytics'));
app.use('/api/team', require('./src/routes/team'));
app.use('/webhook', require('./src/routes/webhook'));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'BagCRM Backend is running' });
});

const initDB = async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'admin', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;`);
    await pool.query(`CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, company_id INTEGER REFERENCES companies(id), name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), instagram VARCHAR(100), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS conversations (id SERIAL PRIMARY KEY, company_id INTEGER REFERENCES companies(id), customer_id INTEGER REFERENCES customers(id), channel VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'open', assigned_to INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, conversation_id INTEGER REFERENCES conversations(id), sender_type VARCHAR(50) NOT NULL, sender_id INTEGER, content TEXT NOT NULL, channel VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'sent', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS leads (id SERIAL PRIMARY KEY, company_id INTEGER REFERENCES companies(id), name VARCHAR(255) NOT NULL, company VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), stage VARCHAR(50) DEFAULT 'new', value DECIMAL(10,2) DEFAULT 0, source VARCHAR(50), assigned_to INTEGER REFERENCES users(id), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    console.log('🎉 All tables ready');
  } catch (error) {
    console.error('❌ DB error:', error.message);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log('🚀 BagCRM running on port ' + PORT);
  await initDB();
});
