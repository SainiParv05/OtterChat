/**
 * BACKEND MODULE - Log Controller (Dev 4)
 * Stores encrypted log entries and syncs them
 * Server never decrypts log payloads
 */
const Log = require('../models/Log');
const { success, error } = require('../utils/response');

async function appendLog(req, res) {
  try {
    const { logEntry } = req.body;
    if (!logEntry || !logEntry.userId || !logEntry.logId) {
      return error(res, 'Invalid log entry');
    }

    let logDoc = await Log.findOne({ userId: logEntry.userId });
    if (!logDoc) {
      logDoc = await Log.create({ userId: logEntry.userId, encryptedLogEntries: [] });
    }

    // Avoid duplicate log entries
    const exists = logDoc.encryptedLogEntries.some((e) => e.logId === logEntry.logId);
    if (!exists) {
      logDoc.encryptedLogEntries.push(logEntry);
      logDoc.updatedAt = new Date();
      await logDoc.save();
    }

    return success(res, { logId: logEntry.logId }, 201);
  } catch (err) {
    return error(res, err.message);
  }
}

async function syncLogs(req, res) {
  try {
    const { userId } = req.query;
    if (!userId) return error(res, 'userId query param required');

    const logDoc = await Log.findOne({ userId });
    const logs = logDoc ? logDoc.encryptedLogEntries : [];
    return success(res, { logs });
  } catch (err) {
    return error(res, err.message);
  }
}

module.exports = { appendLog, syncLogs };
