# OtterChat — Complete Workflow Documentation

> Zero-Knowledge End-to-End Encrypted Messaging & File Sharing System

---

## 📐 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          OTTERCHAT SYSTEM                                │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                        CLIENT (Browser)                           │   │
│  │                                                                   │   │
│  │  ┌──────────┐   ┌──────────────┐   ┌──────────┐   ┌──────────┐  │   │
│  │  │  Crypto  │   │  Messaging   │   │  Files   │   │   Logs   │  │   │
│  │  │  Module  │◄──│   Module     │   │  Module  │   │  Module  │  │   │
│  │  │ (Dev 1)  │   │  (Dev 2)     │   │ (Dev 3)  │   │ (Dev 5)  │  │   │
│  │  │          │   │              │   │          │   │          │  │   │
│  │  │ ECDH     │   │encryptMsg()  │   │encryptFile│  │appendLog()│  │   │
│  │  │ AES-GCM  │   │decryptMsg()  │   │decryptFile│  │hashChain │  │   │
│  │  │ Ed25519  │   │sendMessage() │   │openFile() │  │OneView   │  │   │
│  │  │ FK wrap  │   │receiveMsg()  │   │uploadFile │  │verify()  │  │   │
│  │  └────┬─────┘   └──────┬───────┘   └────┬─────┘   └────┬─────┘  │   │
│  │       │                │                 │               │         │   │
│  └───────┼────────────────┼─────────────────┼───────────────┼─────────┘  │
│          │                │ Encrypted Blobs  │               │             │
│          │                ▼                 ▼               ▼             │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │                    BACKEND (Dev 4) — ZERO KNOWLEDGE               │   │
│  │                                                                    │   │
│  │  POST /auth/register     POST /message/send    POST /file/upload  │   │
│  │  POST /auth/login        GET  /message/fetch   GET  /file/download│   │
│  │                          POST /log/append      POST /file/req-key │   │
│  │                          GET  /log/sync        OneViewService      │   │
│  │                                                                    │   │
│  │  ┌────────────────────────────────────────────────────────────┐   │   │
│  │  │                   MongoDB Database                          │   │   │
│  │  │  users{userId,pubKey}  messages{ciphertext,nonce}          │   │   │
│  │  │  files{encChunks,wrappedFK}  logs{encryptedLogEntries[]}  │   │   │
│  │  └────────────────────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

 KEY PRINCIPLE: Backend stores ONLY encrypted blobs. It cannot read any data.
```

---

## 🔁 1. End-to-End Message Flow

### Step-by-Step

```
Alice                       Client Crypto              Backend             Bob
  │                              │                        │                  │
  │── type "Hello Bob" ─────────►│                        │                  │
  │                              │                        │                  │
  │                   sharedSecret = deriveSharedSecret(  │                  │
  │                       alicePrivKey, bobPubKey)        │                  │
  │                              │                        │                  │
  │                   { ct, nonce } = encryptSymmetric(   │                  │
  │                       "Hello Bob", sharedSecret)      │                  │
  │                              │                        │                  │
  │                   encMsg = createMessageSchema({      │                  │
  │                       msgId, senderId, recipientId,   │                  │
  │                       ciphertext, nonce, timestamp    │                  │
  │                   })         │                        │                  │
  │                              │                        │                  │
  │                   appendLog("MESSAGE_SENT", msgId)    │                  │
  │                   → hash chain updated                │                  │
  │                              │                        │                  │
  │                              │── POST /message/send ─►│                  │
  │                              │   { ciphertext, nonce }│                  │
  │                              │   (NO plaintext)       │                  │
  │                              │                        │── store blob ──► │
  │                              │                        │                  │
  │                              │                        │◄── GET /fetch ──│
  │                              │◄───────────────────────│   { encMsg[] }  │
  │                              │                        │                  │
  │              sharedSecret = deriveSharedSecret(       │                  │
  │                  bobPrivKey, alicePubKey)             │                  │
  │                              │                        │                  │
  │              plaintext = decryptSymmetric(            │                  │
  │                  ct, nonce, sharedSecret)             │                  │
  │                              │                        │                  │
  │              appendLog("MESSAGE_RECEIVED", msgId)     │                  │
  │                              │                        │                  │
  │◄─────────── "Hello Bob" ─────│                        │                 │
