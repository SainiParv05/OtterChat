/**
 * BACKEND MODULE - File Controller (Dev 4)
 * Handles encrypted file upload/download + OneView key gating
 * NEVER decrypts anything
 */
const { storeFile, getFile, getWrappedFK } = require('../services/StorageService');
const { checkIfOpened } = require('../services/OneViewService');
const { success, error } = require('../utils/response');
const { requireFields } = require('../utils/validator');

async function uploadFile(req, res) {
  try {
    requireFields(req.body, ['metadata', 'chunks']);
    const { metadata, chunks } = req.body;
    requireFields(metadata, ['fileId', 'senderId', 'recipientId', 'wrappedFK']);

    await storeFile(metadata.fileId, metadata, chunks);
    return success(res, { fileId: metadata.fileId }, 201);
  } catch (err) {
    if (err.message === 'File already exists') return error(res, err.message, 409);
    return error(res, err.message);
  }
}

async function downloadFile(req, res) {
  try {
    const { fileId } = req.params;
    const file = await getFile(fileId);
    if (!file) return error(res, 'File not found', 404);

    return success(res, { chunks: file.encryptedChunks, metadata: file.metadata });
  } catch (err) {
    return error(res, err.message);
  }
}

async function requestKey(req, res) {
  try {
    requireFields(req.body, ['userId', 'fileId']);
    const { userId, fileId } = req.body;

    // OneView server-side gate
    const alreadyOpened = await checkIfOpened(fileId, userId);
    if (alreadyOpened) {
      return success(res, { allowed: false, reason: 'OneView policy: already viewed' });
    }

    // Retrieve wrappedFK from file metadata (server never sees real FK)
    const wrappedFK = await getWrappedFK(fileId);
    if (!wrappedFK) return error(res, 'File not found', 404);

    return success(res, { allowed: true, wrappedFK });
  } catch (err) {
    return error(res, err.message);
  }
}

module.exports = { uploadFile, downloadFile, requestKey };
