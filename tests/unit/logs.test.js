/**
 * UNIT TESTS - Logs Module
 */
const { appendLog, verifyLogChain, detectTampering, hasFileOpened, computeHash, GENESIS_HASH, clearLogsForUser, getLogsForUser } = require('../../logs');
const { generateUserKeypair } = require('../../crypto/keygen');

const TEST_USER = 'test-user-logs-' + Date.now();

describe('Logs Module', () => {
  let keypair;

  beforeAll(() => {
    keypair = generateUserKeypair();
    clearLogsForUser(TEST_USER);
  });

  afterAll(() => {
    clearLogsForUser(TEST_USER);
  });

  test('appendLog() creates a valid log entry', async () => {
    const entry = await appendLog('MESSAGE_SENT', 'msg-1', { recipientId: 'user-2' }, {
      userId: TEST_USER,
      userPrivKey: keypair.priv,
    });
    expect(entry.logId).toBeDefined();
    expect(entry.eventType).toBe('MESSAGE_SENT');
    expect(entry.msgId).toBe('msg-1');
    expect(entry.prevHash).toBe(GENESIS_HASH);
    expect(entry.currentHash).toBeDefined();
    expect(entry.payloadEncrypted).toBeDefined();
  });

  test('hash chain links correctly (prevHash = previous currentHash)', async () => {
    const entry2 = await appendLog('MESSAGE_RECEIVED', 'msg-2', { senderId: 'user-1' }, {
      userId: TEST_USER,
      userPrivKey: keypair.priv,
    });
    const logs = getLogsForUser(TEST_USER);
    expect(logs.length).toBe(2);
    expect(entry2.prevHash).toBe(logs[0].currentHash);
  });

  test('verifyLogChain() passes on valid chain', async () => {
    const logs = getLogsForUser(TEST_USER);
    expect(verifyLogChain(logs)).toBe(true);
  });

  test('detectTampering() catches modified entry', async () => {
    const logs = getLogsForUser(TEST_USER);
    const tampered = JSON.parse(JSON.stringify(logs));
    tampered[0].eventType = 'FILE_OPENED'; // tamper
    tampered[0].currentHash = computeHash(tampered[0]); // recompute (but chain still broken)
    const { tampered: found } = detectTampering(tampered);
    // Chain break or hash mismatch must be detected
    expect(found || !verifyLogChain(tampered)).toBe(true);
  });

  test('hasFileOpened() returns false before FILE_OPENED log', () => {
    expect(hasFileOpened(TEST_USER, 'file-abc')).toBe(false);
  });

  test('hasFileOpened() returns true after FILE_OPENED log', async () => {
    await appendLog('FILE_OPENED', 'file-abc', {}, {
      userId: TEST_USER,
      userPrivKey: keypair.priv,
    });
    expect(hasFileOpened(TEST_USER, 'file-abc')).toBe(true);
  });

  test('verifyLogChain() detects gaps (missing entries)', () => {
    const logs = getLogsForUser(TEST_USER);
    const withGap = [logs[0], logs[2]]; // skip middle
    expect(verifyLogChain(withGap)).toBe(false);
  });

  test('verifyLogChain() on empty array returns true', () => {
    expect(verifyLogChain([])).toBe(true);
  });

  test('encryptPayload / decryptPayload round-trip', () => {
    const { encryptPayload, decryptPayload } = require('../../logs/utils');
    const data = { eventType: 'MESSAGE_SENT', recipientId: 'user-99' };
    const encrypted = encryptPayload(data, keypair.priv);
    const decrypted = decryptPayload(encrypted, keypair.priv);
    expect(decrypted.eventType).toBe('MESSAGE_SENT');
    expect(decrypted.recipientId).toBe('user-99');
  });
});
