# React Front-End

This folder contains a standalone React version of the dashboard. It can be built with Vite and served separately from the Python API.


## Development

```bash
npm install
VITE_API_URL=http://localhost:8080 \
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
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

## Production build

```bash
npm install
npm run build
```

The production build output will be in the `dist/` directory. When building the
Docker image you can supply build arguments to set the backend URL and Google
client ID:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com \
  --build-arg VITE_BASE_PATH=/ \
  -t dashboard .
```

