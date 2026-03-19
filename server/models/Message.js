/**
 * BACKEND MODULE - Message Model (Dev 4)
 * Stores ONLY encrypted blobs — never plaintext
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  msgId: { type: String, required: true, unique: true },
  senderId: { type: String, required: true },
  recipientId: { type: String, required: true },
  ciphertext: { type: String, required: true }, // base64 encrypted
  nonce: { type: String, required: true },       // base64 nonce
  timestamp: { type: Number, required: true },
});

module.exports = mongoose.model('Message', messageSchema);
