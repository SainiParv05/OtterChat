/**
 * MESSAGING MODULE - Receive Messages (Dev 2)
 * Fetches and decrypts messages from the backend
 */
const axios = require('axios').default;
const { deriveSharedSecret } = require('../crypto/ecdh');
const { decryptSymmetric } = require('../crypto/symmetric');
const { appendLog } = require('../logs/logManager');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

/**
 * decryptMessage(ciphertext, nonce, senderPubKey, recipientPrivKey)
 * → plaintext string
 */
function decryptMessage(ciphertext, nonce, senderPubKey, recipientPrivKey) {
  const sharedSecret = deriveSharedSecret(recipientPrivKey, senderPubKey);
  const ctBuf = Buffer.isBuffer(ciphertext) ? ciphertext : Buffer.from(ciphertext, 'base64');
  const nonceBuf = Buffer.isBuffer(nonce) ? nonce : Buffer.from(nonce, 'base64');
  const plaintext = decryptSymmetric(ctBuf, nonceBuf, sharedSecret);
  return plaintext.toString('utf8');
}

/**
 * receiveMessages(userId, userContext)
 * → array of { msgId, senderId, plaintext, timestamp }
 * userContext: { userPrivKey, getSenderPubKey(senderId), token }
 */
async function receiveMessages(userId, userContext) {
  const { userPrivKey, getSenderPubKey, token } = userContext;

  const res = await axios.get(`${SERVER_URL}/message/fetch`, {
    params: { userId },
    headers: { Authorization: `Bearer ${token}` },
  });

  const encMessages = res.data.messages || [];
  const decrypted = [];

  for (const encMsg of encMessages) {
    const senderPubKey = await getSenderPubKey(encMsg.senderId);
    const plaintext = decryptMessage(
      encMsg.ciphertext,
      encMsg.nonce,
      senderPubKey,
      userPrivKey
    );

    await appendLog('MESSAGE_RECEIVED', encMsg.msgId, { senderId: encMsg.senderId }, {
      userId,
      userPrivKey,
    });

    decrypted.push({
      msgId: encMsg.msgId,
      senderId: encMsg.senderId,
      plaintext,
      timestamp: encMsg.timestamp,
    });
  }

  return decrypted;
}

module.exports = { decryptMessage, receiveMessages };
