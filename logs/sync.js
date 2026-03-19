/**
 * LOGS MODULE - Log Sync (Dev 5)
 * Merges local + server logs, keeps longest valid chain
 */
const axios = require('axios').default;
const { verifyLogChain } = require('./verify');
const { getLogsForUser, setLogsForUser } = require('./logManager');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

/**
 * syncLogsWithServer(userId, token)
 * → merges local + server logs, keeps longest valid chain
 */
async function syncLogsWithServer(userId, token) {
  const localLogs = getLogsForUser(userId);

  try {
    // Fetch server logs
    const res = await axios.get(`${SERVER_URL}/log/sync`, {
      params: { userId },
      headers: { Authorization: `Bearer ${token}` },
    });

    const serverLogs = res.data.logs || [];

    // Validate both chains
    const localValid = verifyLogChain(localLogs);
    const serverValid = verifyLogChain(serverLogs);

    let finalChain;

    if (!localValid && !serverValid) {
      console.error('[LOGS] Both chains invalid!');
      finalChain = [];
    } else if (!localValid) {
      finalChain = serverLogs;
    } else if (!serverValid) {
      finalChain = localLogs;
    } else {
      // Both valid — keep the longer chain
      finalChain = localLogs.length >= serverLogs.length ? localLogs : serverLogs;
    }

    setLogsForUser(userId, finalChain);

    // Push merged chain to server
    for (const entry of finalChain) {
      await axios.post(`${SERVER_URL}/log/append`, { logEntry: entry }, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {}); // best-effort sync
    }

    return finalChain;
  } catch (err) {
    console.error('[LOGS] Sync failed:', err.message);
    return localLogs;
  }
}

module.exports = { syncLogsWithServer };