```

### Data Format at Each Step

| Step | Data |
|------|------|
| User input | `"Hello Bob!"` (plaintext string) |
| After `encryptMessage()` | `{ ct: Buffer<60 bytes>, nonce: Buffer<12 bytes> }` |
| Message schema | `{ msgId, senderId, recipientId, ciphertext: "base64...", nonce: "base64...", timestamp }` |
| In MongoDB | Same schema — ciphertext/nonce stored as base64 strings |
| After `decryptMessage()` | `"Hello Bob!"` (recovered plaintext) |

### Function Calls

```javascript
// Sender (Alice)
const sharedSecret = deriveSharedSecret(alicePrivKey, bobPubKey);
const { ct, nonce } = encryptSymmetric(plaintext, sharedSecret);
const encMsg = createMessageSchema({ msgId, senderId, recipientId, ciphertext: ct, nonce });
await appendLog("MESSAGE_SENT", msgId, { recipientId }, { userId, userPrivKey });
await axios.post('/message/send', encMsg);

// Receiver (Bob)
const msgs = await axios.get('/message/fetch?userId=bob');
const sharedSecret = deriveSharedSecret(bobPrivKey, alicePubKey);
const plaintext = decryptSymmetric(ct, nonce, sharedSecret);
await appendLog("MESSAGE_RECEIVED", msgId, { senderId }, { userId, userPrivKey });
```

---

## 📦 2. End-to-End File Flow

### Step-by-Step

```
1.  User selects file (e.g., video.mp4 — 50MB)

2.  generateFileKey()
    → fileKey = Uint8Array(32) [random 256-bit key]

3.  wrapFileKey(fileKey, recipientPubKey, senderPrivKey)
    → wrappedFK = ECDH(sender,recipient) + AES-GCM(fileKey)
    → base64 encoded, stored in file metadata
    → Server NEVER sees the real fileKey

4.  encryptFile(fileBuffer, fileKey)
    → chunkBuffer(buffer, 64KB)          // split into 64KB chunks
    → for each chunk: encryptSymmetric(chunk, fileKey)
    → encryptedChunks = [{ ct, nonce, chunkIndex }, ...]

5.  uploadEncryptedFile(fileId, encryptedChunks, metadata)
    → POST /file/upload
    → Body: { metadata: { fileId, wrappedFK, ... }, chunks: [...] }
    → Backend stores opaque blobs + metadata

6.  appendLog("FILE_RECEIVED", fileId)   // on recipient's log chain

─── When recipient opens the file ───────────────────────────────────────

7.  hasFileOpened(userId, fileId)        // OneView check (client-side)
    → scan log chain for FILE_OPENED event
    → if true → block immediately

8.  POST /file/request-key { userId, fileId }
    → Backend: checkIfOpened(fileId, userId)  // OneView (server-side)
    → if already opened → { allowed: false }
    → else → { allowed: true, wrappedFK }

9.  downloadEncryptedFile(fileId)
    → GET /file/download/:fileId
    → returns { chunks: [...], metadata: {...} }

10. unwrapFileKey(wrappedFK, senderPubKey, recipientPrivKey)
    → ECDH(recipient, sender) + AES-GCM decrypt
    → recovers real fileKey

11. decryptFile(encryptedChunks, fileKey)
    → sort chunks by chunkIndex
    → for each: decryptSymmetric(ct, nonce, fileKey)
    → concatChunks(decryptedChunks) → fileBuffer

12. appendLog("FILE_OPENED", fileId)     // mark as consumed
    → OneView is now permanently enforced

13. zeroBuffer(fileKey)                  // wipe key from memory

14. Media playback (based on mediaType):
    → 'video'  → playVideo(fileBuffer)   → Blob URL, no download
    → 'audio'  → playAudio(fileBuffer)   → Audio element
    → 'image'  → viewImage(fileBuffer)   → Image element
    → 'pdf'    → viewPdf(fileBuffer)     → iframe with data URL
```

### File Metadata Schema

```json
{
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "senderId": "alice-user-id",
  "recipientId": "bob-user-id",
  "fileName": "secret-video.mp4",
  "fileSize": 52428800,
  "mediaType": "video",
  "policy": "ONE_VIEW",
  "wrappedFK": "base64-encoded-wrapped-file-key...",
  "chunkCount": 800
}
```

---

## 🔐 3. OneView Enforcement Flow

OneView is enforced at **two independent layers** — client and server — for defense in depth.

```
User opens file
      │
      ▼
