const { pool } = require('../config/db');

const getCustomers = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      'SELECT * FROM customers WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { name, email, phone } = req.body;
    const result = await pool.query(
      'INSERT INTO customers (company_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *',
      [companyId, name, email, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { name, email, phone } = req.body;
    const result = await pool.query(
      'UPDATE customers SET name=$1, email=$2, phone=$3 WHERE id=$4 AND company_id=$5 RETURNING *',
      [name, email, phone, id, companyId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    await pool.query('DELETE FROM customers WHERE id=$1 AND company_id=$2', [id, companyId]);
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

module.exports = { getCustomers, createCustomer, updateCustomer, deleteCustomer };
