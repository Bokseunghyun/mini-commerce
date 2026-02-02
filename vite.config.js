import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/',
  server: {
    // dev(vite)일 때만 /api를 3000(express)로 프록시
    proxy: command === 'serve'
      ? {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          },
        }
      : undefined,
  },
}));
