/**
 * LOGS MODULE - Utilities (Dev 5)
 * Payload encryption/decryption using crypto module
 */
const { encryptSymmetric, decryptSymmetric } = require('../crypto/symmetric');
const { sha256 } = require('@noble/hashes/sha256');

/**
 * encryptPayload(metadata, userPrivKey)
 * → base64 encoded encrypted payload
 */
function encryptPayload(metadata, userPrivKey) {
  // Derive a deterministic encryption key from user's private key
  const encKey = userPrivKey
    ? Buffer.from(sha256(Buffer.from(userPrivKey)))
    : Buffer.alloc(32, 1); // fallback for testing

  const plaintext = Buffer.from(JSON.stringify(metadata));
  const { ct, nonce } = encryptSymmetric(plaintext, encKey);

  // Format: nonce(12) || ct
  const combined = Buffer.concat([Buffer.from(nonce), Buffer.from(ct)]);
  return combined.toString('base64');
}

/**
 * decryptPayload(payloadEncrypted, userPrivKey)
 * → metadata object
 */
function decryptPayload(payloadEncrypted, userPrivKey) {
  const encKey = userPrivKey
    ? Buffer.from(sha256(Buffer.from(userPrivKey)))
    : Buffer.alloc(32, 1);

  const combined = Buffer.from(payloadEncrypted, 'base64');
  const nonce = combined.slice(0, 12);
  const ct = combined.slice(12);

  const plaintext = decryptSymmetric(ct, nonce, encKey);
  return JSON.parse(plaintext.toString());
}

module.exports = { encryptPayload, decryptPayload };
