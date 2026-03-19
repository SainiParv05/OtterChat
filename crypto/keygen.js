/**
 * CRYPTO MODULE - Key Generation (Dev 1)
 * Generates X25519 keypairs for ECDH
 */
const { x25519 } = require('@noble/curves/ed25519');
const { randomBytes } = require('@noble/hashes/utils');

/**
 * generateUserKeypair()
 * → { pub: Uint8Array, priv: Uint8Array }
 */
function generateUserKeypair() {
  const priv = x25519.utils.randomPrivateKey();
  const pub = x25519.getPublicKey(priv);
  return { pub, priv };
}

module.exports = { generateUserKeypair };
