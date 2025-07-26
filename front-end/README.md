# React Front-End

This folder contains a standalone React version of the dashboard. It can be built with Vite and served separately from the Python API.

## Development

```bash
npm install
VITE_API_URL=http://localhost:8080 \
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
VITE_VAPID_PUBLIC_KEY=your-public-key \
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
The chat connects via Socket.IO at `/api/v1/chat/socket.io` and requires no AWS configuration.

## Production build

```bash
npm install
npm run build
```

The build script automatically injects the current git commit hash into both the
HTML and JavaScript bundle using the `VITE_COMMIT_HASH` environment variable.
The application logs this commit hash to the browser console on page load and
checks the value from a `<meta name="build-commit">` tag. If the HTML commit
doesn't match the running script the page reloads and cached assets are
cleared. A fallback check reloads the page if the React root does not render
within a few seconds to recover from blank screens.
The service worker reads the `VITE_VAPID_PUBLIC_KEY` variable during build to
support push notifications.

The production build output will be in the `dist/` directory. When building the
Docker image you can supply build arguments to set the backend URL and Google
client ID:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
  --build-arg VITE_VAPID_PUBLIC_KEY=your-public-key \
  --build-arg VITE_BASE_PATH=/ \
  -t dashboard .
```

### Cache invalidation

API responses are cached in `localStorage` along with the `ETag` header returned
by CloudFront. When a cached entry is used, the last seen `ETag` is sent with
`If-None-Match` so unchanged content results in a `304` response and the
timestamp is refreshed. When the content changes, the new payload and `ETag`
replace the cached version, ensuring users always see the latest data.

