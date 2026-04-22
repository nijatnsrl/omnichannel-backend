const { pool } = require('../config/db');

// Verify webhook (required by Meta)
const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'bagcrm_webhook_token';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Verification failed' });
  }
};

// Handle incoming messages
const handleWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const value = change.value;
            
            for (const message of value.messages || []) {
              await processWhatsAppMessage(message, value.metadata);
            }
          }
        }
      }
    }

    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          if (messaging.message) {
            await processInstagramMessage(messaging);
          }
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

const processWhatsAppMessage = async (message, metadata) => {
  try {
    const phoneNumber = message.from;
    const text = message.text?.body || '[Media message]';
    const waId = metadata?.phone_number_id;

    // Find or create customer
    let customer = await pool.query(
      'SELECT * FROM customers WHERE phone = $1 LIMIT 1',
      [phoneNumber]
    );

    if (customer.rows.length === 0) {
      customer = await pool.query(
        'INSERT INTO customers (name, phone, company_id) VALUES ($1, $2, 1) RETURNING *',
        [`WhatsApp ${phoneNumber}`, phoneNumber]
      );
    } else {
      customer = { rows: [customer.rows[0]] };
    }

    const customerId = customer.rows[0].id;

    // Find or create conversation
    let conversation = await pool.query(
      'SELECT * FROM conversations WHERE customer_id = $1 AND channel = $2 AND status = $3 LIMIT 1',
      [customerId, 'whatsapp', 'open']
    );

    if (conversation.rows.length === 0) {
      conversation = await pool.query(
        'INSERT INTO conversations (customer_id, channel, status, company_id) VALUES ($1, $2, $3, 1) RETURNING *',
        [customerId, 'whatsapp', 'open']
      );
    } else {
      conversation = { rows: [conversation.rows[0]] };
    }

    const conversationId = conversation.rows[0].id;

    // Save message
    await pool.query(
      'INSERT INTO messages (conversation_id, sender_type, content, channel) VALUES ($1, $2, $3, $4)',
      [conversationId, 'customer', text, 'whatsapp']
    );

    // Update conversation timestamp
    await pool.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    console.log(`✅ WhatsApp message saved from ${phoneNumber}: ${text}`);
  } catch (error) {
    console.error('Process WhatsApp error:', error);
  }
};

const processInstagramMessage = async (messaging) => {
  try {
    const senderId = messaging.sender.id;
    const text = messaging.message?.text || '[Media message]';

    // Find or create customer
    let customer = await pool.query(
      'SELECT * FROM customers WHERE instagram = $1 LIMIT 1',
      [senderId]
    );

    if (customer.rows.length === 0) {
      customer = await pool.query(
        'INSERT INTO customers (name, instagram, company_id) VALUES ($1, $2, 1) RETURNING *',
        [`Instagram ${senderId}`, senderId]
      );
    } else {
      customer = { rows: [customer.rows[0]] };
    }

    const customerId = customer.rows[0].id;

    // Find or create conversation
    let conversation = await pool.query(
      'SELECT * FROM conversations WHERE customer_id = $1 AND channel = $2 AND status = $3 LIMIT 1',
      [customerId, 'instagram', 'open']
    );

    if (conversation.rows.length === 0) {
      conversation = await pool.query(
        'INSERT INTO conversations (customer_id, channel, status, company_id) VALUES ($1, $2, $3, 1) RETURNING *',
        [customerId, 'instagram', 'open']
      );
    } else {
      conversation = { rows: [conversation.rows[0]] };
    }

    // Save message
    await pool.query(
      'INSERT INTO messages (conversation_id, sender_type, content, channel) VALUES ($1, $2, $3, $4)',
      [conversation.rows[0].id, 'customer', text, 'instagram']
    );

    await pool.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversation.rows[0].id]
    );

    console.log(`✅ Instagram message saved from ${senderId}: ${text}`);
  } catch (error) {
    console.error('Process Instagram error:', error);
  }
};

module.exports = { verifyWebhook, handleWebhook };
