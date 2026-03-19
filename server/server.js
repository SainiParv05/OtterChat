/**
 * BACKEND MODULE - Server Entry Point (Dev 4)
 * Express + MongoDB. Zero-knowledge: never decrypts data.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/message', require('./routes/messages'));
app.use('/file', require('./routes/files'));
app.use('/log', require('./routes/logs'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'OtterChat Backend', timestamp: Date.now() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[SERVER] OtterChat backend running on port ${PORT}`);
    console.log(`[SERVER] Zero-knowledge mode: backend never sees plaintext`);
  });
}

if (require.main === module) {
  start().catch(console.error);
}

module.exports = app;
