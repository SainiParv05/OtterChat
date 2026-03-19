/**
 * LOGS MODULE - Chain Verification (Dev 5)
 * Detects tampering, reordering, and gaps
 */
const { computeHash, GENESIS_HASH } = require('./hash');

/**
 * verifyLogChain(logEntries)
 * → boolean
 * Checks: hash validity, prevHash linking, no gaps, no tampering
 */
function verifyLogChain(logEntries) {
  if (!Array.isArray(logEntries) || logEntries.length === 0) return true;

  // Sort by timestamp to ensure order
  const sorted = [...logEntries].sort((a, b) => a.timestamp - b.timestamp);

  let expectedPrevHash = GENESIS_HASH;

  for (const entry of sorted) {
    // Verify prevHash links correctly
    if (entry.prevHash !== expectedPrevHash) {
      console.error(`[LOGS] Hash chain broken at logId=${entry.logId}. Expected prevHash=${expectedPrevHash}, got=${entry.prevHash}`);
      return false;
    }

    // Recompute hash and verify
    const recomputed = computeHash(entry);
    if (recomputed !== entry.currentHash) {
      console.error(`[LOGS] Tampered entry detected at logId=${entry.logId}. Expected hash=${recomputed}, got=${entry.currentHash}`);
      return false;
    }

    expectedPrevHash = entry.currentHash;
  }

  return true;
}

/**
 * detectTampering(logEntries)
 * → { tampered: boolean, details: string[] }
 */
function detectTampering(logEntries) {
  const details = [];
  if (!Array.isArray(logEntries) || logEntries.length === 0) {
    return { tampered: false, details };
  }

  const sorted = [...logEntries].sort((a, b) => a.timestamp - b.timestamp);
  let expectedPrevHash = GENESIS_HASH;

  for (const entry of sorted) {
    if (entry.prevHash !== expectedPrevHash) {
      details.push(`Chain break at logId=${entry.logId}`);
    }
    const recomputed = computeHash(entry);
    if (recomputed !== entry.currentHash) {
      details.push(`Tampered entry at logId=${entry.logId}`);
    }
    expectedPrevHash = entry.currentHash;
  }

  return { tampered: details.length > 0, details };
}

module.exports = { verifyLogChain, detectTampering };
