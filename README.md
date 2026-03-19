# 🦦 OtterChat

**Zero-Knowledge End-to-End Encrypted Messaging & File Sharing**

> The backend **never** sees plaintext. All encryption happens on the client.
> OneView enforcement is cryptographically enforced. Logs are tamper-proof.

---

## 🚀 Quick Start

```bash
# Clone and configure
cp .env.example .env

# Docker (one command)
docker-compose up --build

# Or run locally:
npm install
npm start          # backend on :3001
cd client && npm install && npm start  # frontend on :3000
```

---

## 🏗️ Architecture

| Layer | Technology | Role |
|-------|-----------|------|
| Crypto | X25519 ECDH + AES-256-GCM + Ed25519 | All encryption |
| Messaging | Node.js + axios | E2EE message send/receive |
| Files | Chunked AES-GCM | Encrypted file transfer |
| Logs | SHA-256 hash chain + Ed25519 | Tamper-proof audit |
| Backend | Express.js + MongoDB | Zero-knowledge relay |
| Frontend | React + Nginx | Chat UI & Reverse Proxy |

---

## 🔐 Security Properties

- **End-to-End Encryption** — AES-256-GCM, keys derived via X25519 ECDH
- **Zero-Knowledge Backend** — Server stores only ciphertext blobs
- **OneView Enforcement** — Files can be opened exactly once (dual-layer: client + server)
- **Tamper-Proof Logs** — SHA-256 hash chain with Ed25519 signatures
- **Perfect Forward Secrecy** — Per-message nonces, per-file random keys
- **Memory Hygiene** — File keys zeroed after use

---

## 🧅 Hosting on Tor (Anonymity)

For ultimate server anonymity, OtterChat can be easily hosted as a Tor Hidden Service:

1. Install Tor: `sudo apt install tor`
2. Add the following to your `/etc/tor/torrc`:
   ```text
   HiddenServiceDir /var/lib/tor/otterchat/
   HiddenServicePort 80 127.0.0.1:3000
   ```
3. Restart the Tor daemon: `sudo systemctl restart tor`
4. Retrieve your shareable address: `sudo cat /var/lib/tor/otterchat/hostname`

Your frontend will automatically detect the `.onion` address and display it correctly in the Chat Dashboard for easy sharing!

---

## 🧪 Testing

```bash
npm run test:unit        # Crypto, logs, messaging, files unit tests
npm run test:integration # Real API integration tests
npm run test:pipeline    # Full end-to-end pipeline verification
npm test                 # All tests
```

The pipeline test verifies:
- ✔ Send message → receive + decrypt
- ✔ Upload file → download + decrypt
- ✔ OneView: second open blocked
- ✔ Log chain integrity verified
- ✔ Zero-knowledge: no plaintext in blobs

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register with public key |
| POST | `/auth/login` | Get JWT token |
| POST | `/message/send` | Store encrypted message |
| GET | `/message/fetch?userId=` | Fetch encrypted messages |
| POST | `/file/upload` | Upload encrypted chunks |
| GET | `/file/download/:fileId` | Download encrypted chunks |
| POST | `/file/request-key` | OneView-gated key release |
| POST | `/log/append` | Store encrypted log entry |
| GET | `/log/sync?userId=` | Sync log chain |

---

## 📖 Documentation

See [`docs/WORKFLOW.md`](docs/WORKFLOW.md) for:
- Full end-to-end flow diagrams
- Data format at each step
- OneView enforcement flow
- Log chain cryptography
- Architecture diagram

---

## 📁 Module Overview

| Module | Dev | Location |
|--------|-----|----------|
| Crypto primitives | Dev 1 | `crypto/` |
| Messaging engine | Dev 2 | `messaging/` |
| File transfer | Dev 3 | `files/` |
| Backend API | Dev 4 | `server/` |
| Audit logs | Dev 5 | `logs/` |
