/**
 * BACKEND MODULE - Storage Service (Dev 4)
 * Opaque blob storage — never decrypts anything
 */
const File = require('../models/File');

async function storeFile(fileId, metadata, chunks) {
  const existing = await File.findOne({ fileId });
  if (existing) throw new Error('File already exists');

  return File.create({ fileId, metadata, encryptedChunks: chunks });
}

async function getFile(fileId) {
  return File.findOne({ fileId });
}

async function getWrappedFK(fileId) {
  const file = await File.findOne({ fileId });
  if (!file) return null;
  return file.metadata.wrappedFK;
}

module.exports = { storeFile, getFile, getWrappedFK };
