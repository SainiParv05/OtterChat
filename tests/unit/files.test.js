/**
 * UNIT TESTS - File Module
 */
const { encryptFile } = require('../../files/encryptFile');
const { decryptFile } = require('../../files/decryptFile');
const { chunkBuffer } = require('../../files/utils/chunk');
const { concatChunks, zeroBuffer } = require('../../files/utils/buffer');
const { generateFileKey } = require('../../crypto/wrapKey');

describe('File Module', () => {
  test('chunkBuffer splits buffer correctly', () => {
    const buf = Buffer.alloc(100, 0xff);
    const chunks = chunkBuffer(buf, 30);
    expect(chunks.length).toBe(4); // 30+30+30+10
    expect(chunks[0].length).toBe(30);
    expect(chunks[3].length).toBe(10);
  });

  test('concatChunks reassembles buffer', () => {
    const buf = Buffer.from('hello world');
    const chunks = chunkBuffer(buf, 4);
    const reconstructed = concatChunks(chunks);
    expect(reconstructed.toString()).toBe('hello world');
  });

  test('zeroBuffer wipes buffer', () => {
    const buf = Buffer.from([1, 2, 3, 4]);
    zeroBuffer(buf);
    expect([...buf]).toEqual([0, 0, 0, 0]);
  });

  test('encryptFile → decryptFile round-trip (1 KB)', () => {
    const fileKey = generateFileKey();
    const data = Buffer.alloc(1024, 0xab);
    const chunks = encryptFile(data, fileKey);
    const recovered = decryptFile(chunks, fileKey);
    expect(recovered.equals(data)).toBe(true);
  });

  test('encryptFile → decryptFile round-trip (1 MB)', () => {
    const fileKey = generateFileKey();
    const data = Buffer.alloc(1024 * 1024, 0xcd);
    const chunks = encryptFile(data, fileKey);
    const recovered = decryptFile(chunks, fileKey);
    expect(recovered.equals(data)).toBe(true);
  });

  test('encryptFile → decryptFile round-trip (50 MB)', () => {
    const fileKey = generateFileKey();
    const data = Buffer.alloc(50 * 1024 * 1024, 0xef);
    const chunks = encryptFile(data, fileKey);
    const recovered = decryptFile(chunks, fileKey);
    expect(recovered.equals(data)).toBe(true);
  }, 60000);

  test('encryptFile produces correct number of chunks', () => {
    const fileKey = generateFileKey();
    const data = Buffer.alloc(200 * 1024); // 200KB
    const chunks = encryptFile(data, fileKey); // default 64KB chunks → 4 chunks
    expect(chunks.length).toBe(4);
  });

  test('each encrypted chunk has ct and nonce fields', () => {
    const fileKey = generateFileKey();
    const data = Buffer.alloc(100);
    const chunks = encryptFile(data, fileKey);
    chunks.forEach((chunk) => {
      expect(chunk.ct).toBeDefined();
      expect(chunk.nonce).toBeDefined();
      expect(chunk.chunkIndex).toBeDefined();
    });
  });

  test('decryptFile handles out-of-order chunks', () => {
    const fileKey = generateFileKey();
    const data = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(10));
    const chunks = encryptFile(data, fileKey);
    const shuffled = [...chunks].reverse(); // reverse order
    const recovered = decryptFile(shuffled, fileKey);
    expect(recovered.equals(data)).toBe(true);
  });

  test('decryptFile fails with wrong key', () => {
    const fileKey = generateFileKey();
    const wrongKey = generateFileKey();
    const data = Buffer.from('secret data');
    const chunks = encryptFile(data, fileKey);
    expect(() => decryptFile(chunks, wrongKey)).toThrow();
  });
});
