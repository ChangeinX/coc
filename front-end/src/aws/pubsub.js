import { Amplify } from 'aws-amplify';
let lastToken = null;

export default function ensurePubSub(token) {
  if (!token || token === lastToken) return;
  Amplify.configure({
    PubSub: {
      AWSAppSync: {
        endpoint: import.meta.env.VITE_APPSYNC_EVENTS_URL,
        region: import.meta.env.VITE_AWS_REGION,
        authType: 'OPENID_CONNECT',
        jwtToken: async () => token,
      },
    },
  });
  lastToken = token;
}
