/**
 * CRYPTO MODULE - Log Signing & Verification (Dev 1)
 * Uses Ed25519 for deterministic signing
 */
const { ed25519 } = require('@noble/curves/ed25519');

/**
 * generateSigningKeypair()
 * → { sigPub: Uint8Array, sigPriv: Uint8Array }
 * Ed25519 keypair for signing logs
 */
function generateSigningKeypair() {
  const sigPriv = ed25519.utils.randomPrivateKey();
  const sigPub = ed25519.getPublicKey(sigPriv);
  return { sigPub, sigPriv };
}

/**
 * signLogEntry(entry, privKey)
 * → signature (Uint8Array, 64 bytes)
 * entry: string (JSON serialized log entry)
 */
function signLogEntry(entry, privKey) {
  const msg = Buffer.from(typeof entry === 'string' ? entry : JSON.stringify(entry));
  return ed25519.sign(msg, privKey);
}

/**
 * verifyLogEntry(entry, signature, pubKey)
 * → boolean
 */
function verifyLogEntry(entry, signature, pubKey) {
  try {
    const msg = Buffer.from(typeof entry === 'string' ? entry : JSON.stringify(entry));
    return ed25519.verify(signature, msg, pubKey);
  } catch {
    return false;
  }
}

module.exports = { generateSigningKeypair, signLogEntry, verifyLogEntry };
