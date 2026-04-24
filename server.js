require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { pool } = require('./src/config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET','POST'] } });

app.set('io', io);
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/leads', require('./src/routes/leads'));
app.use('/api/customers', require('./src/routes/customers'));
app.use('/api/analytics', require('./src/routes/analytics'));
app.use('/api/team', require('./src/routes/team'));
app.use('/api/quotations', require('./src/routes/quotations'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/insights', require('./src/routes/insights'));
app.use('/api/company', require('./src/routes/company'));
app.use('/api/bulk', require('./src/routes/bulk'));
app.use('/api/bookings', require('./src/routes/bookings'));
app.use('/api/photos', require('./src/routes/photos'));

app.get('/health', (req, res) => res.json({ status: 'OK', message: 'Bag CRM running' }));

io.on('connection', (socket) => {
  socket.on('join_company', (companyId) => socket.join('company_' + companyId));
});

const initDB = async () => {
  try {
    await pool.query('CREATE TABLE IF NOT EXISTS companies (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    await pool.query('CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, name VARCHAR(255) NOT NULL, role VARCHAR(50) DEFAULT \'admin\', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP');
    await pool.query('CREATE TABLE IF NOT EXISTS customers (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255), phone VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)');
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS instagram VARCHAR(100)');
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50)');
    await pool.query('CREATE TABLE IF NOT EXISTS conversations (id SERIAL PRIMARY KEY, channel VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT \'open\', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    await pool.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)');
    await pool.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id)');
    await pool.query('ALTER TABLE conversations ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id)');
    await pool.query('CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, sender_type VARCHAR(50) NOT NULL, sender_id INTEGER, content TEXT NOT NULL, channel VARCHAR(50) NOT NULL, status VARCHAR(50) DEFAULT \'sent\', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id)');
    await pool.query('CREATE TABLE IF NOT EXISTS leads (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, company VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), stage VARCHAR(50) DEFAULT \'new\', value DECIMAL(10,2) DEFAULT 0, source VARCHAR(50), notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id)');
    await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id)');
    await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id)');
    await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id)');

    // Quotations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotations (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id),
        lead_id INTEGER REFERENCES leads(id),
        customer_id INTEGER REFERENCES customers(id),
        quote_number VARCHAR(50) UNIQUE NOT NULL,
        items JSONB NOT NULL DEFAULT '[]',
        total DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'AZN',
        status VARCHAR(50) DEFAULT 'draft',
        notes TEXT,
        valid_until DATE,
        payment_link TEXT,
        paid_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id),
        lead_id INTEGER REFERENCES leads(id),
        user_id INTEGER REFERENCES users(id),
        type VARCHAR(50) DEFAULT 'note',
        note TEXT,
        next_action VARCHAR(255),
        next_action_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'AZN',
        sku VARCHAR(100),
        stock INTEGER DEFAULT 0,
        category VARCHAR(100),
        unit VARCHAR(50) DEFAULT 'ədəd',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT \'individual\'');
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS company VARCHAR(255)');
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT');
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100)');
    await pool.query('ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT');
    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0');
    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 18');
    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0');
    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0');
    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms TEXT');
    await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '14 days')");
    await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'trial'");
    await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry VARCHAR(100)");
    await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT");
    await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS website VARCHAR(255)");
    await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50)");
    await pool.query("ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT");
    await pool.query("UPDATE companies SET trial_ends_at = NOW() + INTERVAL '14 days' WHERE trial_ends_at IS NULL");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id),
        customer_id INTEGER REFERENCES customers(id),
        lead_id INTEGER,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'appointment',
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        location VARCHAR(255),
        assigned_to INTEGER REFERENCES users(id),
        service_id INTEGER,
        status VARCHAR(50) DEFAULT 'scheduled',
        price DECIMAL(10,2),
        currency VARCHAR(10) DEFAULT 'AZN',
        notes TEXT,
        reminder_sent BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES companies(id),
        customer_id INTEGER REFERENCES customers(id),
        booking_id INTEGER REFERENCES bookings(id),
        lead_id INTEGER,
        url TEXT NOT NULL,
        caption VARCHAR(255),
        category VARCHAR(50) DEFAULT 'general',
        uploaded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS idx_bookings_start ON bookings(start_time)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_bookings_company ON bookings(company_id)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_photos_customer ON photos(customer_id)");
    console.log('All tables ready');
  } catch (error) {
    console.error('DB error:', error.message);
  }
};

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log('Bag CRM running on port ' + PORT);
  await initDB();
});
