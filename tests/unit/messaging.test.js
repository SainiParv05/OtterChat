/**
 * UNIT TESTS - Messaging Module
 */
const { encryptMessage, decryptMessage } = require('../../messaging/sendMessage');
const { createMessageSchema, validateMessage } = require('../../messaging/messageSchema');
const messageStore = require('../../messaging/messageStore');
const { generateUserKeypair } = require('../../crypto/keygen');

describe('Messaging Module', () => {
  let alice, bob;

  beforeAll(() => {
    alice = generateUserKeypair();
    bob = generateUserKeypair();
    messageStore.clear();
  });

  test('encryptMessage → decryptMessage round-trip', () => {
    const plaintext = 'Hello Bob, this is a secret!';
    const { ciphertext, nonce } = encryptMessage(plaintext, alice.priv, bob.pub);
    const recovered = decryptMessage(ciphertext, nonce, alice.pub, bob.priv);
    expect(recovered).toBe(plaintext);
  });

  test('encryptMessage → decryptMessage with 2000+ char plaintext', () => {
    const plaintext = 'x'.repeat(2001);
    const { ciphertext, nonce } = encryptMessage(plaintext, alice.priv, bob.pub);
    const recovered = decryptMessage(ciphertext, nonce, alice.pub, bob.priv);
    expect(recovered).toBe(plaintext);
  });

  test('decryptMessage fails with wrong key', () => {
    const { priv: evePriv } = generateUserKeypair();
    const plaintext = 'Secret';
    const { ciphertext, nonce } = encryptMessage(plaintext, alice.priv, bob.pub);
    expect(() => decryptMessage(ciphertext, nonce, alice.pub, evePriv)).toThrow();
  });

  test('createMessageSchema produces correct schema', () => {
    const { v4: uuidv4 } = require('uuid');
    const { ciphertext, nonce } = encryptMessage('test', alice.priv, bob.pub);
    const schema = createMessageSchema({
      msgId: uuidv4(),
      senderId: 'alice-id',
      recipientId: 'bob-id',
      ciphertext,
      nonce,
      timestamp: Date.now(),
    });
    expect(schema.ciphertext).toBeDefined();
    expect(schema.plaintext).toBeUndefined();
    expect(schema.senderId).toBe('alice-id');
  });

  test('createMessageSchema throws if senderId === recipientId', () => {
    const { v4: uuidv4 } = require('uuid');
    const { ciphertext, nonce } = encryptMessage('test', alice.priv, bob.pub);
    expect(() => createMessageSchema({
      msgId: uuidv4(),
      senderId: 'same-id',
      recipientId: 'same-id',
      ciphertext,
      nonce,
    })).toThrow();
  });

  test('messageStore stores and retrieves messages', () => {
    messageStore.addMessage({ msgId: 'm1', senderId: 'alice', recipientId: 'bob', plaintext: 'hi' });
    messageStore.addMessage({ msgId: 'm2', senderId: 'bob', recipientId: 'alice', plaintext: 'hey' });
    const msgs = messageStore.getMessagesWithUser('alice');
    expect(msgs.length).toBe(2);
  });

  test('validateMessage rejects plaintext field', () => {
    expect(() => validateMessage({
      msgId: 'x', senderId: 'a', recipientId: 'b',
      ciphertext: 'xx', nonce: 'nn', timestamp: 1,
      plaintext: 'HACKED',
    })).toThrow('plaintext field detected');
  });
});
