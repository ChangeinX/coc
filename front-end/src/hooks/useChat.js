import { useEffect, useState } from 'react';
import { getGraphQLClient } from '../aws/graphqlClient.js';


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

      if (ignore) return;
      console.log('Subscribing to group', groupId);

      const client = getGraphQLClient(token);
      sub = client.graphql({
        query: SUBSCRIBE_MESSAGE,
        variables: { channel: groupId },
        authMode: 'oidc',
      }).subscribe({
        next: ({ data }) => {
          const msg = data.sendMessage;
          setMessages((m) =>
            m.some((x) => x.ts === msg.ts) ? m : [...m, msg],
          );
        },
        error: (err) => console.error('Subscription error', err),
        complete: () => console.log('Subscription completed'),
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
