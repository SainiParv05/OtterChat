/**
 * MESSAGING MODULE - Message Service (Dev 2)
 * High-level API for frontend integration
 */
const { sendMessage } = require('./sendMessage');
const { receiveMessages } = require('./receiveMessages');
const { addMessage, getMessagesWithUser, getAllMessages } = require('./messageStore');

const subscribers = [];

const messageService = {
  /**
   * send(recipientId, plaintextMsg, userContext)
   */
  async send(recipientId, plaintextMsg, userContext) {
    const result = await sendMessage(recipientId, plaintextMsg, userContext);
    const msg = {
      msgId: result.msgId,
      senderId: userContext.userId,
      recipientId,
      plaintext: plaintextMsg,
      timestamp: Date.now(),
    };
    addMessage(msg);
    subscribers.forEach((cb) => cb(msg));
    return result;
  },

  /**
   * getMessages(userId)
   */
  getMessages(userId) {
    return getMessagesWithUser(userId);
  },

  /**
   * fetchAndDecrypt(userId, userContext)
   * Pulls from server, decrypts, stores locally
   */
  async fetchAndDecrypt(userId, userContext) {
    const messages = await receiveMessages(userId, userContext);
    messages.forEach(addMessage);
    return messages;
  },

  /**
   * subscribe(callback)
   * Frontend subscribes to new messages
   */
  subscribe(callback) {
    subscribers.push(callback);
    return () => {
      const idx = subscribers.indexOf(callback);
      if (idx > -1) subscribers.splice(idx, 1);
    };
  },

  getAllMessages,
};

module.exports = messageService;
