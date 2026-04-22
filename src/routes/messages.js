const express = require('express');
const { getConversations, getMessages, sendMessage } = require('../controllers/messageController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/send', sendMessage);

module.exports = router;
