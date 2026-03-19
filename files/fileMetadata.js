/**
 * FILE MODULE - File Metadata Builder (Dev 3)
 */
const { v4: uuidv4 } = require('uuid');

/**
 * buildFileMetadata(params)
 * → metadata object matching exact schema
 */
function buildFileMetadata({ senderId, recipientId, fileName, fileSize, mediaType, policy, wrappedFK, chunkCount, fileId }) {
  return {
    fileId: fileId || uuidv4(),
    senderId,
    recipientId,
    fileName,
    fileSize,
    mediaType: mediaType || detectMediaType(fileName),
    policy: policy || 'NORMAL',
    wrappedFK,
    chunkCount,
  };
}

/**
 * detectMediaType(fileName)
 * → 'image' | 'audio' | 'video' | 'pdf' | 'other'
 */
function detectMediaType(fileName) {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const types = {
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', bmp: 'image',
    mp3: 'audio', wav: 'audio', ogg: 'audio', aac: 'audio', flac: 'audio',
    mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
    pdf: 'pdf',
  };
  return types[ext] || 'other';
}

module.exports = { buildFileMetadata, detectMediaType };
