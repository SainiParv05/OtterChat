/**
 * FILE MODULE - Download Encrypted File (Dev 3)
 */
const axios = require('axios').default;

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

/**
 * downloadEncryptedFile(fileId, token)
 * → { encryptedChunks, metadata }
 */
async function downloadEncryptedFile(fileId, token) {
  const res = await axios.get(`${SERVER_URL}/file/download/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { encryptedChunks: res.data.chunks, metadata: res.data.metadata };
}

/**
 * requestFileKey(fileId, userId, token)
 * → { allowed: boolean, wrappedFK?: string }
 */
async function requestFileKey(fileId, userId, token) {
  const res = await axios.post(`${SERVER_URL}/file/request-key`, { fileId, userId }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

module.exports = { downloadEncryptedFile, requestFileKey };
