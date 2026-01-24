// vite.config.js
export default defineConfig({
  plugins: [react()],
  base: '/', // 유지
  build: {
    target: 'esnext',
    sourcemap: true, // 문제 추적용
    rollupOptions: {
      output: {
        manualChunks: undefined // 자동 chunk 나누기 방지
      }
    }
  }
});
