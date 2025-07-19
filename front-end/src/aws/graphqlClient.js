import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

Amplify.configure({
    API: {
        GraphQL: {
            endpoint: import.meta.env.VITE_APPSYNC_EVENTS_URL,
            region: import.meta.env.VITE_AWS_REGION,
            defaultAuthMode: 'apiKey',
            apiKey: import.meta.env.VITE_API_KEY
        }
    }
});

// trim and show api key to make sure it's set

console.log('AppSync API Key:', import.meta.env.APP_SYNC_API_KEY.trim().slice(0, 5) + '...');

export const client = generateClient();
