/**
 * BACKEND MODULE - User Model (Dev 4)
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  userPubKey: { type: String, required: true }, // base64 X25519 public key
  sigPubKey: { type: String },                  // base64 Ed25519 signing public key
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
