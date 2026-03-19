/**
 * CRYPTO MODULE - ECDH Shared Secret Derivation (Dev 1)
 * Uses X25519 Diffie-Hellman
 */
const { x25519 } = require('@noble/curves/ed25519');
const { sha256 } = require('@noble/hashes/sha256');

/**
 * deriveSharedSecret(privKey, remotePubKey)
 * → Uint8Array(32)
 */
function deriveSharedSecret(privKey, remotePubKey) {
  const rawSecret = x25519.getSharedSecret(privKey, remotePubKey);
  // Hash the raw secret to get a uniform 32-byte key
  return sha256(rawSecret);
}

module.exports = { deriveSharedSecret };
