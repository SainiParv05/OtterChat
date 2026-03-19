/**
 * LOGS MODULE - OneView Enforcement (Dev 5)
 * Checks if a file has already been opened (view-once policy)
 */
const { getLogsForUser } = require('./logManager');

/**
 * hasFileOpened(userId, fileId)
 * → boolean
 * Returns true if FILE_OPENED event exists in the log chain for this file
 */
function hasFileOpened(userId, fileId) {
  const logs = getLogsForUser(userId);
  return logs.some(
    (entry) => entry.eventType === 'FILE_OPENED' && entry.fileId === fileId
  );
}

module.exports = { hasFileOpened };
