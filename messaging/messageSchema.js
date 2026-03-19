/**
 * MESSAGING MODULE - Message Schema (Dev 2)
 * The ONLY valid shape of an encrypted message
 */

/**
 * {
 *   msgId: "<uuid>",
 *   senderId: "<userId>",
 *   recipientId: "<userId>",
 *   ciphertext: "<base64>",
 *   nonce: "<base64>",
 *   timestamp: "<unix_ms>"
 * }
 */

function createMessageSchema({ msgId, senderId, recipientId, ciphertext, nonce, timestamp }) {
  if (!msgId || !senderId || !recipientId || !ciphertext || !nonce) {
    throw new Error('Invalid message schema: missing required fields');
  }
  if (senderId === recipientId) {
    throw new Error('senderId and recipientId must be different');
  }
  return {
    msgId,
    senderId,
    recipientId,
    ciphertext: Buffer.isBuffer(ciphertext) ? ciphertext.toString('base64') : ciphertext,
    nonce: Buffer.isBuffer(nonce) ? nonce.toString('base64') : nonce,
    timestamp: timestamp || Date.now(),
  };
}

function validateMessage(msg) {
  const required = ['msgId', 'senderId', 'recipientId', 'ciphertext', 'nonce', 'timestamp'];
  for (const field of required) {
    if (!msg[field]) throw new Error(`Missing field: ${field}`);
  }
  // No plaintext fields allowed
  if (msg.plaintext || msg.content || msg.text || msg.body) {
    throw new Error('Message schema violation: plaintext field detected');
  }
  return true;
}

module.exports = { createMessageSchema, validateMessage };
