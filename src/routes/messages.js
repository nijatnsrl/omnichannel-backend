const express = require('express');
const { getConversations, getMessages, sendMessage, createConversation } = require('../controllers/messageController');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/send', sendMessage);
router.post('/conversations', createConversation);

module.exports = router;
