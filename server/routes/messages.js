const express = require('express');
const { sendMessage, fetchMessages } = require('../controllers/MessageController');
const { authMiddleware } = require('../utils/authMiddleware');
const router = express.Router();

router.post('/send', authMiddleware, sendMessage);
router.get('/fetch', authMiddleware, fetchMessages);

module.exports = router;
