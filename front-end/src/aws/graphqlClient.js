import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';


let cached = { token: null, client: null };

export function getGraphQLClient(token) {
    if (!token) throw new Error('getGraphQLClient: token is required');
    if (cached.client && cached.token === token) return cached.client;

    Amplify.configure({
        API: {
            GraphQL: {
                endpoint: import.meta.env.VITE_APPSYNC_EVENTS_URL,
                region: import.meta.env.VITE_AWS_REGION,
                defaultAuthMode: 'oidc',
                // Read the latest token for every request so websocket
                // connections include fresh credentials.
                oidcProvider: {
                    getToken: async () => {
                        const current = localStorage.getItem('token') || token;
                        console.log('GraphQL WS auth token:', current);
                        return current;
                    },
                },
            },
        },
    });

    cached = {token, client: generateClient()};
    return cached.client;
}
