const { pool } = require('../config/db');

const getProducts = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      'SELECT * FROM products WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, description, price, currency, sku, stock, category, unit } = req.body;
    const result = await pool.query(
      `INSERT INTO products (company_id, name, description, price, currency, sku, stock, category, unit)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [companyId, name, description, price, currency || 'AZN', sku, stock || 0, category, unit || 'ədəd']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { name, description, price, currency, sku, stock, category, unit } = req.body;
    const result = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3, currency=$4, sku=$5, stock=$6, category=$7, unit=$8, updated_at=CURRENT_TIMESTAMP
       WHERE id=$9 AND company_id=$10 RETURNING *`,
      [name, description, price, currency, sku, stock, category, unit, id, companyId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1 AND company_id = $2', [id, companyId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getProducts, createProduct, updateProduct, deleteProduct };
