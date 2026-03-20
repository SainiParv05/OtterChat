import React, { useState } from 'react';
import { useAuth } from '../services/AuthContext';
import { api } from '../services/api';

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0d1117' },
  card: { background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 40, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' },
  title: { fontSize: 28, fontWeight: 700, color: '#58a6ff', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#8b949e', fontSize: 13, textAlign: 'center', marginBottom: 32 },
  label: { display: 'block', color: '#8b949e', fontSize: 12, marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' },
  input: { width: '100%', padding: '10px 14px', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#e6edf3', fontSize: 14, outline: 'none', marginBottom: 16 },
  btn: { width: '100%', padding: '11px', background: '#238636', border: 'none', borderRadius: 6, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 12 },
  toggle: { color: '#58a6ff', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'center' },
  error: { color: '#f85149', fontSize: 13, marginBottom: 12, textAlign: 'center', background: 'rgba(248,81,73,0.1)', padding: '8px', borderRadius: '4px' },
  badge: { display: 'flex', alignItems: 'center', gap: 6, color: '#3fb950', fontSize: 12, justifyContent: 'center', marginTop: 20 },
};

export default function Login() {
  const { register, login } = useAuth();

  // Stages: 'serverSetup' -> 'login' -> 'register'
  const [mode, setMode] = useState('serverSetup');

  const [serverUrl, setServerUrl] = useState('http://localhost:4000');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleServerSetup(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!serverUrl.trim()) throw new Error('Please enter a valid URL');
      // Tell backend to ping & update its DS URL
      await api.setDirectoryServer({ url: serverUrl.trim() });
      setMode('login');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.title}>🦦 OtterChat</div>
        <div style={styles.subtitle}>Zero-Knowledge End-to-End Encrypted Messenger</div>
        {error && <div style={styles.error}>{error}</div>}

        {mode === 'serverSetup' ? (
          <form onSubmit={handleServerSetup}>
            <label style={styles.label}>Directory Server Address</label>
            <input
              style={styles.input}
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="e.g. http://192.168.1.x:4000 or https://ngrok.app"
              required
            />
            <button style={styles.btn} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect to Network'}
            </button>
            <div style={{ ...styles.badge, color: '#8b949e' }}>
              Configure P2P Directory Gateway
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleAuth}>
              <label style={styles.label}>Username</label>
              <input style={styles.input} value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required />
              <label style={styles.label}>Password</label>
              <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
              <button style={styles.btn} disabled={loading}>
                {loading ? 'Encrypting keys...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
            <button style={styles.toggle} onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
            </button>
            <div style={styles.badge}>
              <span>🔒</span> Keys generated client-side
            </div>
          </>
        )}
      </div>
    </div>
  );
}
