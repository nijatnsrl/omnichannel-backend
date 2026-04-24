const { pool } = require('../config/db');

const getBookings = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { from, to, customerId } = req.query;
    
    let query = `
      SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
             u.name as assigned_name
      FROM bookings b
      LEFT JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u ON b.assigned_to = u.id
      WHERE b.company_id = $1
    `;
    const params = [companyId];
    
    if (from) {
      params.push(from);
      query += ` AND b.start_time >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND b.start_time <= $${params.length}`;
    }
    if (customerId) {
      params.push(customerId);
      query += ` AND b.customer_id = $${params.length}`;
    }
    
    query += ' ORDER BY b.start_time ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const createBooking = async (req, res) => {
  try {
    const { companyId, userId } = req.user;
    const { customerId, leadId, title, description, type, startTime, endTime, durationMinutes, location, assignedTo, price, currency, notes } = req.body;
    
    if (!title || !startTime) {
      return res.status(400).json({ error: 'Title and startTime are required' });
    }
    
    const calculatedEnd = endTime || new Date(new Date(startTime).getTime() + (durationMinutes || 60) * 60000);
    
    const result = await pool.query(
      `INSERT INTO bookings 
       (company_id, customer_id, lead_id, title, description, type, start_time, end_time, duration_minutes, location, assigned_to, price, currency, notes, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'scheduled') RETURNING *`,
      [companyId, customerId || null, leadId || null, title, description || '', type || 'appointment', startTime, calculatedEnd, durationMinutes || 60, location || '', assignedTo || userId, price || null, currency || 'AZN', notes || '', userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const updateBooking = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { title, description, type, startTime, endTime, durationMinutes, location, assignedTo, status, price, notes } = req.body;
    
    const result = await pool.query(
      `UPDATE bookings SET 
       title=COALESCE($1,title), description=COALESCE($2,description), type=COALESCE($3,type),
       start_time=COALESCE($4,start_time), end_time=COALESCE($5,end_time), duration_minutes=COALESCE($6,duration_minutes),
       location=COALESCE($7,location), assigned_to=COALESCE($8,assigned_to), status=COALESCE($9,status),
       price=COALESCE($10,price), notes=COALESCE($11,notes), updated_at=CURRENT_TIMESTAMP
       WHERE id=$12 AND company_id=$13 RETURNING *`,
      [title, description, type, startTime, endTime, durationMinutes, location, assignedTo, status, price, notes, id, companyId]
    );
    
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    await pool.query('DELETE FROM bookings WHERE id=$1 AND company_id=$2', [id, companyId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getUpcoming = async (req, res) => {
  try {
    const { companyId } = req.user;
    const result = await pool.query(
      `SELECT b.*, c.name as customer_name, c.phone as customer_phone
       FROM bookings b
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE b.company_id = $1 
       AND b.start_time >= NOW() 
       AND b.start_time <= NOW() + INTERVAL '7 days'
       AND b.status = 'scheduled'
       ORDER BY b.start_time ASC LIMIT 20`,
      [companyId]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getReminders = async (req, res) => {
  try {
    const { companyId } = req.user;
    // Bookings starting in next 24h that haven't been reminded
    const result = await pool.query(
      `SELECT b.*, c.name as customer_name, c.phone as customer_phone
       FROM bookings b
       LEFT JOIN customers c ON b.customer_id = c.id
       WHERE b.company_id = $1 
       AND b.start_time BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
       AND b.status = 'scheduled'
       AND b.reminder_sent = FALSE
       ORDER BY b.start_time ASC`,
      [companyId]
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const markReminderSent = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    await pool.query('UPDATE bookings SET reminder_sent=TRUE WHERE id=$1 AND company_id=$2', [id, companyId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = { getBookings, createBooking, updateBooking, deleteBooking, getUpcoming, getReminders, markReminderSent };
