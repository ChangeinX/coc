import { useEffect, useState } from 'react';

function isTokenExpired(tok) {
  try {
    const payload = JSON.parse(atob(tok.split('.')[1]));
    return Date.now() >= payload.exp * 1000 - 60000;
  } catch {
    return true;
  }
}

export default function useGoogleIdToken() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  useEffect(() => {
    if (!window.google?.accounts?.id) return;

    const fetchToken = () => {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (res) => {
          localStorage.setItem('token', res.credential);
          setToken(res.credential);
        },
      });
      window.google.accounts.id.prompt();
    };

    if (!token || isTokenExpired(token)) {
      fetchToken();
    }
  }, [token]);

  return token;
}
