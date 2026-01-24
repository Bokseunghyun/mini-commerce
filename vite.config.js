import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',          // 상대 경로
  build: {
    outDir: 'dist',    // 기본값, 확인용
    rollupOptions: {
      input: '/src/main.jsx'  // 명시적 입력점 확인
    }
  }
})

