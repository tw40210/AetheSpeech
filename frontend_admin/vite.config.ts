import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/admin-ui/',
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      // Proxy API only — do not use '/admin' (it also matches '/admin-ui/...').
      '/admin/db': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin/workflows': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
