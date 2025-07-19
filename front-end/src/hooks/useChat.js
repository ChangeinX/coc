import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import useGoogleIdToken from './useGoogleIdToken.js';
import { fetchJSON } from '../lib/api.js';

export default function useChat(groupId) {
  const token = useGoogleIdToken();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!groupId || !token) return;
    let ignore = false;
    let socket;

    async function setup() {
      console.log('Fetching history for group', groupId);
      try {
        const data = await fetchJSON(
          `/chat/history/${encodeURIComponent(groupId)}?limit=100`,
        );
        if (!ignore) {
          console.log('History loaded', data);
          setMessages(data);
        }
      } catch (err) {
        console.error('Error loading history', err);
      }

      if (ignore) return;
      console.log('Connecting socket for group', groupId);
      const base = import.meta.env.VITE_API_URL || window.location.origin;
      socket = io(base, {
        path: '/api/v1/chat/socket.io',
        query: { token, groupId },
      });
      socket.on('message', (msg) => {
        setMessages((m) => (m.some((x) => x.ts === msg.ts) ? m : [...m, msg]));
      });
      socket.on('connect_error', (err) => console.error('socket error', err));
    }

    setup();

    return () => {
      ignore = true;
      if (socket) {
        console.log('Closing socket for group', groupId);
        socket.disconnect();
      }
    };
  }, [groupId, token]);

  return { messages };
}
