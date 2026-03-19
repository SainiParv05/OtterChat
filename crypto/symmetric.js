/**
 * CRYPTO MODULE - AES-GCM Symmetric Encryption (Dev 1)
 * Uses Node.js built-in crypto for AES-256-GCM
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12; // 96-bit nonce for GCM
const TAG_BYTES = 16;

/**
 * encryptSymmetric(plaintext, key)
 * → { ct: Buffer, nonce: Buffer }
 * plaintext: Buffer or Uint8Array or string
 * key: Buffer or Uint8Array (32 bytes)
 */
function encryptSymmetric(plaintext, key) {
  const nonce = crypto.randomBytes(NONCE_BYTES);
  const keyBuf = Buffer.from(key);
  const plaintextBuf = Buffer.isBuffer(plaintext) ? plaintext : Buffer.from(plaintext);

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuf, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Append auth tag to ciphertext
  const ct = Buffer.concat([encrypted, tag]);
  return { ct, nonce };
}

/**
 * decryptSymmetric(ct, nonce, key)
 * → Buffer (plaintext)
 */
function decryptSymmetric(ct, nonce, key) {
  const keyBuf = Buffer.from(key);
  const ctBuf = Buffer.from(ct);
  const nonceBuf = Buffer.from(nonce);

  // Extract auth tag from end of ciphertext
  const tag = ctBuf.slice(ctBuf.length - TAG_BYTES);
  const ciphertext = ctBuf.slice(0, ctBuf.length - TAG_BYTES);

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, nonceBuf);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted;
}

module.exports = { encryptSymmetric, decryptSymmetric };
