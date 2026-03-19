/**
 * BACKEND MODULE - File Model (Dev 4)
 * Stores encrypted chunks and metadata only
 */
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileId: { type: String, required: true, unique: true },
  metadata: {
    senderId: String,
    recipientId: String,
    fileName: String,
    fileSize: Number,
    mediaType: String,
    policy: String,
    wrappedFK: String, // base64 — wrapped file key (server never decrypts)
    chunkCount: Number,
  },
  encryptedChunks: [
    {
      ct: String,         // base64
      nonce: String,      // base64
      chunkIndex: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('File', fileSchema);
