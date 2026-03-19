/**
 * FILE MODULE - Buffer Utilities (Dev 3)
 */

/**
 * concatChunks(listOfBuffers)
 * → Buffer
 */
function concatChunks(listOfBuffers) {
  return Buffer.concat(listOfBuffers.map((b) => Buffer.from(b)));
}

/**
 * zeroBuffer(buffer)
 * Securely wipes a buffer from memory
 */
function zeroBuffer(buffer) {
  if (buffer && buffer.fill) {
    buffer.fill(0);
  }
}

module.exports = { concatChunks, zeroBuffer };
