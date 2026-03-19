/**
 * BACKEND MODULE - Message Controller (Dev 4)
 * Stores and relays encrypted blobs — never decrypts
 */
const Message = require('../models/Message');
const { success, error } = require('../utils/response');
const { requireFields } = require('../utils/validator');

async function sendMessage(req, res) {
  try {
    requireFields(req.body, ['msgId', 'senderId', 'recipientId', 'ciphertext', 'nonce', 'timestamp']);
    const { msgId, senderId, recipientId, ciphertext, nonce, timestamp } = req.body;

    if (senderId === recipientId) {
      return error(res, 'senderId and recipientId must differ');
    }

    const msg = await Message.create({ msgId, senderId, recipientId, ciphertext, nonce, timestamp });
    return success(res, { msgId: msg.msgId }, 201);
  } catch (err) {
    if (err.code === 11000) return error(res, 'Duplicate message ID');
    return error(res, err.message);
  }
}

async function fetchMessages(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) return error(res, 'userId query param required');

    const messages = await Message.find({ recipientId: userId }).sort({ timestamp: 1 });
    return success(res, { messages });
  } catch (err) {
    return error(res, err.message);
  }
}

module.exports = { sendMessage, fetchMessages };
