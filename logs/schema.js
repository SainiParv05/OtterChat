/**
 * LOGS MODULE - Schema Definition (Dev 5)
 * Defines the ONLY valid log entry shape
 */

const EVENT_TYPES = {
  FILE_OPENED: 'FILE_OPENED',
  FILE_RECEIVED: 'FILE_RECEIVED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
};

/**
 * Log entry schema:
 * {
 *   logId: "<uuid>",
 *   userId: "<string>",
 *   eventType: "FILE_OPENED|FILE_RECEIVED|MESSAGE_SENT|MESSAGE_RECEIVED",
 *   fileId: "<string|null>",
 *   msgId: "<string|null>",
 *   timestamp: "<unix_ms>",
 *   prevHash: "<hex>",
 *   currentHash: "<hex>",
 *   payloadEncrypted: "<base64>"
 * }
 */
function validateLogEntry(entry) {
  const required = ['logId', 'userId', 'eventType', 'timestamp', 'prevHash', 'currentHash', 'payloadEncrypted'];
  for (const field of required) {
    if (entry[field] === undefined || entry[field] === null) {
      throw new Error(`Missing required log field: ${field}`);
    }
  }
  if (!Object.values(EVENT_TYPES).includes(entry.eventType)) {
    throw new Error(`Invalid eventType: ${entry.eventType}`);
  }
  return true;
}

module.exports = { EVENT_TYPES, validateLogEntry };
