import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '.',
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/api/google-places': {
        target: 'https://places.googleapis.com',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api\/google-places/, ''),
      },
    },
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
