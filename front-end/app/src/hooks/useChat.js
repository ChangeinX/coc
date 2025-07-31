import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
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

export default function useChat(chatId) {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [connected, setConnected] = useState(false);

  function appendMessage(msg) {
    setMessages((m) => [...m, msg]);
  }

  function updateMessage(ts, changes) {
    setMessages((m) => m.map((x) => (x.ts === ts ? { ...x, ...changes } : x)));
  }

  function removeMessage(ts) {
    setMessages((m) => m.filter((x) => x.ts !== ts));
  }

  useEffect(() => {
    if (!chatId) return;
    let ignore = false;
    let client;

    async function flushOutbox() {
      const pending = (await getOutboxMessages()).filter((m) => m.chatId === chatId);
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
          const m = err.message || '';
          if (
            m.includes('BANNED') ||
            m.includes('MUTED') ||
            m.includes('READONLY') ||
            m.includes('TOXICITY_WARNING')
          ) {
            if (m.includes('BANNED') || m.includes('MUTED') || m.includes('READONLY')) {
              window.dispatchEvent(new Event('restriction-updated'));
            }
            await removeOutboxMessage(msg.id);
            setMessages((msgs) => msgs.filter((x) => x.ts !== msg.ts));
          } else {
            break;
          }
        }
      }
    }

    async function setup() {
      const cached = await getMessageCache(chatId);
      let initial = cached ? cached.messages || [] : [];
      const pending = (await getOutboxMessages()).filter((m) => m.chatId === chatId);
      if (pending.length) {
        initial = [...initial, ...pending];
      }
      if (!ignore && initial.length) {
        setMessages(initial);
        setHasMore(initial.length >= PAGE_SIZE);
      }
      console.log('Fetching history for chat', chatId);
      try {
        const resp = await graphqlRequest(
          `query($id: ID!, $limit: Int) { getMessages(chatId: $id, limit: $limit) { id chatId ts senderId content } }`,
          { id: chatId, limit: PAGE_SIZE },
        );
        const data = resp.getMessages || [];
        if (!ignore) {
          console.log('History loaded', data);
          setMessages(data);
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch (err) {
        console.error('Error loading history', err);
      }

      if (ignore) return;
      console.log('Connecting socket for chat', chatId);
      const base = API_URL || window.location.origin;
      client = new Client({
        webSocketFactory: () => new SockJS(`${base}/api/v1/chat/socket`),
        onConnect: () => {
          setConnected(true);
          flushOutbox();
          client.subscribe(`/topic/chat/${chatId}`, (frame) => {
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
        console.log('Closing socket for chat', chatId);
        client.deactivate();
      }
      setConnected(false);
  };
  }, [chatId]);

  async function loadMore() {
    if (!hasMore || messages.length === 0) return;
    try {
      const resp = await graphqlRequest(
        `query($id: ID!, $after: AWSDateTime, $limit: Int) { getMessages(chatId:$id, after:$after, limit:$limit) { id chatId ts senderId content } }`,
        { id: chatId, after: messages[0].ts, limit: PAGE_SIZE },
      );
      const older = resp.getMessages || [];
      setMessages((m) => [...older, ...m]);
      if (older.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.error('Failed to load older messages', err);
    }
  }

  useEffect(() => {
    if (!chatId) return;
    try {
      putMessageCache({ chatId, messages: messages.slice(-CACHE_LIMIT) });
    } catch (err) {
      console.error('Failed to persist chat cache', err);
    }
  }, [chatId, messages]);

  return { messages, loadMore, hasMore, appendMessage, updateMessage, removeMessage };
}
