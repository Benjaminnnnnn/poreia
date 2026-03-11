import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
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
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
