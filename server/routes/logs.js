const express = require('express');
const { appendLog, syncLogs } = require('../controllers/LogController');
const { authMiddleware } = require('../utils/authMiddleware');
const router = express.Router();

router.post('/append', authMiddleware, appendLog);
router.get('/sync', authMiddleware, syncLogs);

module.exports = router;
