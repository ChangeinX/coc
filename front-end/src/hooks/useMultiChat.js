import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import useGoogleIdToken from './useGoogleIdToken.js';
import { API_URL } from '../lib/api.js';
import { graphqlRequest } from '../lib/gql.js';
import {
  getOutboxMessages,
  removeOutboxMessage,
  getMessageCache,
  putMessageCache,
} from '../lib/db.js';

const PAGE_SIZE = 20;
const CACHE_LIMIT = 50;
const SHARD_COUNT = 20;

function javaHashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function globalShardFor(userId) {
  const hash = javaHashCode(userId);
  const mod = ((hash % SHARD_COUNT) + SHARD_COUNT) % SHARD_COUNT;
  return `global#shard-${mod}`;
}

export default function useMultiChat(ids = []) {
  const token = useGoogleIdToken();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [connected, setConnected] = useState(false);

  function appendMessage(msg) {
    setMessages((m) => {
      const arr = [...m, msg];
      arr.sort((a, b) => new Date(a.ts) - new Date(b.ts));
      return arr;
    });
  }

  useEffect(() => {
    if (!token || ids.length === 0) return;
    let ignore = false;
    let client;

    async function flushOutbox() {
      const pending = (await getOutboxMessages()).filter((m) => ids.includes(m.chatId));
      for (const msg of pending) {
        try {
          await graphqlRequest(
            `mutation($chatId: ID!, $content: String!) { sendMessage(chatId:$chatId, content:$content){ id } }`,
            { chatId: msg.chatId, content: msg.content },
          );
          await removeOutboxMessage(msg.id);
          setMessages((m) => m.filter((x) => x.ts !== msg.ts));
        } catch (err) {
          console.error('Failed to resend message', err);
          break;
        }
      }
    }

    async function loadHistory() {
      let merged = [];
      for (const id of ids) {
        const cached = await getMessageCache(id);
        if (cached) {
          merged.push(...cached.messages);
        }
      }
      const pending = (await getOutboxMessages()).filter((m) => ids.includes(m.chatId));
      if (pending.length) merged.push(...pending);
      if (!ignore && merged.length) {
        merged.sort((a, b) => new Date(a.ts) - new Date(b.ts));
        setMessages(merged);
        setHasMore(merged.length >= PAGE_SIZE);
      }
      try {
        const all = await Promise.all(
          ids.map((id) =>
            graphqlRequest(
              `query($id: ID!, $limit: Int) { getMessages(chatId: $id, limit: $limit) { id chatId ts senderId content } }`,
              { id, limit: PAGE_SIZE },
            ),
          ),
        );
        if (ignore) return;
        merged = all.flatMap((r) => r.getMessages || []);
        merged.sort((a, b) => new Date(a.ts) - new Date(b.ts));
        setMessages(merged);
        setHasMore(merged.length >= PAGE_SIZE);
      } catch (err) {
        console.error('Error loading history', err);
      }
    }

    loadHistory();
    const base = API_URL || window.location.origin;
    client = new Client({
      webSocketFactory: () => new SockJS(`${base}/api/v1/chat/socket`),
      onConnect: () => {
        setConnected(true);
        flushOutbox();
        ids.forEach((id) => {
          client.subscribe(`/topic/chat/${id}`, (frame) => {
            try {
              const msg = JSON.parse(frame.body);
              setMessages((m) => {
                if (m.some((x) => x.ts === msg.ts && x.chatId === msg.chatId)) return m;
                const arr = [...m, msg];
                arr.sort((a, b) => new Date(a.ts) - new Date(b.ts));
                return arr;
              });
            } catch (err) {
              console.error('Failed to parse message', err);
            }
          });
        });
      },
    });
    client.activate();

    return () => {
      ignore = true;
      if (client) {
        client.deactivate();
      }
      setConnected(false);
    };
  }, [token, ids.join(',')]);

  async function loadMore() {
    if (!hasMore || messages.length === 0) return;
    try {
      const all = await Promise.all(
        ids.map((id) =>
          graphqlRequest(
            `query($id: ID!, $after: AWSDateTime, $limit: Int) { getMessages(chatId: $id, after:$after, limit:$limit) { id chatId ts senderId content } }`,
            { id, after: messages[0].ts, limit: PAGE_SIZE },
          ),
        ),
      );
      const older = all.flatMap((r) => r.getMessages || []);
      older.sort((a, b) => new Date(a.ts) - new Date(b.ts));
      setMessages((m) => [...older, ...m]);
      if (older.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.error('Failed to load older messages', err);
    }
  }

  useEffect(() => {
    const grouped = {};
    for (const m of messages) {
      if (!grouped[m.chatId]) grouped[m.chatId] = [];
      grouped[m.chatId].push(m);
    }
    for (const id of Object.keys(grouped)) {
      try {
        putMessageCache({ chatId: id, messages: grouped[id].slice(-CACHE_LIMIT) });
      } catch (err) {
        console.error('Failed to cache messages', err);
      }
    }
  }, [messages]);

  return { messages, loadMore, hasMore, connected, appendMessage };
}

