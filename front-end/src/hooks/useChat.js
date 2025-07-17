import { useEffect, useState } from 'react';
import { PubSub } from '@aws-amplify/pubsub';
import ensurePubSub from '../aws/pubsub.js';
import useGoogleIdToken from './useGoogleIdToken.js';

export default function useChat(groupId) {
  const token = useGoogleIdToken();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    ensurePubSub(token);
  }, [token]);

  useEffect(() => {
    if (!groupId || !token) return;
    const sub = PubSub.subscribe(`/groups/${groupId}`).subscribe({
      next: (data) => setMessages((m) => [...m, data.value]),
    });
    return () => sub.unsubscribe();
  }, [groupId, token]);

  return { messages };
}
