const express = require('express');
const { uploadFile, downloadFile, requestKey } = require('../controllers/FileController');
const { authMiddleware } = require('../utils/authMiddleware');
const router = express.Router();

router.post('/upload', authMiddleware, uploadFile);
router.get('/download/:fileId', authMiddleware, downloadFile);
router.post('/request-key', authMiddleware, requestKey);

module.exports = router;
