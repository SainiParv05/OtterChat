/**
 * CRYPTO MODULE - File Key Wrapping/Unwrapping (Dev 1)
 * Wraps file key (FK) using ECDH shared secret + AES-GCM
 */
const crypto = require('crypto');
const { deriveSharedSecret } = require('./ecdh');
const { encryptSymmetric, decryptSymmetric } = require('./symmetric');

/**
 * generateFileKey()
 * → Uint8Array(32) - random 256-bit file key
 */
function generateFileKey() {
  return crypto.randomBytes(32);
}

/**
 * wrapFileKey(fileKey, recipientPubKey, senderPrivKey)
 * → wrappedKey (Buffer - base64 encodable)
 * Encrypts the file key with ECDH(sender, recipient) shared secret
 */
function wrapFileKey(fileKey, recipientPubKey, senderPrivKey) {
  const sharedSecret = deriveSharedSecret(senderPrivKey, recipientPubKey);
  const { ct, nonce } = encryptSymmetric(fileKey, sharedSecret);

  // wrappedFK = nonce (12 bytes) || ct (32 + 16 bytes)
  return Buffer.concat([nonce, ct]);
}

/**
 * unwrapFileKey(wrappedKey, senderPubKey, recipientPrivKey)
 * → fileKey (Buffer, 32 bytes)
 */
function unwrapFileKey(wrappedKey, senderPubKey, recipientPrivKey) {
  const buf = Buffer.from(wrappedKey);
  const nonce = buf.slice(0, 12);
  const ct = buf.slice(12);

  const sharedSecret = deriveSharedSecret(recipientPrivKey, senderPubKey);
  return decryptSymmetric(ct, nonce, sharedSecret);
}

module.exports = { generateFileKey, wrapFileKey, unwrapFileKey };
