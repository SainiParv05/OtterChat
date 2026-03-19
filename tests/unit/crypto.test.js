/**
 * UNIT TESTS - Crypto Module
 */
const crypto = require('../../crypto');

describe('Crypto Module', () => {
  let aliceKeypair, bobKeypair;

  beforeAll(() => {
    aliceKeypair = crypto.generateUserKeypair();
    bobKeypair = crypto.generateUserKeypair();
  });

  test('generateUserKeypair() returns pub + priv Uint8Arrays', () => {
    expect(aliceKeypair.pub).toBeInstanceOf(Uint8Array);
    expect(aliceKeypair.priv).toBeInstanceOf(Uint8Array);
    expect(aliceKeypair.pub.length).toBe(32);
    expect(aliceKeypair.priv.length).toBe(32);
  });

  test('deriveSharedSecret() is symmetric (Alice→Bob == Bob→Alice)', () => {
    const s1 = crypto.deriveSharedSecret(aliceKeypair.priv, bobKeypair.pub);
    const s2 = crypto.deriveSharedSecret(bobKeypair.priv, aliceKeypair.pub);
    expect(Buffer.from(s1).toString('hex')).toBe(Buffer.from(s2).toString('hex'));
  });

  test('encryptSymmetric → decryptSymmetric round-trip', () => {
    const key = crypto.generateFileKey();
    const plaintext = Buffer.from('Hello OtterChat!');
    const { ct, nonce } = crypto.encryptSymmetric(plaintext, key);
    const decrypted = crypto.decryptSymmetric(ct, nonce, key);
    expect(decrypted.toString()).toBe('Hello OtterChat!');
  });

  test('encryptSymmetric with 1MB data round-trips correctly', () => {
    const key = crypto.generateFileKey();
    const plaintext = Buffer.alloc(1024 * 1024, 0xab);
    const { ct, nonce } = crypto.encryptSymmetric(plaintext, key);
    const decrypted = crypto.decryptSymmetric(ct, nonce, key);
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  test('generateFileKey() returns 32 random bytes', () => {
    const fk1 = crypto.generateFileKey();
    const fk2 = crypto.generateFileKey();
    expect(fk1.length).toBe(32);
    expect(Buffer.from(fk1).toString('hex')).not.toBe(Buffer.from(fk2).toString('hex'));
  });

  test('wrapFileKey → unwrapFileKey recovers original key', () => {
    const fileKey = crypto.generateFileKey();
    const wrappedFK = crypto.wrapFileKey(fileKey, bobKeypair.pub, aliceKeypair.priv);
    const recovered = crypto.unwrapFileKey(wrappedFK, aliceKeypair.pub, bobKeypair.priv);
    expect(Buffer.from(recovered).toString('hex')).toBe(Buffer.from(fileKey).toString('hex'));
  });

  test('signLogEntry → verifyLogEntry passes', () => {
    const { sigPub, sigPriv } = crypto.generateSigningKeypair();
    const entry = JSON.stringify({ logId: 'test', eventType: 'MESSAGE_SENT' });
    const sig = crypto.signLogEntry(entry, sigPriv);
    expect(crypto.verifyLogEntry(entry, sig, sigPub)).toBe(true);
  });

  test('verifyLogEntry fails on tampered entry', () => {
    const { sigPub, sigPriv } = crypto.generateSigningKeypair();
    const entry = JSON.stringify({ logId: 'test', eventType: 'MESSAGE_SENT' });
    const sig = crypto.signLogEntry(entry, sigPriv);
    const tampered = JSON.stringify({ logId: 'test', eventType: 'FILE_OPENED' });
    expect(crypto.verifyLogEntry(tampered, sig, sigPub)).toBe(false);
  });

  test('zeroBuffer wipes buffer to zeros', () => {
    const buf = Buffer.from([1, 2, 3, 4, 5]);
    crypto.zeroBuffer(buf);
    expect(buf.every((b) => b === 0)).toBe(true);
  });

  test('bufferToBase64 and base64ToBuffer are inverse', () => {
    const buf = Buffer.from('test data 123');
    const b64 = crypto.bufferToBase64(buf);
    const recovered = crypto.base64ToBuffer(b64);
    expect(Buffer.from(recovered).toString()).toBe('test data 123');
  });
});
