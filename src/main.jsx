import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Vercel 배포 환경에서도 Mock API 동작하도록 fetch 가로채기
async function enableMocking() {
  if (typeof window !== 'undefined' && !window.fetch.isMocked) {
    window.originalFetch = window.fetch;
    window.fetch = async (url, options) => {
      // /api/... 요청만 Mock 처리
      if (url.startsWith('/api/')) {
        const { method = 'GET', body } = options || {};
        await new Promise(r => setTimeout(r, 200)); // 지연
        // 아래는 App.jsx에 정의된 mockFetch와 동일 로직
        const USERS = [
          { username: 'test', password: '1234', role: 'USER', status: 'ACTIVE' },
          { username: 'admin', password: '1234', role: 'ADMIN', status: 'ACTIVE' },
          { username: 'test2', password: '1234', role: 'USER', status: 'BLOCKED' },
        ];
        const PRODUCTS = [
          { id: 1, name: '무선 마우스', price: 25000 },
          { id: 2, name: '기계식 키보드', price: 89000 },
          { id: 3, name: '주문불가 상품', price: 30000 },
          { id: 4, name: '주문불가 상품', price: 40000 },
        ];

        // 로그인
        if (url.endsWith('/api/login') && method === 'POST') {
          const { username, password } = JSON.parse(body || '{}');
          const user = USERS.find(u => u.username === username && u.password === password);
          if (!user) return { ok: false, status: 401, json: async () => ({ message: '아이디 또는 비밀번호 오류' }) };
          if (user.status === 'BLOCKED') return { ok: false, status: 403, json: async () => ({ message: '차단된 계정입니다' }) };
          return { ok: true, status: 200, json: async () => ({ token: `mock-token-${user.username}`, user: { username: user.username, role: user.role } }) };
        }

        // 상품 목록
        if (url.endsWith('/api/products') && method === 'GET') {
          return { ok: true, status: 200, json: async () => PRODUCTS };
        }

        // 상품 상세
        if (/\/api\/products\/\d+$/.test(url) && method === 'GET') {
          const id = Number(url.split('/').pop());
          if (id === 3 || id === 4) return { ok: false, status: 500, json: async () => ({ message: '상품 조회 실패 (의도적 장애)' }) };
          const p = PRODUCTS.find(p => p.id === id);
          return { ok: true, status: 200, json: async () => ({ ...p, description: '정상 상품' }) };
        }

        // 주문
        if (url.endsWith('/api/order') && method === 'POST') {
          const { items } = JSON.parse(body || '{}');
          if (!items || items.length === 0) return { ok: false, status: 400, json: async () => ({ message: '장바구니가 비어 있습니다' }) };
          if (items.some(p => p.id === 3 || p.id === 4)) return { ok: false, status: 500, json: async () => ({ message: '주문불가 상품이 포함되어 있습니다' }) };
          const total = items.reduce((sum, p) => sum + p.price, 0);
          return { ok: true, status: 200, json: async () => ({ orderId: `ORDER-${Date.now()}`, total }) };
        }

        return window.originalFetch(url, options);
      }

      return window.originalFetch(url, options);
    };
    window.fetch.isMocked = true;
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
