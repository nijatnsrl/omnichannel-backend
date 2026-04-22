require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool } = require('./src/config/db');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/leads', require('./src/routes/leads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'BagCRM Backend is running' });
});

// Database initialization
const initDB = async () => {
  try {
    // Run migration if exists
    const migrationPath = path.join(__dirname, 'migrations', '001_enhanced_schema.sql');
    if (fs.existsSync(migrationPath)) {
      const migration = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(migration);
      console.log('✅ Database migrations completed');
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 BagCRM Server running on port ${PORT}`);
  await initDB();
});
