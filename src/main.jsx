import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

async function enableMocking() {
  const { worker } = await import('public/mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass', // 처리 안된 요청은 그냥 브라우저로 전달
    serviceWorker: {
      url: '/mockServiceWorker.js', // Vercel 배포용 경로
    },
  });
}

const container = document.getElementById('root');

enableMocking().then(() => {
  if (!container) return;

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
