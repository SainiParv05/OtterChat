import React from 'react';
import { AuthProvider, useAuth } from './services/AuthContext';
import Login from './components/Login';
import Chat from './components/Chat';

function AppInner() {
  const { session } = useAuth();
  return session ? <Chat /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
