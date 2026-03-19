/**
 * FILE MODULE - Chunking Utilities (Dev 3)
 */

const DEFAULT_CHUNK_SIZE = 64 * 1024; // 64KB chunks

/**
 * chunkBuffer(buffer, size)
 * → Buffer[]
 */
function chunkBuffer(buffer, size = DEFAULT_CHUNK_SIZE) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const chunks = [];
  let offset = 0;
  while (offset < buf.length) {
    chunks.push(buf.slice(offset, offset + size));
    offset += size;
  }
  return chunks;
}

module.exports = { chunkBuffer, DEFAULT_CHUNK_SIZE };
