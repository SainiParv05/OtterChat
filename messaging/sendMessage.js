/**
 * MESSAGING MODULE - Send Message (Dev 2)
 * Encrypts and sends a message to the backend
 */
const { v4: uuidv4 } = require('uuid');
const axios = require('axios').default;
const { deriveSharedSecret } = require('../crypto/ecdh');
const { encryptSymmetric } = require('../crypto/symmetric');
const { createMessageSchema } = require('./messageSchema');
const { appendLog } = require('../logs/logManager');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

/**
 * encryptMessage(plaintext, senderPrivKey, recipientPubKey)
 * → { ciphertext: Buffer, nonce: Buffer }
 */
function encryptMessage(plaintext, senderPrivKey, recipientPubKey) {
  const sharedSecret = deriveSharedSecret(senderPrivKey, recipientPubKey);
  const { ct, nonce } = encryptSymmetric(Buffer.from(plaintext), sharedSecret);
  return { ciphertext: ct, nonce };
}

/**
 * sendMessage(recipientId, plaintextMsg, userContext)
 * → posts encMsg to /message/send
 * userContext: { userId, userPrivKey, recipientPubKey, token }
 */
async function sendMessage(recipientId, plaintextMsg, userContext) {
  const { userId, userPrivKey, recipientPubKey, token } = userContext;

  const msgId = uuidv4();
  const { ciphertext, nonce } = encryptMessage(plaintextMsg, userPrivKey, recipientPubKey);

  const encMsg = createMessageSchema({
    msgId,
    senderId: userId,
    recipientId,
    ciphertext,
    nonce,
    timestamp: Date.now(),
  });

  // POST to backend
  const res = await axios.post(`${SERVER_URL}/message/send`, encMsg, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Append log
  await appendLog('MESSAGE_SENT', msgId, { recipientId }, { userId, userPrivKey });

  return { msgId, status: res.data };
}

module.exports = { encryptMessage, sendMessage };
