import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchJSON, fetchJSONWithError } from '../lib/api.js';

const AuthContext = createContext({ user: null, login: () => {}, logout: () => {}, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    const hasSession = document.cookie
      .split(';')
      .some((c) => c.trim().startsWith('sid='));
    if (!hasSession) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await fetchJSON('/user/me');
      setUser(me);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
    }
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  async function login(idToken) {
    await fetchJSONWithError('/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    await loadMe();
  }

  async function logout() {
    await fetchJSONWithError('/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
