/**
 * FILE MODULE - File Decryption (Dev 3)
 */
const { decryptSymmetric } = require('../crypto/symmetric');
const { concatChunks } = require('./utils/buffer');

/**
 * decryptFile(encryptedChunks, fileKey)
 * → fileBuffer
 */
function decryptFile(encryptedChunks, fileKey) {
  // Sort by chunkIndex to ensure correct order
  const sorted = [...encryptedChunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

  const decryptedChunks = sorted.map((chunk) => {
    const ct = Buffer.from(chunk.ct, 'base64');
    const nonce = Buffer.from(chunk.nonce, 'base64');
    return decryptSymmetric(ct, nonce, fileKey);
  });

  return concatChunks(decryptedChunks);
}

module.exports = { decryptFile };
