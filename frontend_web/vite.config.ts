import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const apiProxy = {
  target: 'http://localhost:8000',
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth': apiProxy,
      '/topics': apiProxy,
      '/topic-generator': apiProxy,
      '/questions': apiProxy,
      '/answers': apiProxy,
      '/reports': apiProxy,
      '/health': apiProxy,
    },
  },
});
