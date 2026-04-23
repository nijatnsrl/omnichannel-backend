const { pool } = require('../config/db');

const exportLeads = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query('SELECT * FROM leads WHERE company_id=$1 ORDER BY created_at DESC', [companyId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const importLeads = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { leads } = req.body;
    if (!Array.isArray(leads)) return res.status(400).json({ error: 'leads must be array' });
    let imported = 0, failed = 0;
    for (const l of leads) {
      try {
        await pool.query(
          `INSERT INTO leads (company_id, name, company, email, phone, stage, value, source, notes, assigned_to)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [companyId, l.name||'Untitled', l.company||'', l.email||'', l.phone||'', l.stage||'new', parseFloat(l.value)||0, l.source||'import', l.notes||'', userId]
        );
        imported++;
      } catch (e) { failed++; }
    }
    res.json({ imported, failed, total: leads.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const exportCustomers = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query('SELECT * FROM customers WHERE company_id=$1 ORDER BY created_at DESC', [companyId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const importCustomers = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { customers } = req.body;
    let imported = 0, failed = 0;
    for (const c of customers) {
      try {
        await pool.query(
          `INSERT INTO customers (company_id, name, email, phone, company, type, address, tax_id, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [companyId, c.name||'Untitled', c.email||'', c.phone||'', c.company||'', c.type||'individual', c.address||'', c.tax_id||'', c.notes||'']
        );
        imported++;
      } catch (e) { failed++; }
    }
    res.json({ imported, failed, total: customers.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const exportProducts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query('SELECT * FROM products WHERE company_id=$1 ORDER BY created_at DESC', [companyId]);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const importProducts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { products } = req.body;
    let imported = 0, failed = 0;
    for (const p of products) {
      try {
        await pool.query(
          `INSERT INTO products (company_id, name, description, price, currency, sku, stock, category, unit)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [companyId, p.name||'Untitled', p.description||'', parseFloat(p.price)||0, p.currency||'AZN', p.sku||'', parseInt(p.stock)||0, p.category||'', p.unit||'ədəd']
        );
        imported++;
      } catch (e) { failed++; }
    }
    res.json({ imported, failed, total: products.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { exportLeads, importLeads, exportCustomers, importCustomers, exportProducts, importProducts };
