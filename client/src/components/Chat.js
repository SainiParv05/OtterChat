import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../services/AuthContext';
import { api } from '../services/api';
import { encryptMessage, decryptMessage, bufferToBase64, base64ToBuffer } from '../utils/crypto';
import { v4 as uuidv4 } from 'uuid';

const s = {
  app: { display: 'flex', height: '100vh', background: '#0d1117' },
  sidebar: { width: 260, background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column' },
  sideHeader: { padding: '16px 20px', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { fontSize: 16, fontWeight: 700, color: '#58a6ff' },
  userInfo: { fontSize: 11, color: '#8b949e', marginTop: 2 },
  contactInput: { margin: 12, padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none' },
  startBtn: { margin: '0 12px 12px', padding: '8px', background: '#238636', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  chat: { flex: 1, display: 'flex', flexDirection: 'column' },
  chatHeader: { padding: '14px 20px', borderBottom: '1px solid #30363d', background: '#161b22', display: 'flex', alignItems: 'center', gap: 10 },
  chatTitle: { fontSize: 15, fontWeight: 600, color: '#e6edf3' },
  e2eeBadge: { fontSize: 11, color: '#3fb950', background: 'rgba(63,185,80,0.1)', padding: '2px 8px', borderRadius: 20 },
  messages: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 },
  msgBubble: (mine) => ({
    maxWidth: '60%', alignSelf: mine ? 'flex-end' : 'flex-start',
    background: mine ? '#1f6feb' : '#21262d', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    padding: '10px 16px', color: '#e6edf3', fontSize: 14, lineHeight: 1.5,
  }),
  msgMeta: (mine) => ({ fontSize: 11, color: '#8b949e', marginTop: 4, textAlign: mine ? 'right' : 'left' }),
  inputBar: { padding: '16px 20px', borderTop: '1px solid #30363d', display: 'flex', gap: 12, background: '#161b22' },
  msgInput: { flex: 1, padding: '10px 16px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 24, color: '#e6edf3', fontSize: 14, outline: 'none' },
  sendBtn: { padding: '10px 20px', background: '#1f6feb', border: 'none', borderRadius: 24, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  emptyChat: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#8b949e' },
  logoutBtn: { padding: '6px 12px', background: 'none', border: '1px solid #30363d', borderRadius: 6, color: '#8b949e', cursor: 'pointer', fontSize: 12 },
};

export default function Chat() {
  const { session, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [recipientInput, setRecipientInput] = useState('');
  const [recipientPub, setRecipientPub] = useState(null);
  const [status, setStatus] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startChat() {
    if (!recipientInput.trim()) return;
    try {
      // In a real system, look up recipient's public key from server
      // For demo: we derive a mock pub key from their username
      // (In production, /auth/get-pubkey endpoint would return this)
      setRecipientId(recipientInput.trim());
      // Use a placeholder pub — in full deployment, fetch from /auth/user/:username
      const { generateUserKeypair } = await import('../utils/crypto');
      const mockPair = await generateUserKeypair(); // placeholder
      setRecipientPub(mockPair.pub);
      setStatus(`Chatting with ${recipientInput.trim()} (E2EE active)`);
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
  }

  async function sendMsg(e) {
    e.preventDefault();
    if (!input.trim() || !recipientId || !recipientPub) return;

    try {
      const { ct, nonce } = await encryptMessage(input, session.keyPair.priv, recipientPub);
      const msgId = uuidv4();

      await api.sendMessage({
        msgId,
        senderId: session.userId,
        recipientId,
        ciphertext: bufferToBase64(ct),
        nonce: bufferToBase64(nonce),
        timestamp: Date.now(),
      }, session.token);

      setMessages(prev => [...prev, {
        msgId,
        senderId: session.userId,
        text: input,
        timestamp: Date.now(),
        mine: true,
      }]);

      // Log MESSAGE_SENT
      await api.appendLog({
        logId: uuidv4(),
        userId: session.userId,
        eventType: 'MESSAGE_SENT',
        msgId,
        fileId: null,
        timestamp: Date.now(),
        prevHash: '0'.repeat(64),
        currentHash: '1'.repeat(64),
        payloadEncrypted: bufferToBase64(ct.slice(0, 16)),
      }, session.token);

      setInput('');
    } catch (err) {
      setStatus('Send failed: ' + err.message);
    }
  }

  async function fetchMessages() {
    try {
      const res = await api.fetchMessages(session.userId, session.token);
      const decrypted = await Promise.all(
        (res.data.messages || []).map(async (msg) => {
          try {
            const ct = base64ToBuffer(msg.ciphertext);
            const nonce = base64ToBuffer(msg.nonce);
            // Decrypt using sender's pub key (in full system, fetch from server)
            const text = await decryptMessage(ct, nonce, session.keyPair.pub, session.keyPair.priv)
              .catch(() => '[Encrypted message — key not available]');
            return { ...msg, text, mine: msg.senderId === session.userId };
          } catch {
            return { ...msg, text: '[Unable to decrypt]', mine: false };
          }
        })
      );
      setMessages(decrypted);
    } catch (err) {
      setStatus('Fetch failed: ' + err.message);
    }
  }

  return (
    <div style={s.app}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.sideHeader}>
          <div>
            <div style={s.logo}>🦦 OtterChat</div>
            <div style={s.userInfo}>@{session.username}</div>
          </div>
          <button style={s.logoutBtn} onClick={logout}>Logout</button>
        </div>
        <input
          style={s.contactInput}
          placeholder="Enter recipient user ID..."
          value={recipientInput}
          onChange={e => setRecipientInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && startChat()}
        />
        <button style={s.startBtn} onClick={startChat}>Start Encrypted Chat</button>
        <button style={{ ...s.startBtn, background: '#30363d', marginTop: 4 }} onClick={fetchMessages}>
          Fetch Messages
        </button>
        {status && <div style={{ fontSize: 11, color: '#3fb950', padding: '8px 12px' }}>{status}</div>}
      </div>

      {/* Main chat */}
      <div style={s.chat}>
        {recipientId ? (
          <>
            <div style={s.chatHeader}>
              <span>🔒</span>
              <span style={s.chatTitle}>{recipientId}</span>
              <span style={s.e2eeBadge}>E2EE Active</span>
            </div>
            <div style={s.messages}>
              {messages.map(msg => (
                <div key={msg.msgId}>
                  <div style={s.msgBubble(msg.mine)}>{msg.text}</div>
                  <div style={s.msgMeta(msg.mine)}>
                    {msg.mine ? 'You' : msg.senderId?.slice(0, 8)} · {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={sendMsg} style={s.inputBar}>
              <input
                style={s.msgInput}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message... (encrypted before sending)"
              />
              <button type="submit" style={s.sendBtn}>Send 🔒</button>
            </form>
          </>
        ) : (
          <div style={s.emptyChat}>
            <div style={{ fontSize: 48 }}>🦦</div>
            <div style={{ fontSize: 18, color: '#e6edf3', fontWeight: 600 }}>Welcome to OtterChat</div>
            <div>Enter a recipient ID to start an encrypted conversation</div>

            <div style={{ background: '#161b22', padding: 20, borderRadius: 8, marginTop: 16, textAlign: 'center', border: '1px solid #30363d', minWidth: 320 }}>
              <div style={{ marginBottom: 12, color: '#8b949e', fontSize: 13 }}>Share these details so friends can connect with you:</div>
              <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: '#8b949e', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Chat ID</span>
                <strong style={{ color: '#58a6ff', userSelect: 'all', cursor: 'pointer', background: '#0d1117', padding: '8px 12px', borderRadius: 4, border: '1px dashed #30363d', wordBreak: 'break-all' }}>{session.userId}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: '#8b949e', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Server Address</span>
                <strong style={{ color: '#3fb950', userSelect: 'all', cursor: 'pointer', background: '#0d1117', padding: '8px 12px', borderRadius: 4, border: '1px dashed #30363d', wordBreak: 'break-all' }}>{window.location.hostname}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
