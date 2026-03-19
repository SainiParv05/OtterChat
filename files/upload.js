/**
 * FILE MODULE - Upload Encrypted File (Dev 3)
 */
const axios = require('axios').default;

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

/**
 * uploadEncryptedFile(fileId, encryptedChunks, metadata, token)
 * → POST /file/upload
 */
async function uploadEncryptedFile(fileId, encryptedChunks, metadata, token) {
  const payload = {
    metadata: { ...metadata, fileId },
    chunks: encryptedChunks,
  };

  const res = await axios.post(`${SERVER_URL}/file/upload`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return res.data;
}

module.exports = { uploadEncryptedFile };
