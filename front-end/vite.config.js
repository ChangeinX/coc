import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use a relative base path by default so the app can be served from
  // any subdirectory without breaking module resolution. A custom base
  // can still be provided via the VITE_BASE_PATH build argument.
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
