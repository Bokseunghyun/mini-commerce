import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: '/',
  server: {
    // PORT 환경변수가 있으면 사용(미지정 시 vite 기본 5173) — 프리뷰 도구가 포트를 지정할 때 대응
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
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
