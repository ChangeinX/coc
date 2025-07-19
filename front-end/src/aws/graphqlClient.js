import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';

Amplify.configure({
    API: {
        GraphQL: {
            endpoint: import.meta.env.VITE_APPSYNC_EVENTS_URL,
            region: import.meta.env.VITE_AWS_REGION,
            defaultAuthMode: 'oidc',
            oidcProvider: {
                getToken: async () => localStorage.getItem('token')
                }
        }
    }
});

export const client = generateClient();
