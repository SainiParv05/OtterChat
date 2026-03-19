/**
 * CLIENT - Auth Context
 * Stores session: userId, token, keypair (in memory only — never persisted)
 */
import React, { createContext, useContext, useState } from 'react';
import { api } from '../services/api';
import { generateUserKeypair, bufferToBase64 } from '../utils/crypto';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { userId, token, username, keyPair }

  async function register(username, password) {
    const keyPair = await generateUserKeypair();
    const userPubKey = bufferToBase64(keyPair.pub);
    const res = await api.register({ username, password, userPubKey });
    const { userId, token } = res.data;
    setSession({ userId, token, username, keyPair });
    return { userId, token };
  }

  async function login(username, password) {
    // On login, regenerate keypair (in a real system, derive from password or load from secure storage)
    const keyPair = await generateUserKeypair();
    const res = await api.login({ username, password });
    const { userId, token } = res.data;
    setSession({ userId, token, username, keyPair });
    return { userId, token };
  }

  function logout() {
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{ session, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
