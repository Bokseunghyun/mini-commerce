import { useEffect, useState } from 'react';

export default function App() {
  const [page, setPage] = useState('login');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  /* ---------------- 로그인 ---------------- */
  const login = async () => {
    setError(''); 

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userId, password }),
      }); 

      if (!res.ok) {
        const err = await res.json();
        setError(err.message);
        return;
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.user.role);
      setPage('products');
    } catch (e) {
      setError('로그인 중 오류 발생');
    }
  };

  /* ---------------- 상품 목록 조회 ---------------- */
  useEffect(() => {
    if (page === 'products') {
      fetch(`${API_BASE}/api/products`)
        .then(res => res.json())
        .then(data => setProducts(data));
    }
  }, [page]);

  /* ---------------- 상품 상세 ---------------- */
  const viewProduct = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedProduct(data);
      setPage('productDetail');
    } catch {
      alert(`상품 ${id} 조회 실패`);
    }
  };

  /* ---------------- 장바구니 ---------------- */
  const addToCart = product => setCart([...cart, product]);

 const removeFromCart = async (index) => {
  try {
    const res = await fetch(`${API_BASE}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', index, cart }),
    });

    if (!res.ok) throw new Error('삭제 실패');

    const data = await res.json();
    setCart(data.cart); // UI 갱신
  } catch {
    alert('삭제 중 오류 발생');
  }
};


  const total = cart.reduce((sum, p) => sum + p.price, 0);

  /* ---------------- 주문 API ---------------- */
  const order = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.message); // 400, 500 모두 처리
        return;
      }

      const data = await res.json();
      alert(`주문 성공\n총 금액: ${data.total}`);
      setCart([]);
      setPage('checkout');
    } catch {
      alert('주문 중 오류 발생');
    }
  };

  /* ---------------- 로그인 페이지 ---------------- */
  if (page === 'login') {
    return (
      <div style={styles.container}>
        <h2 style={{ textAlign: 'center' }}>로그인</h2>
        <input
          style={styles.input}
          placeholder="아이디"
          value={userId}
          onChange={e => setUserId(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
        <button style={styles.buttonPrimary} onClick={login}>
          로그인
        </button>
      </div>
    );
  }

  /* ---------------- 상품 목록 ---------------- */
  if (page === 'products') {
    return (
      <div style={styles.container}>
        <h2 style={{ textAlign: 'center' }}>상품 목록</h2>

        {products.map(p => (
          <div key={p.id} style={styles.card}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                {p.price.toLocaleString()}원
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={styles.buttonSecondary}
                onClick={() => viewProduct(p.id)}
              >
                상세
              </button>
              <button
                style={styles.buttonPrimary}
                onClick={() => addToCart(p)}
              >
                담기
              </button>
            </div>
          </div>
        ))}

        <button
          style={{ ...styles.buttonPrimary, marginTop: 12 }}
          onClick={() => setPage('cart')}
        >
          장바구니 이동 ({cart.length})
        </button>
      </div>
    );
  }

  /* ---------------- 상품 상세 ---------------- */
  if (page === 'productDetail' && selectedProduct) {
    return (
      <div style={styles.container}>
        <h2>상품 상세</h2>
        <div style={styles.card}>
          <div style={{ fontWeight: 600 }}>{selectedProduct.name}</div>
          <div>{selectedProduct.price.toLocaleString()}원</div>
          {selectedProduct.description && (
            <div style={{ fontSize: 13, color: '#555' }}>
              {selectedProduct.description}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={styles.buttonSecondary}
            onClick={() => setPage('products')}
          >
            목록으로 돌아가기
          </button>
          <button
            style={styles.buttonPrimary}
            onClick={() => {
              addToCart(selectedProduct);
              setPage('products');
            }}
          >
            장바구니 담기
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- 장바구니 ---------------- */
  if (page === 'cart') {
    return (
      <div style={styles.container}>
        <h2>장바구니</h2>

        {cart.length === 0 && <p>장바구니가 비어 있습니다</p>}

        {cart.map((p, i) => (
          <div key={i} style={styles.card}>
            <div>{p.name}</div>
            <div>{p.price.toLocaleString()}원</div>
            <button
              style={styles.buttonSecondary}
              onClick={() => removeFromCart(i)}
            >
              삭제
            </button>
          </div>
        ))}

        <h3>총 금액: {total.toLocaleString()}원</h3>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={styles.buttonSecondary}
            onClick={() => setPage('products')}
          >
            상품 목록으로 돌아가기
          </button>
          <button style={styles.buttonPrimary} onClick={order}>
            주문하기
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- 주문 완료 ---------------- */
  if (page === 'checkout') {
    return (
      <div style={styles.container}>
        <h2>주문 완료</h2>
        <p>주문이 정상적으로 완료되었습니다</p>
        <button onClick={() => window.location.reload()}>
          다시 시작
        </button>
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
