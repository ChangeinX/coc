import { useEffect, useState } from 'react';
import { PubSub } from '@aws-amplify/pubsub';
import ensurePubSub from '../aws/pubsub.js';
import useGoogleIdToken from './useGoogleIdToken.js';
import { fetchJSON } from '../lib/api.js';

export default function useChat(groupId) {
  const token = useGoogleIdToken();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    console.log('Ensuring PubSub for token', token ? token.slice(0, 10) : 'none');
    ensurePubSub(token);
  }, [token]);

  useEffect(() => {
    if (!groupId || !token) return;
    let ignore = false;
    console.log('Fetching history for group', groupId);
    fetchJSON(`/chat/history/${encodeURIComponent(groupId)}?limit=100`)
      .then((data) => {
        if (!ignore) {
          console.log('History loaded', data);
          setMessages(data);
        }
      })
      .catch((err) => {
        console.error('Error loading history', err);
      });
    console.log('Subscribing to group', groupId);
    const sub = PubSub.subscribe(groupId).subscribe({
      next: (data) => {
        console.log('Received message', data);
        setMessages((m) => [...m, data.value]);
      },
      error: (err) => {
        console.error('Subscription error', err);
      },
      complete: () => {
        console.log('Subscription completed');
      },
    });
    return () => {
      ignore = true;
      console.log('Unsubscribing from group', groupId);
      sub.unsubscribe();
    };
  }, [groupId, token]);

  return { messages };
}
