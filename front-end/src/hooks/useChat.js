import { useEffect, useState } from 'react';
import { PubSub } from '@aws-amplify/pubsub';
import ensurePubSub from '../aws/pubsub.js';
import useGoogleIdToken from './useGoogleIdToken.js';
import { fetchJSON } from '../lib/api.js';

export default function useChat(groupId) {
  const token = useGoogleIdToken();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    ensurePubSub(token);
  }, [token]);

  useEffect(() => {
    if (!groupId || !token) return;
    let ignore = false;
    fetchJSON(`/chat/history/${encodeURIComponent(groupId)}?limit=100`)
      .then((data) => {
        if (!ignore) setMessages(data);
      })
      .catch(() => {});
    const sub = PubSub.subscribe(`/groups/${groupId}`).subscribe({
      next: (data) => setMessages((m) => [...m, data.value]),
    });
    return () => {
      ignore = true;
      sub.unsubscribe();
    };
  }, [groupId, token]);

  return { messages };
}
