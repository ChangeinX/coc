# React Front-End

This folder contains a standalone React version of the dashboard. It can be built with Vite and served separately from the Python API.

## Development

```bash
npm install
VITE_API_URL=http://localhost:8080 npm run dev
```

The `VITE_API_URL` variable tells the dev server where the Flask API is
running. Omit it when the API shares the same origin.

## Production build

```bash
npm install
npm run build
```

The production build output will be in the `dist/` directory. When building the
Docker image you can supply `VITE_API_URL` to hard-code the backend URL:

```bash
docker build --build-arg VITE_API_URL=https://api.example.com -t dashboard .
```

