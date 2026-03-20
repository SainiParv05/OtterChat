import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../services/AuthContext';
import { api } from '../services/api';
import { encryptMessage, decryptMessage, bufferToBase64, base64ToBuffer } from '../utils/crypto';

const s = {
  app: { display: 'flex', height: '100vh', background: '#0d1117', color: '#e6edf3' },
  sidebar: { width: 300, background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column', padding: 16, overflowY: 'auto' },
  header: { fontSize: 18, fontWeight: 600, color: '#58a6ff', marginBottom: 16 },
  input: { padding: '8px 12px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 13, outline: 'none', marginBottom: 8, width: '100%' },
  btn: (bg) => ({ padding: '8px', background: bg || '#238636', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, width: '100%', marginBottom: 12 }),
  section: { marginTop: 20, paddingTop: 16, borderTop: '1px solid #30363d' },
  chat: { flex: 1, display: 'flex', flexDirection: 'column' },
  chatHeader: { padding: '14px 20px', borderBottom: '1px solid #30363d', background: '#161b22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  msgBubble: (mine) => ({
    maxWidth: '60%', alignSelf: mine ? 'flex-end' : 'flex-start',
    background: mine ? '#1f6feb' : '#21262d', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    padding: '10px 16px', fontSize: 14, color: '#e6edf3'
  }),
  msgMeta: (mine) => ({ fontSize: 11, color: '#8b949e', marginTop: 4, textAlign: mine ? 'right' : 'left' }),
};

export default function Chat() {
  const { session, logout } = useAuth();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  // Registration
  const [myOnion, setMyOnion] = useState('');
  const [registered, setRegistered] = useState(false);

  // Directory Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // P2P Sessions from node state
  const [sessions, setSessions] = useState({});
  const [activeChat, setActiveChat] = useState(null); // onionUrl of current chat

  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Polling Local P2P Node Status
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const { data } = await api.getState();
        setSessions(data.sessions || {});

        if (data.messages && data.messages.length > 0) {
          // Attempt to decrypt and push to state
          const newMsgs = await Promise.all(data.messages.map(async (m) => {
            try {
              // We need the sender's public key (from sessions state)
              const peerSession = data.sessions[m.fromOnion];
              if (!peerSession || !peerSession.publicKey) throw new Error('No pubkey');

              const ct = base64ToBuffer(m.encryptedPayload.ciphertext);
              const nonce = base64ToBuffer(m.encryptedPayload.nonce);
              const text = await decryptMessage(ct, nonce, peerSession.publicKey, session.keyPair.priv);
              return { id: Date.now() + Math.random(), text, mine: false, fromOnion: m.fromOnion };
            } catch (e) {
              return { id: Date.now() + Math.random(), text: '[Decryption Failed]', mine: false, fromOnion: m.fromOnion };
            }
          }));
          setMessages(prev => [...prev, ...newMsgs]);
        }
      } catch (e) {
        console.error('Failed to poll state', e);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [session]);

  const handleRegister = async () => {
    if (!myOnion) return;
    try {
      await api.directoryRegister({ userId: session.userId, publicKey: session.keyPair.pub, onionAddress: myOnion });
      setRegistered(true);
    } catch (e) {
      alert('Directory Registration Failed');
    }
  };

  const handleSearch = async () => {
    try {
      const { data } = await api.directorySearch(searchQuery);
      setSearchResults(data);
    } catch (e) {
      alert('Search Failed');
    }
  };

  const sendRequest = async (targetOnion) => {
    try {
      await api.outboundRequest({ targetOnion, myUserId: session.userId, myOnion, myPublicKey: session.keyPair.pub });
      alert('Request Sent via Tor SOCKS5!');
    } catch (e) {
      alert('Failed to route request');
    }
  };

  const acceptRequest = async (targetOnion) => {
    try {
      await api.outboundAccept({ targetOnion, myOnion, myPublicKey: session.keyPair.pub });
      setActiveChat(targetOnion);
    } catch (e) {
      alert('Failed to accept');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat || !sessions[activeChat]) return;
    const peerPub = sessions[activeChat].publicKey;
    try {
      const { ct, nonce } = await encryptMessage(input, session.keyPair.priv, peerPub);
      await api.outboundMessage({
        targetOnion: activeChat,
        myOnion,
        encryptedPayload: { ciphertext: bufferToBase64(ct), nonce: bufferToBase64(nonce) }
      });
      setMessages(p => [...p, { id: Date.now(), text: input, mine: true, fromOnion: activeChat }]);
      setInput('');
    } catch (e) {
      alert('Failed to send encrypted message');
    }
  };

  const disconnect = async () => {
    if (activeChat) {
      await api.outboundDisconnect({ targetOnion: activeChat, myOnion });
      setActiveChat(null);
      setMessages([]); // Burn ephemerals
    }
  };

  const uiLogout = async () => {
    await disconnect();
    logout();
  };

  const pendingIncoming = Object.entries(sessions).filter(([_, s]) => s.state === 'pending_incoming');
  const connectedPeers = Object.entries(sessions).filter(([_, s]) => s.state === 'connected');

  return (
    <div style={s.app}>
      <div style={s.sidebar}>
        <div style={s.header}>🦦 TorP2P Node</div>
        <div style={{ fontSize: 12, marginBottom: 16, color: '#8b949e' }}>ID: {session.userId}</div>

        {!registered ? (
          <div>
            <div style={{ fontSize: 12, marginBottom: 8 }}>Register your node to Directory:</div>
            <input style={s.input} placeholder="Your .onion address..." value={myOnion} onChange={e => setMyOnion(e.target.value)} />
            <button style={s.btn('#1f6feb')} onClick={handleRegister}>Publish Node Contact</button>
          </div>
        ) : (
          <div style={{ color: '#3fb950', fontSize: 12, marginBottom: 16 }}>✅ Registered as {myOnion}</div>
        )}

        <div style={s.section}>
          <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 600 }}>🔍 Search Directory</div>
          <input style={s.input} placeholder="User ID..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <button style={s.btn('#2ea043')} onClick={handleSearch}>Search Tor Directory</button>
          {searchResults.map(res => (
            <div key={res.onionAddress} style={{ background: '#21262d', padding: 8, borderRadius: 4, marginBottom: 8 }}>
              <div style={{ fontSize: 12 }}>{res.userId}</div>
              <button style={{ ...s.btn('#1f6feb'), marginTop: 8, padding: 4 }} onClick={() => sendRequest(res.onionAddress)}>Connect</button>
            </div>
          ))}
        </div>

        {pendingIncoming.length > 0 && (
          <div style={s.section}>
            <div style={{ fontSize: 13, marginBottom: 8, color: '#d29922' }}>🔔 Incoming Requests</div>
            {pendingIncoming.map(([onion, peer]) => (
              <div key={onion} style={{ background: '#3d2e13', padding: 8, borderRadius: 4, marginBottom: 8 }}>
                <div style={{ fontSize: 12 }}>{peer.userId} ({onion.slice(0, 10)}...)</div>
                <button style={{ ...s.btn('#2ea043'), marginTop: 8, padding: 4 }} onClick={() => acceptRequest(onion)}>Accept Session</button>
              </div>
            ))}
          </div>
        )}

        <div style={s.section}>
          <div style={{ fontSize: 13, marginBottom: 8, fontWeight: 600 }}>🌐 Active Tor Sessions</div>
          {connectedPeers.map(([onion, peer]) => (
            <div key={onion} onClick={() => setActiveChat(onion)} style={{ background: activeChat === onion ? '#1f6feb' : '#21262d', padding: 10, borderRadius: 6, cursor: 'pointer', marginBottom: 6, fontSize: 13 }}>
              {onion.slice(0, 15)}...
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <button style={s.btn('#da3633')} onClick={uiLogout}>Burn Session & Logout</button>
      </div>

      <div style={s.chat}>
        {activeChat ? (
          <>
            <div style={s.chatHeader}>
              <div>
                <span style={{ fontSize: 15, fontWeight: 600 }}>🔒 E2EE Tor Peer</span>
                <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>{activeChat}</div>
              </div>
              <button style={{ padding: '6px 12px', background: 'none', border: '1px solid #30363d', color: '#e6edf3', borderRadius: 4, cursor: 'pointer' }} onClick={disconnect}>Burn Chat</button>
            </div>
            <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.filter(m => m.fromOnion === activeChat).map(msg => (
                <div key={msg.id} style={{ alignSelf: msg.mine ? 'flex-end' : 'flex-start' }}>
                  <div style={s.msgBubble(msg.mine)}>{msg.text}</div>
                  <div style={s.msgMeta(msg.mine)}>{msg.mine ? 'You' : 'Peer'}</div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={sendMessage} style={{ padding: 16, borderTop: '1px solid #30363d', background: '#161b22', display: 'flex', gap: 10 }}>
              <input style={s.input} value={input} onChange={e => setInput(e.target.value)} placeholder="Send zero-knowledge message..." />
              <button type="submit" style={{ ...s.btn('#1f6feb'), width: 'auto', marginBottom: 0, padding: '0 24px' }}>Send</button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 48 }}>🧅</div>
            <div style={{ fontWeight: 600, color: '#e6edf3', fontSize: 18 }}>P2P Tor Routing Active</div>
            <div>Select an active session or search the directory to start</div>
            <div>No data touches persistent storage.</div>
          </div>
        )}
      </div>
    </div>
  );
}
