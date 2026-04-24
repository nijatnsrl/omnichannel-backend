const { pool } = require('../config/db');

const getPhotos = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { customerId, leadId, bookingId, category } = req.query;
    let query = 'SELECT * FROM photos WHERE company_id = $1';
    const params = [companyId];
    if (customerId) { params.push(customerId); query += ` AND customer_id = $${params.length}`; }
    if (leadId) { params.push(leadId); query += ` AND lead_id = $${params.length}`; }
    if (bookingId) { params.push(bookingId); query += ` AND booking_id = $${params.length}`; }
    if (category) { params.push(category); query += ` AND category = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const addPhoto = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { customerId, leadId, bookingId, url, caption, category } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const result = await pool.query(
      `INSERT INTO photos (company_id, customer_id, lead_id, booking_id, url, caption, category, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [companyId, customerId || null, leadId || null, bookingId || null, url, caption || '', category || 'general', userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
};

const deletePhoto = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    await pool.query('DELETE FROM photos WHERE id=$1 AND company_id=$2', [id, companyId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
};

module.exports = { getPhotos, addPhoto, deletePhoto };
