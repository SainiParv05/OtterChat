/**
 * FILE MODULE - File Encryption (Dev 3)
 * Encrypts file buffer in chunks using AES-GCM
 */
const { encryptSymmetric } = require('../crypto/symmetric');
const { chunkBuffer } = require('./utils/chunk');

/**
 * encryptFile(fileBuffer, fileKey)
 * → encryptedChunks[] // array of { ct: base64, nonce: base64 }
 */
function encryptFile(fileBuffer, fileKey) {
  const buf = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);
  const chunks = chunkBuffer(buf);

  const encryptedChunks = chunks.map((chunk, index) => {
    const { ct, nonce } = encryptSymmetric(chunk, fileKey);
    return {
      ct: ct.toString('base64'),
      nonce: nonce.toString('base64'),
      chunkIndex: index,
    };
  });

  return encryptedChunks;
}

module.exports = { encryptFile };
