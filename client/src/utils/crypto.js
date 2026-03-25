/**
 * CLIENT CRYPTO BRIDGE
 * Browser-compatible crypto using Web Crypto API (SubtleCrypto)
 * Mirrors the server-side crypto module API
 */

// ─── Key Generation ────────────────────────────────────────────────────────

export async function generateUserKeypair() {
  // Use ECDH P-256 for browser compatibility
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
  const pubRaw = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { pub: pubRaw, priv: privJwk, keyPair };
}

// ─── Shared Secret ─────────────────────────────────────────────────────────

export async function deriveSharedSecret(privJwk, pubRaw) {
  const privKey = await window.crypto.subtle.importKey(
    'jwk', privJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']
  );
  const pubKey = await window.crypto.subtle.importKey(
    'raw', pubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: 'ECDH', public: pubKey }, privKey, 256
  );
  // SHA-256 the raw bits to get a uniform key
  return window.crypto.subtle.digest('SHA-256', bits);
}

// ─── AES-GCM ──────────────────────────────────────────────────────────────

export async function encryptSymmetric(plaintextBuffer, keyBuffer) {
  const key = await window.crypto.subtle.importKey(
    'raw', keyBuffer, { name: 'AES-GCM' }, false, ['encrypt']
  );
  const nonce = window.crypto.getRandomValues(new Uint8Array(12));
  const ct = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, key, plaintextBuffer
  );
  return { ct: new Uint8Array(ct), nonce };
}

export async function decryptSymmetric(ctBuffer, nonceBuffer, keyBuffer) {
  const key = await window.crypto.subtle.importKey(
    'raw', keyBuffer, { name: 'AES-GCM' }, false, ['decrypt']
  );
  const plaintext = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonceBuffer }, key, ctBuffer
  );
  return new Uint8Array(plaintext);
}

// ─── File Key ─────────────────────────────────────────────────────────────

export function generateFileKey() {
  return window.crypto.getRandomValues(new Uint8Array(32));
}

// ─── Utilities ────────────────────────────────────────────────────────────

export function bufferToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export function base64ToBuffer(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return arr.buffer;
}

export function zeroBuffer(buf) {
  if (buf && buf.fill) buf.fill(0);
}

// ─── Message Encryption ───────────────────────────────────────────────────

export async function encryptMessage(plaintext, senderPrivJwk, recipientPubRaw) {
  const secretBits = await deriveSharedSecret(senderPrivJwk, recipientPubRaw);
  const sharedKey = new Uint8Array(secretBits);
  const encoded = new TextEncoder().encode(plaintext);
  return encryptSymmetric(encoded, sharedKey);
}

export async function decryptMessage(ctBuffer, nonceBuffer, senderPubRaw, recipientPrivJwk) {
  const secretBits = await deriveSharedSecret(recipientPrivJwk, senderPubRaw);
  const sharedKey = new Uint8Array(secretBits);
  const plainBytes = await decryptSymmetric(ctBuffer, nonceBuffer, sharedKey);
  return new TextDecoder().decode(plainBytes);
}
