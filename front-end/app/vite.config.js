import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  server: process.env.VITE_API_URL
    ? {
        proxy: {
          '/api': {
            target: process.env.VITE_API_URL,
            changeOrigin: true,
          },
        },
      }
    : undefined,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
