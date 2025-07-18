import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from '@aws-amplify/auth';
let lastToken = null;

export default async function ensurePubSub(token) {
  if (!token || token === lastToken) return;
  console.log('Configuring Amplify PubSub');
  try {
    // Wait until Cognito has exchanged the Google token for temporary AWS creds
    await fetchAuthSession();
  } catch {
    // Swallow errors to avoid blocking configuration
  }
  console.log('AppSync endpoint', import.meta.env.VITE_APPSYNC_EVENTS_URL);
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
