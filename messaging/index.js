/**
 * MESSAGING MODULE - Public API (Dev 2)
 */
const { encryptMessage, sendMessage } = require('./sendMessage');
const { decryptMessage, receiveMessages } = require('./receiveMessages');
const { createMessageSchema, validateMessage } = require('./messageSchema');
const messageStore = require('./messageStore');
const messageService = require('./messageService');

module.exports = {
  encryptMessage,
  sendMessage,
  decryptMessage,
  receiveMessages,
  createMessageSchema,
  validateMessage,
  messageStore,
  messageService,
};
