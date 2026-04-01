import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  envDir: '.',
  server: {
    port: 3000,
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
      '/api/pollinations/text': {
        target: 'https://gen.pollinations.ai',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api\/pollinations\/text/, '/text'),
      },
      '/api/pollinations/v1': {
        target: 'https://gen.pollinations.ai',
        changeOrigin: true,
        rewrite: (requestPath) => requestPath.replace(/^\/api\/pollinations\/v1/, '/v1'),
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
