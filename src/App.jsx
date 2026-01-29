import { useEffect, useState } from 'react';
import ProductListPage from './pages/ProductList';
import ProductDetailPage from './pages/ProductDetail';
import CartPage from './pages/cart';

export default function App() {
  const [page, setPage] = useState('login');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  //  기존 정책: 3,4번 상세 진입 차단 유지
  const BLOCKED_DETAIL_IDS = new Set([3, 4]);

  // ---------------- 공통: 상품 price 보정 ----------------
  // 서버 응답이 discountedPrice만 주는 경우 / price가 빠지는 경우 대비
  const normalizeProduct = (p) => {
    if (!p) return p;
    const price =
      p.price != null
        ? Number(p.price)
        : p.discountedPrice != null
          ? Number(p.discountedPrice)
          : 0;

    return {
      ...p,
      price,
    };
  };

  /* ---------------- 로그인 ---------------- */
  const login = async () => {
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userId, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || '로그인 실패');
        return;
      }

      localStorage.setItem('token', data.token || '');
      localStorage.setItem('role', data.user?.role || '');

      setPage('products');
    } catch (e) {
      setError('로그인 중 오류 발생');
    }
  };

  /* ---------------- 상품 목록 조회 ---------------- */
  useEffect(() => {
    if (page === 'products') {
      fetch(`${API_BASE}/api/products`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || '상품 목록 조회 실패');
          return data;
        })
        .then((data) => {
          const list = Array.isArray(data.products) ? data.products : [];
          setProducts(list.map(normalizeProduct));
        })
        .catch(() => {
          setProducts([]);
        });
    }
  }, [page]);

  /* ---------------- 상품 상세 ---------------- */
  const viewProduct = async (id) => {
    //  3,4번 상세 진입 차단
    if (BLOCKED_DETAIL_IDS.has(Number(id))) {
      setSelectedProduct(null);
      alert('상세 페이지 진입 불가(의도적 오류)');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || '상품 조회 실패');
      }

      const product = normalizeProduct(data);
      setSelectedProduct(product);
      setPage('productDetail');
    } catch (e) {
      alert(e.message);
    }
  };

  //  ProductListPage에서 호출하는 진입 함수 (차단 포함)
  const handleView = async (id) => {
    if (BLOCKED_DETAIL_IDS.has(Number(id))) {
      alert('상세 페이지 진입 불가(의도적 오류)');
      return;
    }
    await viewProduct(id);
  };

  /* ---------------- 장바구니 ---------------- */
  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      if (!product) return prev;

      const p = normalizeProduct(product);
      const addQty = Math.max(1, Number(qty) || 1);

      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], quantity: (Number(next[idx].quantity) || 1) + addQty };
        return next;
      }
      return [...prev, { ...p, quantity: addQty }];
    });
  };

  //  Cart UI(아이템 id 기반)와 App(기존 index 기반 삭제)을 모두 만족시키기 위해 id삭제 래퍼 제공
  const removeFromCartById = (id) => {
    const idx = cart.findIndex((x) => x.id === id);
    if (idx >= 0) removeFromCart(idx);
  };

  /* ---------------- 장바구니 삭제 (기존 index 기반 유지) ---------------- */
  const removeFromCart = async (index) => {
    try {
      if (!Array.isArray(cart)) {
        alert('장바구니 데이터 오류');
        return;
      }

      const res = await fetch(`${API_BASE}/api/cart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ action: 'remove', index, cart }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || '삭제 실패');
        return;
      }

      setCart(Array.isArray(data.cart) ? data.cart : []);
    } catch (err) {
      alert('삭제 중 오류 발생');
      console.error(err);
    }
  };

  const total = cart.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);

  /* ---------------- 주문 API ---------------- */
  const order = async (items = cart) => {
    try {
      const res = await fetch(`${API_BASE}/api/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ items }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || '주문 실패');
        return;
      }

      alert(`주문 성공\n총 금액: ${data.order?.totalPrice?.toLocaleString?.() || 0}원`);
      setCart([]);
      setPage('checkout');
    } catch {
      alert('주문 중 오류 발생');
    }
  };

  //  상세페이지 "바로구매" = 주문(order)과 동일 동작
  const buyNow = async (product, quantity = 1) => {
    if (!product) return;
    const p = normalizeProduct(product);
    const qty = Math.max(1, Number(quantity) || 1);

    const items = [{ ...p, quantity: qty }];
    await order(items);
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
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
      <ProductListPage
        products={products}
        cart={cart}
        setCart={setCart}
        setPage={setPage}
        onView={handleView}
        onAdd={(p) => addToCart(p, 1)}
        onGoCart={() => setPage('cart')}
      />
    );
  }

  /* ---------------- 상품 상세 ---------------- */
  if (page === 'productDetail' && selectedProduct) {
    return (
      <ProductDetailPage
        product={selectedProduct}
        cartCount={cart.length}
        onBack={() => setPage('products')}
        onGoCart={() => setPage('cart')}
        onAddToCart={(qty) => {
          addToCart(selectedProduct, qty);
          setPage('products'); // 기존 흐름 유지: 담고 목록으로
        }}
        onBuyNow={(qty) => buyNow(selectedProduct, qty)}
      />
    );
  }

  /* ---------------- 장바구니 ---------------- */
  if (page === 'cart') {
    return (
      <CartPage
        cartItems={cart}
        onIncrease={(id) => {
          const item = cart.find((x) => x.id === id);
          if (item) addToCart(item, 1);
        }}
        onDecrease={(id) => {
          setCart((prev) =>
            prev.map((x) =>
              x.id === id
                ? { ...x, quantity: Math.max(1, (Number(x.quantity) || 1) - 1) }
                : x
            )
          );
        }}
        onRemove={(id) => removeFromCartById(id)}
        onCheckout={() => order(cart)}
        onBack={() => setPage('products')}
      />
    );
  }

  /* ---------------- 주문 완료 ---------------- */
  if (page === 'checkout') {
    return (
      <div style={styles.container}>
        <h2>주문 완료</h2>
        <p>주문이 정상적으로 완료되었습니다</p>
        <button onClick={() => window.location.reload()}>다시 시작</button>
      </div>
    );
  }

  return null;
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
