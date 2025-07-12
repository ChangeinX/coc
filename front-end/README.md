# React Front-End

This folder contains a standalone React version of the dashboard. It can be built with Vite and served separately from the Python API.

## Development

Set the API base URL so the React app knows where to send requests. During local
development it might be your Flask server running on port 8080:

```bash
export VITE_API_URL=http://localhost:8080
npm install
npm run dev
```

## Production build

```bash
export VITE_API_URL=https://your-api.example.com
npm install
npm run build
```

The production build output will be in the `dist/` directory.
