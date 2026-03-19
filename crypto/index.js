/**
 * CRYPTO MODULE - Public API (Dev 1)
 * All exports for other modules to consume
 */
const { generateUserKeypair } = require('./keygen');
const { deriveSharedSecret } = require('./ecdh');
const { encryptSymmetric, decryptSymmetric } = require('./symmetric');
const { generateFileKey, wrapFileKey, unwrapFileKey } = require('./wrapKey');
const { generateSigningKeypair, signLogEntry, verifyLogEntry } = require('./sign');
const utils = require('./utils');

module.exports = {
  // Key generation
  generateUserKeypair,
  generateSigningKeypair,

  // ECDH
  deriveSharedSecret,

  // Symmetric encryption
  encryptSymmetric,
  decryptSymmetric,

  // File key management
  generateFileKey,
  wrapFileKey,
  unwrapFileKey,

  // Log signing
  signLogEntry,
  verifyLogEntry,

  // Utilities
  ...utils,
};
