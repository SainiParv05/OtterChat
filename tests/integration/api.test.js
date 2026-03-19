/**
 * INTEGRATION TESTS - Backend API
 * Real API calls against the Express server with in-memory MongoDB
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../server/server');
const { generateUserKeypair } = require('../../crypto/keygen');
const { encryptMessage } = require('../../messaging/sendMessage');
const { encryptFile } = require('../../files/encryptFile');
const { generateFileKey, wrapFileKey } = require('../../crypto/wrapKey');
const { v4: uuidv4 } = require('uuid');

let mongod;
let aliceToken, bobToken;
let aliceId, bobId;
let aliceKeys, bobKeys;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);

  aliceKeys = generateUserKeypair();
  bobKeys = generateUserKeypair();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Auth Endpoints', () => {
  test('POST /auth/register - Alice', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'alice',
      password: 'alice-pass-123',
      userPubKey: Buffer.from(aliceKeys.pub).toString('base64'),
    });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
    expect(res.body.token).toBeDefined();
    aliceId = res.body.userId;
    aliceToken = res.body.token;
  });

  test('POST /auth/register - Bob', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'bob',
      password: 'bob-pass-456',
      userPubKey: Buffer.from(bobKeys.pub).toString('base64'),
    });
    expect(res.status).toBe(201);
    bobId = res.body.userId;
    bobToken = res.body.token;
  });

  test('POST /auth/register - duplicate fails', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'alice',
      password: 'pass',
      userPubKey: 'key',
    });
    expect(res.status).toBe(400);
  });

  test('POST /auth/login', async () => {
    const res = await request(app).post('/auth/login').send({
      username: 'alice',
      password: 'alice-pass-123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.userPubKey).toBeDefined();
  });

  test('POST /auth/login - wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      username: 'alice',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
  });
});

describe('Message Endpoints', () => {
  let testMsgId;

  test('POST /message/send - sends encrypted message', async () => {
    const { ciphertext, nonce } = encryptMessage('Hello Bob!', aliceKeys.priv, bobKeys.pub);
    testMsgId = uuidv4();

    const res = await request(app)
      .post('/message/send')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        msgId: testMsgId,
        senderId: aliceId,
        recipientId: bobId,
        ciphertext: ciphertext.toString('base64'),
        nonce: nonce.toString('base64'),
        timestamp: Date.now(),
      });

    expect(res.status).toBe(201);
    expect(res.body.msgId).toBe(testMsgId);
  });

  test('GET /message/fetch - returns encrypted messages for Bob', async () => {
    const res = await request(app)
      .get('/message/fetch')
      .set('Authorization', `Bearer ${bobToken}`)
      .query({ userId: bobId });

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);

    const msg = res.body.messages.find((m) => m.msgId === testMsgId);
    expect(msg).toBeDefined();
    // Verify the blob: ciphertext field exists, plaintext does NOT
    expect(msg.ciphertext).toBeDefined();
    expect(msg.plaintext).toBeUndefined();
  });

  test('POST /message/send - rejected without auth', async () => {
    const res = await request(app).post('/message/send').send({
      msgId: uuidv4(), senderId: aliceId, recipientId: bobId,
      ciphertext: 'xx', nonce: 'nn', timestamp: Date.now(),
    });
    expect(res.status).toBe(401);
  });

  test('POST /message/send - senderId === recipientId rejected', async () => {
    const res = await request(app)
      .post('/message/send')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        msgId: uuidv4(), senderId: aliceId, recipientId: aliceId,
        ciphertext: 'xx', nonce: 'nn', timestamp: Date.now(),
      });
    expect(res.status).toBe(400);
  });
});

describe('File Endpoints', () => {
  let testFileId;

  test('POST /file/upload - uploads encrypted file', async () => {
    testFileId = uuidv4();
    const fileKey = generateFileKey();
    const fileBuffer = Buffer.alloc(1024, 0xaa);
    const encryptedChunks = encryptFile(fileBuffer, fileKey);
    const wrappedFK = wrapFileKey(fileKey, bobKeys.pub, aliceKeys.priv);

    const res = await request(app)
      .post('/file/upload')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        metadata: {
          fileId: testFileId,
          senderId: aliceId,
          recipientId: bobId,
          fileName: 'test.txt',
          fileSize: 1024,
          mediaType: 'other',
          policy: 'ONE_VIEW',
          wrappedFK: Buffer.from(wrappedFK).toString('base64'),
          chunkCount: encryptedChunks.length,
        },
        chunks: encryptedChunks,
      });

    expect(res.status).toBe(201);
    expect(res.body.fileId).toBe(testFileId);
  });

  test('GET /file/download/:fileId - returns encrypted chunks', async () => {
    const res = await request(app)
      .get(`/file/download/${testFileId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(200);
    expect(res.body.chunks).toBeDefined();
    expect(res.body.metadata).toBeDefined();
    expect(res.body.metadata.senderId).toBe(aliceId);
    // Backend returns encrypted blobs only, no plaintext
    expect(res.body.plaintext).toBeUndefined();
  });

  test('POST /file/request-key - first request allowed (OneView)', async () => {
    const res = await request(app)
      .post('/file/request-key')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ userId: bobId, fileId: testFileId });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(true);
    expect(res.body.wrappedFK).toBeDefined();
  });

  test('POST /file/request-key - second request denied (OneView)', async () => {
    // Simulate Bob's log showing file was opened
    const Log = require('../../server/models/Log');
    await Log.findOneAndUpdate(
      { userId: bobId },
      {
        $push: {
          encryptedLogEntries: {
            logId: uuidv4(),
            eventType: 'FILE_OPENED',
            fileId: testFileId,
            msgId: null,
            timestamp: Date.now(),
            prevHash: '0'.repeat(64),
            currentHash: '1'.repeat(64),
            payloadEncrypted: 'dummy',
          },
        },
      },
      { upsert: true }
    );

    const res = await request(app)
      .post('/file/request-key')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ userId: bobId, fileId: testFileId });

    expect(res.status).toBe(200);
    expect(res.body.allowed).toBe(false);
  });
});

describe('Log Endpoints', () => {
  test('POST /log/append - stores log entry', async () => {
    const res = await request(app)
      .post('/log/append')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        logEntry: {
          logId: uuidv4(),
          userId: aliceId,
          eventType: 'MESSAGE_SENT',
          msgId: uuidv4(),
          fileId: null,
          timestamp: Date.now(),
          prevHash: '0'.repeat(64),
          currentHash: '1'.repeat(64),
          payloadEncrypted: 'encrypted-blob',
        },
      });

    expect(res.status).toBe(201);
  });

  test('GET /log/sync - returns log entries', async () => {
    const res = await request(app)
      .get('/log/sync')
      .set('Authorization', `Bearer ${aliceToken}`)
      .query({ userId: aliceId });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.logs.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /health - returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