[CLIENT] hasFileOpened(userId, fileId)
      │
      ├── true  → ❌ BLOCKED immediately (no network call)
      │           "OneView: File has already been opened."
      │
      └── false → POST /file/request-key { userId, fileId }
                        │
                        ▼
              [SERVER] checkIfOpened(fileId, userId)
                  └── scan Log.encryptedLogEntries for
                      { eventType: "FILE_OPENED", fileId }
                        │
                        ├── found → { allowed: false }
                        │          ❌ Key denied at server level
                        │
                        └── not found → { allowed: true, wrappedFK }
                                           ✅ Key released (once only)
                                           │
                                           ▼
                               Client decrypts + plays file
                                           │
                                           ▼
                               appendLog("FILE_OPENED", fileId)
                               ← PERMANENT mark in hash chain
                                           │
                                           ▼
                         Second attempt → BLOCKED by client check
                         (and server check if client is bypassed)
```

**Why two layers?**
- Client check: instant UX feedback, no wasted API call
- Server check: guards against compromised/modified clients

---

## 📜 4. Log Chain Flow

```
Event occurs (e.g., MESSAGE_SENT)
      │
      ▼
appendLog(eventType, id, metadata, userContext)
      │
      ├── Get prevHash from last log entry
      │   (or GENESIS_HASH = "000...000" for first entry)
      │
      ├── encryptPayload(metadata, userPrivKey)
      │   → AES-GCM encrypt with key derived from userPrivKey
      │   → payloadEncrypted = base64 string
      │
      ├── Build partial entry:
      │   { logId, userId, eventType, fileId/msgId,
      │     timestamp, prevHash, payloadEncrypted }
      │
      ├── computeHash(partialEntry)
      │   → SHA-256({ logId, eventType, fileId, msgId,
      │               timestamp, prevHash, payloadEncrypted })
      │   → currentHash = hex string
      │
      ├── signLogEntry(entry, userPrivKey)
      │   → Ed25519 signature
      │   → signature = base64 string
      │
      └── Append to local log chain
            │
            ▼
      syncLogsWithServer(userId, token)
            │
            ├── POST /log/append { logEntry }  → stored on server
            ├── GET /log/sync → fetch all server entries
            └── Keep longest valid chain (conflict resolution)

verifyLogChain(logEntries)
      │
      ├── Sort by timestamp
      ├── For each entry:
      │   ├── Check entry.prevHash === previous entry.currentHash
      │   └── Recompute SHA-256 → must match entry.currentHash
      └── Returns true only if entire chain is intact
```

### Log Entry Schema

```json
{
  "logId": "uuid-v4",
  "userId": "alice-user-id",
  "eventType": "MESSAGE_SENT",
  "fileId": null,
  "msgId": "msg-uuid",
  "timestamp": 1720000000000,
  "prevHash": "a3f8c2d1...(64 hex chars)",
  "currentHash": "9b7e4f2a...(64 hex chars)",
  "payloadEncrypted": "base64-AES-GCM-encrypted-metadata...",
  "signature": "base64-Ed25519-signature..."
}
```

---

## 🧠 5. Crypto Flow

### ECDH Shared Secret Derivation

```
Alice (priv_A, pub_A)    Bob (priv_B, pub_B)

X25519(priv_A, pub_B) == X25519(priv_B, pub_A)  [Diffie-Hellman property]
        │
        ▼
rawSecret = x25519.getSharedSecret(privKey, remotePub)
        │
        ▼
sharedSecret = SHA-256(rawSecret)   ← uniform 32-byte AES key
```

### AES-GCM Encryption/Decryption

```
encrypt(plaintext, key):
  nonce = randomBytes(12)         ← 96-bit, unique per message
  cipher = AES-256-GCM(key, nonce)
  encrypted = cipher.update(plaintext) + cipher.final()
  tag = cipher.getAuthTag()       ← 16-byte authentication tag
  ct = encrypted || tag           ← append tag to ciphertext
  return { ct, nonce }

decrypt(ct, nonce, key):
  tag = ct[-16:]                  ← extract auth tag
  ciphertext = ct[:-16]
  decipher = AES-256-GCM(key, nonce)
  decipher.setAuthTag(tag)        ← verify authenticity
  return decipher.update(ciphertext) + decipher.final()
                                  ← throws if tag doesn't match
```

### File Key Wrapping

```
wrapFileKey(fileKey, recipientPub, senderPriv):
  sharedSecret = deriveSharedSecret(senderPriv, recipientPub)
  { ct, nonce } = encryptSymmetric(fileKey, sharedSecret)
  wrappedFK = nonce(12 bytes) || ct(48 bytes)   ← 60 bytes total
  return wrappedFK

unwrapFileKey(wrappedFK, senderPub, recipientPriv):
  sharedSecret = deriveSharedSecret(recipientPriv, senderPub)
  nonce = wrappedFK[0:12]
  ct = wrappedFK[12:]
  fileKey = decryptSymmetric(ct, nonce, sharedSecret)
  return fileKey                  ← 32-byte original file key
