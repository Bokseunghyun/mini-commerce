import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Vercel 배포 환경에서도 Mock API 동작하도록 fetch 가로채기
async function enableMocking() {
  if (typeof window !== 'undefined' && !window.fetch.isMocked) {

    window.fetch = async (url, options = {}) => {
      const normalizedUrl = typeof url === 'string' ? url : url.url;


      const isApiRequest =
        normalizedUrl.startsWith('/api') ||
        normalizedUrl.includes('/api/');

      if (isApiRequest) {
        const { method = 'GET', body } = options;
        await new Promise(r => setTimeout(r, 200));


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
      if (url.endsWith('/login') && method === 'POST') {
        const { username, password } = JSON.parse(body || '{}');
        const user = USERS.find(
          u => u.username === username && u.password === password
        );

        if (!user) {
          return new Response(
            JSON.stringify({ message: '아이디 또는 비밀번호 오류' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (user.status === 'BLOCKED') {
          return new Response(
            JSON.stringify({ message: '차단된 계정입니다' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            token: `mock-token-${user.username}`,
            user: { username: user.username, role: user.role },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 상품 목록
      if (url.endsWith('/products') && method === 'GET') {
        return new Response(
          JSON.stringify(PRODUCTS),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 상품 상세
      if (/\/api\/products\/\d+$/.test(url) && method === 'GET') {
        const id = Number(url.split('/').pop());

        if (id === 3 || id === 4) {
          return new Response(
            JSON.stringify({ message: '상품 조회 실패 (의도적 장애)' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const p = PRODUCTS.find(p => p.id === id);
        return new Response(
          JSON.stringify({ ...p, description: '정상 상품' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 주문
      if (url.endsWith('/order') && method === 'POST') {
        const { items } = JSON.parse(body || '{}');

        if (!items || items.length === 0) {
          return new Response(
            JSON.stringify({ message: '장바구니가 비어 있습니다' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (items.some(p => p.id === 3 || p.id === 4)) {
          return new Response(
            JSON.stringify({ message: '주문불가 상품이 포함되어 있습니다' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const total = items.reduce((sum, p) => sum + p.price, 0);
        return new Response(
          JSON.stringify({ orderId: `ORDER-${Date.now()}`, total }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      //  mock 누락 방지
      return new Response(
        JSON.stringify({ message: 'Mock API not implemented' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

      // 명확한 에러 반환
        return {
          ok: false,
          status: 404,
          json: async () => ({
            message: 'Mock API에 정의되지 않은 요청입니다',
            url: normalizedUrl,
          }),
        };
      }
      // /api 아닌 요청은 아예 막아버림 (Vercel 안전)
      return {
        ok: false,
        status: 400,
        json: async () => ({
          message: '외부 API 호출이 차단되었습니다 (Mock 환경)',
          url: normalizedUrl,
        }),
      };
  };

  window.fetch.isMocked = true;
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
