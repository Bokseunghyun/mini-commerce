import { useEffect, useState } from 'react';
import ProductListPage from './pages/ProductList';
import ProductDetailPage from './pages/ProductDetail';
import CartPage from './pages/Cart';

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
          if (Array.isArray(data.products)) setProducts(data.products);
          else setProducts([]);
        })
        .catch(() => setProducts([]));
    }
  }, [page, API_BASE]);

  /* ---------------- 상품 상세 ---------------- */
  const viewProduct = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      const product = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(product.message || '상품 조회 실패');

      setSelectedProduct(product);
      setPage('productDetail');
    } catch (e) {
      alert(e.message);
    }
  };

  /* ---------------- 장바구니 담기 ---------------- */
  /* ---------------- 장바구니 담기 ---------------- */
const addToCart = (product) => {
  setCart((prev) => {
    if (!product) return prev;

    //  price 보정 (상세 응답에 price가 없거나 0으로 오면 discountedPrice로 대체)
    const safePrice =
      Number(product.price) ||
      Number(product.discountedPrice) ||
      Number(product.originalPrice) ||
      0;

    const normalizedProduct = {
      ...product,
      price: safePrice,
    };

    const idx = prev.findIndex((p) => p.id === normalizedProduct.id);
    if (idx >= 0) {
      const next = prev.slice();
      next[idx] = {
        ...next[idx],
        // price도 혹시 기존 0이 있으면 정상값으로 교정
        price: Number(next[idx].price) || safePrice,
        quantity: (next[idx].quantity || 1) + 1,
      };
      return next;
    }

    return [...prev, { ...normalizedProduct, quantity: 1 }];
  });
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

  /* ---------------- 주문 API ----------------
     - 기존: cart로 주문
     - 추가: 상세에서 바로구매 시 itemsOverride로 주문 (order와 동일 API 사용)
  ---------------- */
  const order = async (itemsOverride) => {
    const items = Array.isArray(itemsOverride) ? itemsOverride : cart;

    if (!Array.isArray(items) || items.length === 0) {
      alert('주문할 상품이 없습니다');
      return;
    }

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

      alert(`주문 성공\n총 금액: ${data.order.totalPrice.toLocaleString()}원`);

      //  장바구니에서 주문이면 cart 비움
      if (!itemsOverride) setCart([]);

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
        onView={viewProduct}
        onAdd={(p) => addToCart(p)}
        onGoCart={() => setPage('cart')}
      />
    );
  }

  /* ---------------- 상품 상세 ---------------- */
  if (page === 'productDetail') {
    return (
      <ProductDetailPage
        product={selectedProduct}
        apiBase={API_BASE}
        onBack={() => setPage('products')}
        onGoCart={() => setPage('cart')}
        onAddToCart={addToCart}
        onBuyNow={(items) => order(items)} //  바로구매 = order와 동일 API 호출
      />
    );
  }

  /* ---------------- 장바구니 ---------------- */
  if (page === 'cart') {
    return (
      <CartPage
        cartItems={cart}
        onIncrease={(id) => addToCart(cart.find((p) => p.id === id))}
        onDecrease={(id) =>
          setCart((prev) =>
            prev
              .map((item) =>
                item.id === id
                  ? { ...item, quantity: Math.max(1, (item.quantity || 1) - 1) }
                  : item
              )
              .filter((x) => (x.quantity || 1) > 0)
          )
        }
        onRemove={(id) => {
          const idx = cart.findIndex((p) => p.id === id);
          if (idx >= 0) removeFromCart(idx);
        }}
        onCheckout={() => order()} //  장바구니 주문도 기존 order 사용
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
