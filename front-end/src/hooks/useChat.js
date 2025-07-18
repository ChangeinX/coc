import { useEffect, useState } from 'react';
import { PubSub } from '@aws-amplify/pubsub';
import { graphqlOperation } from '@aws-amplify/api-graphql';
import ensurePubSub from '../aws/pubsub.js';

const SUBSCRIBE_MESSAGE = /* GraphQL */ `
  subscription SendMessage($channel: String!) {
    sendMessage(channel: $channel) {
      channel
      ts
      userId
      content
    }
  }
`;
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
    let sub;

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

      await ensurePubSub(token);

      if (ignore) return;
      console.log('Subscribing to group', groupId);
      sub = PubSub.subscribe(
        graphqlOperation(SUBSCRIBE_MESSAGE, { channel: groupId }),
      ).subscribe({
        next: (data) => {
          console.log('Received message', data);
          setMessages((m) => [...m, data.value.data.sendMessage]);
        },
        error: (err) => {
          console.error('Subscription error', err);
        },
        complete: () => {
          console.log('Subscription completed');
        },
      });
    }

    setup();

    return () => {
      ignore = true;
      if (sub) {
        console.log('Unsubscribing from group', groupId);
        sub.unsubscribe();
      }
    };
  }, [groupId, token]);

  return { messages };
}
