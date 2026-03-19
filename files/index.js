/**
 * FILE MODULE - Public API (Dev 3)
 * Main file service including openFile flow
 */
const { encryptFile } = require('./encryptFile');
const { decryptFile } = require('./decryptFile');
const { uploadEncryptedFile } = require('./upload');
const { downloadEncryptedFile, requestFileKey } = require('./download');
const { buildFileMetadata, detectMediaType } = require('./fileMetadata');
const { zeroBuffer } = require('./utils/buffer');
const { chunkBuffer } = require('./utils/chunk');
const { generateFileKey, wrapFileKey, unwrapFileKey } = require('../crypto/wrapKey');
const { appendLog } = require('../logs/logManager');
const { hasFileOpened } = require('../logs/oneView');

/**
 * sendFile(fileBuffer, fileName, userContext)
 * → { fileId, metadata }
 * userContext: { userId, userPrivKey, recipientId, recipientPubKey, token }
 */
async function sendFile(fileBuffer, fileName, userContext) {
  const { userId, userPrivKey, recipientId, recipientPubKey, token } = userContext;

  const fileKey = generateFileKey();
  const wrappedFK = wrapFileKey(fileKey, recipientPubKey, userPrivKey);
  const encryptedChunks = encryptFile(fileBuffer, fileKey);

  const metadata = buildFileMetadata({
    senderId: userId,
    recipientId,
    fileName,
    fileSize: fileBuffer.length,
    policy: 'ONE_VIEW',
    wrappedFK: Buffer.from(wrappedFK).toString('base64'),
    chunkCount: encryptedChunks.length,
  });

  await uploadEncryptedFile(metadata.fileId, encryptedChunks, metadata, token);

  await appendLog('FILE_RECEIVED', metadata.fileId, { senderId: userId }, {
    userId: recipientId,
    userPrivKey,
  });

  // Wipe file key from memory
  zeroBuffer(fileKey);

  return { fileId: metadata.fileId, metadata };
}

/**
 * openFile(fileId, userContext)
 * → decrypted fileBuffer
 * userContext: { userId, userPrivKey, senderPubKey, token }
 */
async function openFile(fileId, userContext) {
  const { userId, userPrivKey, senderPubKey, token } = userContext;

  // OneView enforcement: check if already opened
  if (hasFileOpened(userId, fileId)) {
    throw new Error('OneView: File has already been opened. Access denied.');
  }

  // Request file key from server (server does OneView check too)
  const keyResponse = await requestFileKey(fileId, userId, token);
  if (!keyResponse.allowed) {
    throw new Error('OneView: Server denied file key. File already viewed.');
  }

  // Download encrypted chunks
  const { encryptedChunks, metadata } = await downloadEncryptedFile(fileId, token);

  // Unwrap the file key using ECDH
  const wrappedFK = Buffer.from(keyResponse.wrappedFK, 'base64');
  const fileKey = unwrapFileKey(wrappedFK, senderPubKey, userPrivKey);

  // Decrypt file
  const fileBuffer = decryptFile(encryptedChunks, fileKey);

  // Log file opened BEFORE wiping key
  await appendLog('FILE_OPENED', fileId, { senderId: metadata.senderId }, {
    userId,
    userPrivKey,
  });

  // Wipe file key from memory
  zeroBuffer(fileKey);

  return { fileBuffer, metadata };
}

const fileService = {
  sendFile,
  openFile,
  isOneViewConsumed: (userId, fileId) => hasFileOpened(userId, fileId),
};

module.exports = {
  encryptFile,
  decryptFile,
  uploadEncryptedFile,
  downloadEncryptedFile,
  requestFileKey,
  buildFileMetadata,
  detectMediaType,
  sendFile,
  openFile,
  fileService,
};
