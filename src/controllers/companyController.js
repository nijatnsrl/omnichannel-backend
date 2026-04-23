const { pool } = require('../config/db');

const getCompany = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query('SELECT * FROM companies WHERE id=$1', [companyId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    
    const company = result.rows[0];
    const now = new Date();
    const trialEnd = new Date(company.trial_ends_at);
    const msLeft = trialEnd - now;
    const hoursLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
    const daysLeft = Math.floor(hoursLeft / 24);
    const isExpired = company.plan === 'trial' && msLeft <= 0;
    
    res.json({ ...company, hoursLeft, daysLeft, isExpired });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const updateCompany = async (req, res) => {
  try {
    const { companyId, role } = req.user;
    if (role !== 'admin') return res.status(403).json({ error: 'Only admin' });
    
    const { name, industry, logo_url, website, phone, address } = req.body;
    const result = await pool.query(
      `UPDATE companies SET name=$1, industry=$2, logo_url=$3, website=$4, phone=$5, address=$6 
       WHERE id=$7 RETURNING *`,
      [name, industry, logo_url, website, phone, address, companyId]
    );
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const loadDemoData = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    
    const existing = await pool.query('SELECT COUNT(*) FROM leads WHERE company_id=$1', [companyId]);
    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Data already exists. Reset first.' });
    }
    
    const customers = [
      { name: 'Anar Hasanov', email: 'anar@techaz.com', phone: '+994501234567', company: 'TechAz LLC', type: 'company' },
      { name: 'Leyla Mammadova', email: 'leyla@gmail.com', phone: '+994702345678', type: 'individual' },
      { name: 'Rashad Aliyev', email: 'rashad@bakubuild.az', phone: '+994553456789', company: 'Baku Build', type: 'company' },
      { name: 'Nigar Aliyeva', email: 'nigar@style.az', phone: '+994504567890', company: 'Style Boutique', type: 'company' },
      { name: 'Elvin Karimov', email: 'elvin@gmail.com', phone: '+994555678901', type: 'individual' },
    ];
    
    for (const c of customers) {
      await pool.query(
        `INSERT INTO customers (company_id, name, email, phone, company, type) VALUES ($1,$2,$3,$4,$5,$6)`,
        [companyId, c.name, c.email, c.phone, c.company || '', c.type]
      );
    }
    
    const leads = [
      { name: 'Anar Hasanov', company: 'TechAz LLC', email: 'anar@techaz.com', phone: '+994501234567', stage: 'qualified', value: 5000, source: 'whatsapp', notes: 'Interested in CRM software' },
      { name: 'Leyla Mammadova', company: '', email: 'leyla@gmail.com', phone: '+994702345678', stage: 'new', value: 1500, source: 'instagram', notes: 'Wants website redesign' },
      { name: 'Rashad Aliyev', company: 'Baku Build', email: 'rashad@bakubuild.az', phone: '+994553456789', stage: 'proposal', value: 12000, source: 'facebook', notes: 'Needs construction CRM' },
      { name: 'Nigar Aliyeva', company: 'Style Boutique', email: 'nigar@style.az', phone: '+994504567890', stage: 'won', value: 8500, source: 'instagram', notes: 'Closed deal' },
      { name: 'Elvin Karimov', company: '', email: 'elvin@gmail.com', phone: '+994555678901', stage: 'contacted', value: 3000, source: 'email', notes: 'Email marketing campaign' },
      { name: 'Aysel Hajiyeva', company: 'Hajiyeva Co', email: 'aysel@hco.az', phone: '+994559876543', stage: 'negotiation', value: 18000, source: 'linkedin', notes: 'Enterprise deal' },
      { name: 'Vusal Quliyev', company: '', email: 'vusal@gmail.com', phone: '+994771112233', stage: 'new', value: 2500, source: 'website', notes: 'Form submission' },
    ];
    
    for (const l of leads) {
      await pool.query(
        `INSERT INTO leads (company_id, name, company, email, phone, stage, value, source, notes, assigned_to) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [companyId, l.name, l.company, l.email, l.phone, l.stage, l.value, l.source, l.notes, userId]
      );
    }
    
    const products = [
      { name: 'CRM Software License', price: 1200, sku: 'CRM-001', category: 'Software', unit: 'license' },
      { name: 'Implementation Service', price: 2500, sku: 'SVC-001', category: 'Service', unit: 'project' },
      { name: 'Training Session', price: 350, sku: 'TRN-001', category: 'Service', unit: 'hour' },
      { name: 'Custom Integration', price: 5000, sku: 'INT-001', category: 'Service', unit: 'project' },
      { name: 'Monthly Support', price: 200, sku: 'SUP-001', category: 'Service', unit: 'month' },
    ];
    
    for (const p of products) {
      await pool.query(
        `INSERT INTO products (company_id, name, price, currency, sku, category, unit) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [companyId, p.name, p.price, 'AZN', p.sku, p.category, p.unit]
      );
    }
    
    res.json({ success: true, message: 'Demo data loaded' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const resetData = async (req, res) => {
  try {
    const { companyId, role } = req.user;
    if (role !== 'admin') return res.status(403).json({ error: 'Only admin' });
    
    await pool.query('DELETE FROM activities WHERE lead_id IN (SELECT id FROM leads WHERE company_id=$1)', [companyId]);
    await pool.query('DELETE FROM quotations WHERE lead_id IN (SELECT id FROM leads WHERE company_id=$1)', [companyId]);
    await pool.query('DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE company_id=$1)', [companyId]);
    await pool.query('DELETE FROM conversations WHERE company_id=$1', [companyId]);
    await pool.query('DELETE FROM leads WHERE company_id=$1', [companyId]);
    await pool.query('DELETE FROM customers WHERE company_id=$1', [companyId]);
    await pool.query('DELETE FROM products WHERE company_id=$1', [companyId]);
    
    res.json({ success: true, message: 'All data reset' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getCompany, updateCompany, loadDemoData, resetData };
