import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
    });
  }
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
