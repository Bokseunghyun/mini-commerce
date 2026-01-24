import { http, HttpResponse } from 'msw';

// 로그인 계정
const USERS = [
  { username: 'test', password: '1234', role: 'USER', status: 'ACTIVE' },
  { username: 'admin', password: '1234', role: 'ADMIN', status: 'ACTIVE' },
  { username: 'test2', password: '1234', role: 'USER', status: 'BLOCKED' },
];

export const handlers = [
  /* ---------------- 로그인 ---------------- */
  http.post('/api/login', async ({ request }) => {
    const body = await request.json();
    console.log('[MSW] login request:', body);

    const user = USERS.find(
      u => u.username === body.username && u.password === body.password
    );

    if (!user) {
      return HttpResponse.json({ message: '아이디 또는 비밀번호 오류' }, { status: 401 });
    }

    if (user.status === 'BLOCKED') {
      return HttpResponse.json({ message: '차단된 계정입니다' }, { status: 403 });
    }

    return HttpResponse.json({
      token: `mock-token-${user.username}`,
      user: { username: user.username, role: user.role },
    });
  }),

  /* ---------------- 상품 목록 ---------------- */
  http.get('/api/products', () => {
    return HttpResponse.json([
      { id: 1, name: '무선 마우스', price: 25000 },
      { id: 2, name: '기계식 키보드', price: 89000 },
      { id: 3, name: '주문불가 상품', price: 30000 },
      { id: 4, name: '주문불가 상품', price: 40000 },
    ]);
  }),

  /* ---------------- 상품 상세 ---------------- */
  http.get('/api/products/:id', ({ params }) => {
    const id = Number(params.id);

    if (id === 3 || id === 4) {
      return new HttpResponse(
        JSON.stringify({ message: '상품 조회 실패 (의도적 오류)' }),
        { status: 500 }
      );
    }

    const products = {
      1: { id: 1, name: '무선 마우스', price: 25000, description: '정상 상품' },
      2: { id: 2, name: '기계식 키보드', price: 89000, description: '정상 상품' },
    };

    return HttpResponse.json(products[id]);
  }),

  /* ---------------- 장바구니 조회 ---------------- */
  http.get('/api/cart', ({ request }) => {
    const url = new URL(request.url);
    const cartParam = url.searchParams.get('cart');
    let cart = [];

    if (cartParam) {
      try { cart = JSON.parse(cartParam); } catch {}
    }

    if (!cart || cart.length === 0) {
      return new HttpResponse(
        JSON.stringify({ message: '장바구니가 비어 있습니다' }),
        { status: 400 }
      );
    }

    return HttpResponse.json({ message: '장바구니 확인 완료', cart });
  }),

  /* ---------------- 주문 API ---------------- */
http.post('/api/order', async ({ request }) => {
  const body = await request.json();
  const cart = body.items; // ← 여기 변경

  if (!cart || cart.length === 0) {
    return new HttpResponse(
      JSON.stringify({ message: '장바구니가 비어 있습니다' }),
      { status: 400 }
    );
  }

  const hasErrorProduct = cart.some(p => p.id === 3 || p.id === 4);
  if (hasErrorProduct) {
    return new HttpResponse(
      JSON.stringify({ message: '주문불가 상품이 포함되어 있습니다' }),
      { status: 500 }
    );
  }

  const total = cart.reduce((sum, p) => sum + p.price, 0);

  return HttpResponse.json({ message: '주문 성공', total });
}),

];
