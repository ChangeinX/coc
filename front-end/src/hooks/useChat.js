import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import useGoogleIdToken from './useGoogleIdToken.js';
import { API_URL, fetchJSON } from '../lib/api.js';

const PAGE_SIZE = 20;

export default function useChat(groupId) {
  const token = useGoogleIdToken();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!groupId || !token) return;
    let ignore = false;
    let client;

    async function setup() {
      console.log('Fetching history for group', groupId);
      try {
        const data = await fetchJSON(
          `/chat/history/${encodeURIComponent(groupId)}?limit=${PAGE_SIZE}`,
        );
        if (!ignore) {
          console.log('History loaded', data);
          setMessages(data);
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch (err) {
        console.error('Error loading history', err);
      }

      if (ignore) return;
      console.log('Connecting socket for group', groupId);
      const base = API_URL || window.location.origin;
      client = new Client({
        webSocketFactory: () => new SockJS(`${base}/api/v1/chat/socket`),
        onConnect: () => {
          client.subscribe(`/topic/chat/${groupId}`, (frame) => {
            try {
              const msg = JSON.parse(frame.body);
              setMessages((m) =>
                m.some((x) => x.ts === msg.ts) ? m : [...m, msg]
              );
            } catch (err) {
              console.error('Failed to parse message', err);
            }
          });
        },
      });
      client.activate();
    }

    setup();

    return () => {
      ignore = true;
      if (client) {
        console.log('Closing socket for group', groupId);
        client.deactivate();
      }
  };
  }, [groupId, token]);

  async function loadMore() {
    if (!hasMore || messages.length === 0) return;
    const before = encodeURIComponent(messages[0].ts);
    try {
      const older = await fetchJSON(
        `/chat/history/${encodeURIComponent(groupId)}?limit=${PAGE_SIZE}&before=${before}`,
      );
      setMessages((m) => [...older, ...m]);
      if (older.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.error('Failed to load older messages', err);
    }
  }

  return { messages, loadMore, hasMore };
}
