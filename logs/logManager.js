/**
 * LOGS MODULE - Log Manager (Dev 5)
 * Core append-only log with hash chaining
 */
const { v4: uuidv4 } = require('uuid');
const { computeHash, GENESIS_HASH } = require('./hash');
const { validateLogEntry } = require('./schema');
const { encryptPayload, decryptPayload } = require('./utils');
const { signLogEntry } = require('../crypto/sign');

// In-memory log store (backed by server sync)
const logStore = new Map(); // userId → logEntry[]

/**
 * appendLog(eventType, id, metadata, userContext)
 * → logEntry
 * userContext: { userId, userPrivKey }
 */
async function appendLog(eventType, id, metadata, userContext) {
  const { userId, userPrivKey } = userContext;

  // Get existing chain for this user
  const existingLogs = logStore.get(userId) || [];

  // Get previous hash
  const prevHash = existingLogs.length > 0
    ? existingLogs[existingLogs.length - 1].currentHash
    : GENESIS_HASH;

  // Build payload (before encryption)
  const rawPayload = {
    eventType,
    fileId: metadata?.fileId || null,
    msgId: metadata?.msgId || null,
    ...metadata,
  };

  // Encrypt payload
  const payloadEncrypted = encryptPayload(rawPayload, userPrivKey);

  const logId = uuidv4();
  const timestamp = Date.now();

  // Partial entry for hashing
  const partialEntry = {
    logId,
    userId,
    eventType,
    fileId: rawPayload.fileId,
    msgId: rawPayload.msgId || (id && eventType.includes('MESSAGE') ? id : null),
    timestamp,
    prevHash,
    payloadEncrypted,
  };

  // Set fileId/msgId based on event
  if (eventType.includes('FILE')) {
    partialEntry.fileId = id;
    partialEntry.msgId = null;
  } else if (eventType.includes('MESSAGE')) {
    partialEntry.msgId = id;
    partialEntry.fileId = null;
  }

  // Compute current hash
  const currentHash = computeHash(partialEntry);
  const logEntry = { ...partialEntry, currentHash };

  // Sign entry if privKey provided
  if (userPrivKey) {
    const sig = signLogEntry(JSON.stringify(logEntry), userPrivKey);
    logEntry.signature = Buffer.from(sig).toString('base64');
  }

  validateLogEntry(logEntry);

  // Append to local store
  if (!logStore.has(userId)) logStore.set(userId, []);
  logStore.get(userId).push(logEntry);

  return logEntry;
}

/**
 * getLogsForUser(userId)
 * → logEntry[]
 */
function getLogsForUser(userId) {
  return logStore.get(userId) || [];
}

/**
 * setLogsForUser(userId, entries)
 */
function setLogsForUser(userId, entries) {
  logStore.set(userId, entries);
}

/**
 * clearLogsForUser(userId) - for testing
 */
function clearLogsForUser(userId) {
  logStore.delete(userId);
}

module.exports = { appendLog, getLogsForUser, setLogsForUser, clearLogsForUser };
