import { useEffect, useState, useLayoutEffect } from 'react';

export default function App() {
  const [page, setPage] = useState('login');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  /* ---------------- 배포용 Mock API ---------------- */
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

  const mockFetch = async (url, options = {}) => {
    await new Promise(r => setTimeout(r, 200)); // 응답 지연
    const { method = 'GET', body } = options;

    if (url.endsWith('/api/login') && method === 'POST') {
      const { username, password } = JSON.parse(body || '{}');
      const user = USERS.find(u => u.username === username && u.password === password);
      if (!user) return { ok: false, status: 401, json: async () => ({ message: '아이디 또는 비밀번호 오류' }) };
      if (user.status === 'BLOCKED') return { ok: false, status: 403, json: async () => ({ message: '차단된 계정입니다' }) };
      return { ok: true, status: 200, json: async () => ({ token: `mock-token-${user.username}`, user: { username: user.username, role: user.role } }) };
    }

    if (url.endsWith('/api/products') && method === 'GET') {
      return { ok: true, status: 200, json: async () => PRODUCTS };
    }

    if (/\/api\/products\/\d+$/.test(url) && method === 'GET') {
      const id = Number(url.split('/').pop());
      if (id === 3 || id === 4) return { ok: false, status: 500, json: async () => ({ message: '상품 조회 실패 (의도적 장애)' }) };
      const p = PRODUCTS.find(p => p.id === id);
      return { ok: true, status: 200, json: async () => ({ ...p, description: '정상 상품' }) };
    }

    if (url.endsWith('/api/order') && method === 'POST') {
      const { items } = JSON.parse(body || '{}');
      if (!items || items.length === 0) return { ok: false, status: 400, json: async () => ({ message: '장바구니가 비어 있습니다' }) };
      if (items.some(p => p.id === 3 || p.id === 4)) return { ok: false, status: 500, json: async () => ({ message: '주문불가 상품이 포함되어 있습니다' }) };
      const total = items.reduce((sum, p) => sum + p.price, 0);
      return { ok: true, status: 200, json: async () => ({ orderId: `ORDER-${Date.now()}`, total }) };
    }

    return window.originalFetch(url, options); // 그 외는 원래 fetch
  };

  // ---------------- fetch 가로채기 (배포 환경용) ----------------
  useLayoutEffect(() => {
    if (typeof window !== 'undefined' && !window.fetch.isMocked) {
      window.originalFetch = window.fetch;
      window.fetch = async (url, options) => {
        if (url.startsWith('/api/')) return mockFetch(url, options);
        return window.originalFetch(url, options);
      };
      window.fetch.isMocked = true;
    }
  }, []);

  /* ---------------- 로그인 ---------------- */
  const login = async () => {
    setError('');
    const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: userId, password }) });
    if (!res.ok) { const err = await res.json(); setError(err.message); return; }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.user.role);
    setPage('products');
  };

  /* ---------------- 상품 목록 조회 ---------------- */
  useEffect(() => {
    if (page === 'products') {
      fetch('/api/products').then(res => res.json()).then(data => setProducts(data));
    }
  }, [page]);

  /* ---------------- 상품 상세 ---------------- */
  const viewProduct = async (id) => {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) { const err = await res.json(); alert(err.message); return; }
    const data = await res.json();
    setSelectedProduct(data);
    setPage('productDetail');
  };

  /* ---------------- 장바구니 ---------------- */
  const addToCart = product => setCart([...cart, product]);
  const removeFromCart = index => setCart(cart.filter((_, i) => i !== index));
  const total = cart.reduce((sum, p) => sum + p.price, 0);

  /* ---------------- 주문 ---------------- */
  const order = async () => {
    if (cart.length === 0) { alert('장바구니가 비어 있어 주문할 수 없습니다.'); return; }
    const res = await fetch('/api/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart }) });
    const data = await res.json();
    if (!res.ok) { alert(data.message); return; }
    alert(`주문 성공\n주문번호: ${data.orderId}`);
    setCart([]);
    setPage('checkout');
  };

  /* ---------------- 페이지 렌더링 ---------------- */
  if (page === 'login') {
    return (
      <div style={styles.container}>
        <h2 style={{ textAlign: 'center' }}>로그인</h2>
        <input style={styles.input} placeholder="아이디" value={userId} onChange={e => setUserId(e.target.value)} />
        <input style={styles.input} placeholder="비밀번호" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        <button style={styles.buttonPrimary} onClick={login}>로그인</button>
      </div>
    );
  }

  if (page === 'products') {
    return (
      <div style={styles.container}>
        <h2 style={{ textAlign: 'center' }}>상품 목록</h2>
        {products.map(p => (
          <div key={p.id} style={styles.card}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: '#555' }}>{p.price.toLocaleString()}원</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={styles.buttonSecondary} onClick={() => viewProduct(p.id)}>상세</button>
              <button style={styles.buttonPrimary} onClick={() => addToCart(p)}>담기</button>
            </div>
          </div>
        ))}
        <button style={{ ...styles.buttonPrimary, marginTop: 12 }} onClick={() => setPage('cart')}>장바구니 이동 ({cart.length})</button>
      </div>
    );
  }

  if (page === 'productDetail' && selectedProduct) {
    return (
      <div style={styles.container}>
        <h2>상품 상세</h2>
        <div style={styles.card}>
          <div style={{ fontWeight: 600 }}>{selectedProduct.name}</div>
          <div>{selectedProduct.price.toLocaleString()}원</div>
          {selectedProduct.description && <div style={{ fontSize: 13, color: '#555' }}>{selectedProduct.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.buttonSecondary} onClick={() => setPage('products')}>목록으로 돌아가기</button>
          <button style={styles.buttonPrimary} onClick={() => { addToCart(selectedProduct); setPage('products'); }}>장바구니 담기</button>
        </div>
      </div>
    );
  }

  if (page === 'cart') {
    return (
      <div style={styles.container}>
        <h2>장바구니</h2>
        {cart.length === 0 && <p>장바구니가 비어 있습니다</p>}
        {cart.map((p, i) => (
          <div key={i} style={styles.card}>
            <div>{p.name}</div>
            <div>{p.price.toLocaleString()}원</div>
            <button style={styles.buttonSecondary} onClick={() => removeFromCart(i)}>삭제</button>
          </div>
        ))}
        <h3>총 금액: {total.toLocaleString()}원</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={styles.buttonSecondary} onClick={() => setPage('products')}>상품 목록으로 돌아가기</button>
          <button style={styles.buttonPrimary} onClick={order}>주문하기</button>
        </div>
      </div>
    );
  }

  if (page === 'checkout') {
    return (
      <div style={styles.container}>
        <h2>주문 완료</h2>
        <p>주문이 정상적으로 완료되었습니다</p>
        <button onClick={() => window.location.reload()}>다시 시작</button>
      </div>
    );
  }
}

/* ---------------- 스타일 ---------------- */
const styles = {
  container: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    padding: 24,
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    border: '1px solid #e0e0e0',
    padding: 12,
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonPrimary: {
    padding: '10px 12px',
    background: '#3f51b5',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  buttonSecondary: {
    padding: '8px 10px',
    background: '#eee',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  input: {
    padding: 10,
    borderRadius: 4,
    border: '1px solid #ccc',
    fontSize: 14,
  },
};