```

### Log Signing (Ed25519)

```
signLogEntry(entry, userPrivKey):
  msg = Buffer.from(JSON.stringify(entry))
  signature = ed25519.sign(msg, userPrivKey)    ← 64 bytes
  return signature

verifyLogEntry(entry, signature, userPubKey):
  msg = Buffer.from(JSON.stringify(entry))
  return ed25519.verify(signature, msg, userPubKey)  ← boolean
```

---

## 🗂️ 6. Module Integration Map

```
                    ┌──────────────────┐
                    │  CRYPTO (Dev 1)  │
                    │  keygen.js       │
                    │  ecdh.js         │
                    │  symmetric.js    │
                    │  wrapKey.js      │
                    │  sign.js         │
                    └────────┬─────────┘
                             │ used by
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ MESSAGING    │  │  FILES       │  │  LOGS        │
    │ (Dev 2)      │  │  (Dev 3)     │  │  (Dev 5)     │
    │ encryptMsg() │  │ encryptFile()│  │ appendLog()  │
    │ decryptMsg() │  │ decryptFile()│  │ verifyChain()│
    │ sendMessage()│  │ openFile()   │  │ hasOpened()  │
    │ receiveMsg() │  │ uploadFile() │  │ syncLogs()   │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                  │
           └─────────────────┼──────────────────┘
                             │ REST API calls
                             ▼
                   ┌──────────────────┐
                   │  BACKEND (Dev 4) │
                   │  /auth/*         │
                   │  /message/*      │
                   │  /file/*         │
                   │  /log/*          │
                   │  OneViewService  │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │    MongoDB       │
                   │  users           │
                   │  messages        │
                   │  files           │
                   │  logs            │
                   └──────────────────┘
```

---

## 🔒 Security Properties

| Property | Implementation |
|----------|----------------|
| End-to-End Encryption | AES-256-GCM with ECDH shared secret |
| Forward Secrecy | Per-message nonces; per-file keys |
| Zero-Knowledge Backend | Server stores only ciphertext — never decrypts |
| OneView Enforcement | Dual-layer: client log + server log gate |
| Tamper-Proof Logs | SHA-256 hash chain; Ed25519 signatures |
| Key Isolation | File keys wrapped per-recipient; never transmitted plaintext |
| Memory Hygiene | `zeroBuffer()` wipes keys after use |
| Replay Protection | Log chain rejects duplicate logIds |

---

## 🧪 Running Tests

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Unit tests (crypto, logs, messaging, files)
npm run test:unit

# Integration tests (real API, in-memory MongoDB)
npm run test:integration

# Full end-to-end pipeline verification
npm run test:pipeline

# All tests
npm test
```

---

## 🐳 Docker Deployment

```bash
# One-command startup
docker-compose up --build

# Services:
#   Frontend  → http://localhost:3000
#   Backend   → http://localhost:3001
#   MongoDB   → mongodb://localhost:27017
```

---

## 📁 Project Structure

```
otterchat/
├── crypto/               # Dev 1: Crypto primitives
│   ├── keygen.js         # X25519 keypair generation
│   ├── ecdh.js           # ECDH shared secret
│   ├── symmetric.js      # AES-256-GCM
│   ├── wrapKey.js        # File key wrap/unwrap
│   ├── sign.js           # Ed25519 signing
│   ├── utils.js          # Buffer utilities
│   └── index.js
├── messaging/            # Dev 2: E2EE messaging engine
│   ├── messageSchema.js
│   ├── sendMessage.js
│   ├── receiveMessages.js
│   ├── messageStore.js
│   ├── messageService.js
│   └── index.js
├── files/                # Dev 3: File encryption + transfer
│   ├── encryptFile.js
│   ├── decryptFile.js
│   ├── upload.js
│   ├── download.js
│   ├── fileMetadata.js
│   ├── index.js
│   └── utils/
│       ├── chunk.js
│       └── buffer.js
├── logs/                 # Dev 5: Hash-chained audit logs
│   ├── logManager.js
│   ├── hash.js
│   ├── verify.js
│   ├── oneView.js
│   ├── sync.js
│   ├── schema.js
│   └── utils.js
├── server/               # Dev 4: Zero-knowledge backend
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── services/
│   └── utils/
├── client/               # React frontend
│   └── src/
│       ├── components/
│       ├── services/
│       └── utils/
├── tests/
│   ├── unit/             # Crypto, logs, messaging, files
│   ├── integration/      # Real API tests
│   └── pipeline.test.js  # Full E2E pipeline
├── docs/
│   └── WORKFLOW.md       # This file
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── .env.example
```
