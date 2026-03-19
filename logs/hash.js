/**
 * LOGS MODULE - Hash Chain (Dev 5)
 * SHA-256 based hash chaining for tamper detection
 */
const crypto = require('crypto');

/**
 * computeHash(logEntry)
 * → currentHash (hex string)
 * Hash includes: logId, eventType, fileId/msgId, timestamp, prevHash
 */
function computeHash(logEntry) {
  const payload = JSON.stringify({
    logId: logEntry.logId,
    eventType: logEntry.eventType,
    fileId: logEntry.fileId || null,
    msgId: logEntry.msgId || null,
    timestamp: logEntry.timestamp,
    prevHash: logEntry.prevHash,
    payloadEncrypted: logEntry.payloadEncrypted,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

module.exports = { computeHash, GENESIS_HASH };
