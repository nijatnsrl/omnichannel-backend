require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { pool } = require('./src/config/db');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://omnichannel-crm-delta.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true
};

const io = new Server(server, { cors: corsOptions });

app.set('io', io);
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/leads', require('./src/routes/leads'));
app.use('/api/customers', require('./src/routes/customers'));
app.use('/api/analytics', require('./src/routes/analytics'));
app.use('/api/team', require('./src/routes/team'));

app.get('/health', (req, res) => res.json({ status: 'OK', message: 'Bağ CRM Backend running' }));

io.on('connection', (socket) => {
  socket.on('join_company', (companyId) => socket.join(`company_
cat > server.js << 'EOF'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { pool } = require('./src/config/db');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://omnichannel-crm-delta.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now
    }
  },
  credentials: true
};

const io = new Server(server, { cors: corsOptions });

app.set('io', io);
app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/leads', require('./src/routes/leads'));
app.use('/api/customers', require('./src/routes/customers'));
app.use('/api/analytics', require('./src/routes/analytics'));
app.use('/api/team', require('./src/routes/team'));

app.get('/health', (req, res) => res.json({ status: 'OK', message: 'Bağ CRM Backend running' }));

io.on('connection', (socket) => {
  socket.on('join_company', (companyId) => socket.join(`company_${companyId}`));
});

const initDB = async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT 'admin', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;`);
    await pool.query(`CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS conversations (id SERIAL PRIMARY KEY, channel VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'open', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);`);
    await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);`);
    await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, sender_type VARCHAR(50) NOT NULL, sender_id INTEGER, content TEXT NOT NULL, channel VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT 'sent', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS leads (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, company VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), stage VARCHAR(50) DEFAULT 'new', value DECIMAL(10,2) DEFAULT 0, source VARCHAR(50), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);`);
    await pool.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id);`);
    console.log('🎉 All tables ready');
  } catch (error) {
    console.error('❌ DB error:', error.message);
  }
};

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log('🚀 Bağ CRM running on port ' + PORT);
  await initDB();
});
