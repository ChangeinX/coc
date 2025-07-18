import {Amplify} from 'aws-amplify';
import {generateClient} from 'aws-amplify/api';


let cached = {token: null, client: null};

export function getGraphQLClient(token) {
    if (!token) throw new Error('getGraphQLClient: token is required');
    if (cached.client && cached.token === token) return cached.client;

    Amplify.configure({
        API: {
            GraphQL: {
                endpoint: import.meta.env.VITE_APPSYNC_EVENTS_URL,
                region: import.meta.env.VITE_AWS_REGION,
                defaultAuthMode: 'oidc',
                oidcProvider: {getToken: async () => token},
            },
        },
    });

    cached = {token, client: generateClient()};
    return cached.client;
}
