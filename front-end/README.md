# React Front-End

This folder contains a standalone React version of the dashboard. It can be built with Vite and served separately from the Python API.

## Development

```bash
npm install
VITE_API_URL=http://localhost:8080 \
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
VITE_APPSYNC_EVENTS_URL=https://xxxxx.appsync-realtime-api.us-east-1.amazonaws.com/graphql \
VITE_AWS_REGION=us-east-1 \
npm run dev
```

The `VITE_API_URL` variable tells the dev server where the Flask API is
running. Omit it when the API shares the same origin.

### Google Sign-In

Create an OAuth 2.0 **Web** client in the Google Cloud Console and add
`http://localhost:5173` to the **Authorized JavaScript origins**. Copy the
client ID and provide it via the `VITE_GOOGLE_CLIENT_ID` environment variable
when running the dev server. The backend must receive the same value through
`GOOGLE_CLIENT_ID`.

### Chat (Experimental)

Users can opt in to the chat UI via the `/user/features` API which controls feature flags at runtime.

#### Required variables

Set the following variables so the chat UI can connect to AWS AppSync:

- `VITE_APPSYNC_EVENTS_URL` – realtime endpoint returned by Terraform.
- `VITE_AWS_REGION` – AWS region of the AppSync API.

## Production build

```bash
npm install
npm run build
```

The production build output will be in the `dist/` directory. Changes to the
`main` branch trigger a GitHub Actions workflow which builds the site with the
same environment variables and syncs the result to an S3 bucket behind
CloudFront. Cache invalidations are issued automatically so users see the newest
files on deploy.

### Cache invalidation

API responses are cached in `localStorage` along with the `ETag` header returned
by CloudFront. When a cached entry is used, the last seen `ETag` is sent with
`If-None-Match` so unchanged content results in a `304` response and the
timestamp is refreshed. When the content changes, the new payload and `ETag`
replace the cached version, ensuring users always see the latest data.

