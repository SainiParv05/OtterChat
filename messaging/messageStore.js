/**
 * MESSAGING MODULE - Message Store (Dev 2)
 * Simple in-memory store for decrypted messages
 */

const store = [];

function addMessage(msg) {
  store.push(msg);
}

function getMessagesWithUser(userId) {
  return store.filter(
    (m) => m.senderId === userId || m.recipientId === userId
  );
}

function getAllMessages() {
  return [...store];
}

function clear() {
  store.length = 0;
}

module.exports = { addMessage, getMessagesWithUser, getAllMessages, clear };
