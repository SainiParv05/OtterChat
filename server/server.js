/**
 * BACKEND MODULE - P2P Tor Node Entry Point
 * Express. Zero-knowledge: never decrypts data.
 * Purely in-memory P2P session management.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const p2pRoutes = require('./p2p/routes');

const app = express();
app.set('trust proxy', 1);

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

// P2P Routes
app.use('/p2p', p2pRoutes);

// Mock auth so frontend can "login" to the P2P node
app.post('/auth/login', (req, res) => res.json({ token: 'mock-token', userId: req.body.username || 'user-' + Date.now(), publicKey: 'mock-pk' }));
app.post('/auth/register', (req, res) => res.json({ token: 'mock-token', userId: req.body.username || 'user-' + Date.now(), publicKey: 'mock-pk' }));
app.use('/message', (req, res) => res.json({}));
app.use('/file', (req, res) => res.json({}));
app.use('/log', (req, res) => res.json({}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'OtterChat P2P Backend', timestamp: Date.now() });
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
  app.listen(PORT, () => {
    console.log(`[SERVER] OtterChat P2P Node running on port ${PORT}`);
    console.log(`[SERVER] Purely ephemeral, Tor-based P2P mode`);
  });
}

if (require.main === module) {
  start().catch(console.error);
}

module.exports = app;
