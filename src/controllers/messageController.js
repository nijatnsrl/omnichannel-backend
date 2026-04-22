const { pool } = require('../config/db');

const getConversations = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        cu.name as customer_name,
        cu.email as customer_email,
        u.name as agent_name,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM conversations c
      LEFT JOIN customers cu ON c.customer_id = cu.id
      LEFT JOIN users u ON c.assigned_to = u.id
      ORDER BY c.updated_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = await pool.query(`
      SELECT m.*, u.name as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id AND m.sender_type = 'agent'
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
    `, [conversationId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, channel } = req.body;
    const userId = req.user.userId;

    const result = await pool.query(`
      INSERT INTO messages (conversation_id, sender_type, sender_id, content, channel)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [conversationId, 'agent', userId, content, channel]);

    await pool.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

module.exports = { getConversations, getMessages, sendMessage };
