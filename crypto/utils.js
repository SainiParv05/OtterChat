/**
 * CRYPTO MODULE - Utilities (Dev 1)
 * Buffer helpers, encoding, randomness
 */
const crypto = require('crypto');

function randomBytes(n) {
  return crypto.randomBytes(n);
}

function bufferToBase64(buf) {
  return Buffer.from(buf).toString('base64');
}

function base64ToBuffer(b64) {
  return Buffer.from(b64, 'base64');
}

function bufferToHex(buf) {
  return Buffer.from(buf).toString('hex');
}

function hexToBuffer(hex) {
  return Buffer.from(hex, 'hex');
}

function zeroBuffer(buf) {
  if (buf && buf.fill) buf.fill(0);
}

module.exports = {
  randomBytes,
  bufferToBase64,
  base64ToBuffer,
  bufferToHex,
  hexToBuffer,
  zeroBuffer,
};
