/**
 * BACKEND MODULE - OneView Enforcement Service (Dev 4)
 * Server-side check: has this file been opened by this user?
 * Reads log flags stored in DB — never decrypts anything.
 */
const Log = require('../models/Log');

/**
 * checkIfOpened(fileId, userId)
 * → boolean
 * Scans log entries for FILE_OPENED event for this fileId + userId
 */
async function checkIfOpened(fileId, userId) {
  const logDoc = await Log.findOne({ userId });
  if (!logDoc) return false;

  return logDoc.encryptedLogEntries.some(
    (entry) => entry.eventType === 'FILE_OPENED' && entry.fileId === fileId
  );
}

module.exports = { checkIfOpened };
