/**
 * LOGS MODULE - Public API (Dev 5)
 */
const { appendLog, getLogsForUser, setLogsForUser, clearLogsForUser } = require('./logManager');
const { computeHash, GENESIS_HASH } = require('./hash');
const { verifyLogChain, detectTampering } = require('./verify');
const { hasFileOpened } = require('./oneView');
const { syncLogsWithServer } = require('./sync');
const { encryptPayload, decryptPayload } = require('./utils');
const { EVENT_TYPES, validateLogEntry } = require('./schema');

module.exports = {
  appendLog,
  computeHash,
  verifyLogChain,
  detectTampering,
  hasFileOpened,
  syncLogsWithServer,
  encryptPayload,
  decryptPayload,
  getLogsForUser,
  setLogsForUser,
  clearLogsForUser,
  EVENT_TYPES,
  validateLogEntry,
  GENESIS_HASH,
};
