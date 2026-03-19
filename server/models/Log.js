/**
 * BACKEND MODULE - Log Model (Dev 4)
 * Stores encrypted log entries — opaque blobs
 */
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  encryptedLogEntries: [
    {
      logId: String,
      eventType: String,
      fileId: { type: String, default: null },
      msgId: { type: String, default: null },
      timestamp: Number,
      prevHash: String,
      currentHash: String,
      payloadEncrypted: String,
      signature: String,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Log', logSchema);
