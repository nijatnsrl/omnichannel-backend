const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.post('/message', async (req, res) => {
  try {
    const { visitorId, conversationId, message, url, title } = req.body;

    // Find or create customer for this visitor
    let customer = await pool.query(
      'SELECT * FROM customers WHERE email = $1 LIMIT 1',
      [`widget_${visitorId}@bagcrm.widget`]
    );

    if (customer.rows.length === 0) {
      customer = await pool.query(
        'INSERT INTO customers (name, email, company_id) VALUES ($1, $2, 1) RETURNING *',
        [`Website Visitor ${visitorId.substring(0,6)}`, `widget_${visitorId}@bagcrm.widget`]
      );
    }

    const customerId = customer.rows[0].id;

    // Find or create conversation
    let conv;
    if (conversationId) {
      conv = await pool.query('SELECT * FROM conversations WHERE id = $1 LIMIT 1', [conversationId]);
      conv = { rows: [conv.rows[0]] };
    }

    if (!conv || !conv.rows[0]) {
      conv = await pool.query(
        'INSERT INTO conversations (customer_id, channel, status, company_id) VALUES ($1, $2, $3, 1) RETURNING *',
        [customerId, 'website', 'open']
      );
    }

    const convId = conv.rows[0].id;

    // Save message
    await pool.query(
      'INSERT INTO messages (conversation_id, sender_type, content, channel) VALUES ($1, $2, $3, $4)',
      [convId, 'customer', message, 'website']
    );

    await pool.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [convId]);

    res.json({
      conversationId: convId,
      reply: 'Mesajınız alındı! Komandamız tezliklə sizinlə əlaqə saxlayacaq. 🙏'
    });
  } catch (error) {
    console.error('Widget error:', error);
    res.json({ reply: 'Mesajınız göndərildi!' });
  }
});

module.exports = router;
