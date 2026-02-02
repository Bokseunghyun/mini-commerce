import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductList';
import ProductDetailPage from './pages/ProductDetail';
import CartPage from './pages/cart';
import LoginPage from './pages/login.jsx';
import OrderCompletePage from "./pages/OrderComplete.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  const [page, setPage] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [userRole, setUserRole] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const isLoggedIn = () => {
    return !!localStorage.getItem('token');
  };

  const normalizeProduct = (raw) => {
    if (!raw) return null;
    const id = Number(raw.id);
    const name = raw.name || "";
    const price = Number(raw.price) || Number(raw.discountedPrice) || 0;

    return {
      ...raw,
      id,
      name,
      price,
    };
  };

  const handleLogin = async ({ username, password }) => {
    setLoginError("");
    setIsLoading(true);
    try {
      const result = await requestLogin(API_BASE, username, password);

      if (!result.ok) {
        setLoginError(result.message);
        return;
      }

      localStorage.setItem("token", result.data.token || "");
      localStorage.setItem("role", result.data.user?.role || "");
      setUserRole(result.data.user?.role || "");
      setPage("home");
    } catch (e) {
      setLoginError("로그인 중 오류 발생");
    } finally {
      setIsLoading(false);
    }
  };

  async function requestLogin(API_BASE, username, password) {
    const u = String(username ?? "").trim();
    const p = String(password ?? "").trim();

    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, status: res.status, message: data.message || "로그인 실패" };
    }

    return { ok: true, status: 200, data };
  }

  useEffect(() => {
    if (page === 'products' || page === 'home') {
      setIsLoadingProducts(true);
      const token = localStorage.getItem('token');

      fetch(`${API_BASE}/api/products`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
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
        })
        .finally(() => {
          setIsLoadingProducts(false);
        });
    }
  }, [page]);

  const viewProduct = async (id) => {
    try {
      const pid = Number(id);

      const res = await fetch(`${API_BASE}/api/products/${pid}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.message || '상품 조회 실패';
        const code = data.code ? ` (${data.code})` : '';
        alert(`${res.status}${code}\n${msg}`);

        setSelectedProduct(null);
        return;
      }

      const product = normalizeProduct(data);
      setSelectedProduct(product);
      setPage('productDetail');
    } catch (e) {
      alert(e?.message || '알 수 없는 오류');
      setSelectedProduct(null);
    }
  };

  const handleView = async (id) => {
    await viewProduct(id);
  };

  const addToCart = (product, qty = 1, showAlert = true) => {
    if (!isLoggedIn()) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) {
        setPage('login');
      }
      return;
    }

    const p = normalizeProduct(product);
    const quantity = Math.max(1, Number(qty) || 1);

    if (!p) return;

    if (!p.price || p.price <= 0) {
      alert("상품 가격 오류(0원). 상품 데이터 확인 필요");
      return;
    }

    setCart((prev) => {
      const idx = prev.findIndex((x) => Number(x.id) === Number(p.id));
      if (idx >= 0) {
        const next = prev.slice();
        next[idx] = { ...next[idx], quantity: (Number(next[idx].quantity) || 1) + quantity };
        return next;
      }
      return [...prev, { ...p, quantity }];
    });

    if (showAlert) {
      alert('장바구니에 상품이 추가되었습니다.');
    }
  };

  const cartCount = cart.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

  const removeFromCartById = (id) => {
    const idx = cart.findIndex((x) => x.id === id);
    if (idx >= 0) removeFromCart(idx);
  };

  const removeFromCart = async (index) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/user-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ action: "cart_remove", index, cart }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || `삭제 실패 (status=${res.status})`);
        return;
      }

      setCart(data.cart || []);
    } catch (e) {
      alert("삭제 중 오류 발생");
    }
  };

  const total = cart.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);

  const order = async (items) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE}/api/user-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ action: "order", items }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || "주문 실패");
        return;
      }

      setCart([]);
      setSelectedProduct(null);
      setPage("orderComplete");
    } catch (e) {
      alert("주문 중 오류 발생");
      console.error(e);
    }
  };

  const buyNow = async (product, quantity = 1) => {
    if (!isLoggedIn()) {
      try {
        const res = await fetch(`${API_BASE}/api/user-actions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "",
          },
          body: JSON.stringify({ action: "order", items: [] }),
        });

        const data = await res.json().catch(() => ({}));
        alert(`API 오류 발생!\n상태 코드: ${res.status}\n메시지: ${data.message || '인증 실패'}`);
      } catch (e) {
        alert('네트워크 오류: ' + e.message);
      }
      return;
    }

    if (!product) return;
    const p = normalizeProduct(product);
    const qty = Math.max(1, Number(quantity) || 1);

    const items = [{ ...p, quantity: qty }];
    await order(items);
  };

  const restartApp = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    setCart([]);
    setSelectedProduct(null);
    setUserId("");
    setPassword("");
    setError("");
    setUserRole("");
    setPage("home");
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      restartApp();
    }
  };

  const handleGoToProducts = () => {
    if (!isLoggedIn()) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) {
        setPage('login');
      }
      return;
    }
    setPage('products');
  };

  // 위시리스트 토글
  const toggleWishlist = (product) => {
    if (!isLoggedIn()) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) {
        setPage('login');
      }
      return;
    }

    const productId = Number(product.id);
    setWishlist((prev) => {
      const isInWishlist = prev.some((item) => Number(item.id) === productId);
      if (isInWishlist) {
        return prev.filter((item) => Number(item.id) !== productId);
      } else {
        return [...prev, normalizeProduct(product)];
      }
    });
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => Number(item.id) === Number(productId));
  };

  if (page === 'home') {
    return (
      <HomePage
        products={products}
        cartCount={cartCount}
        onView={handleView}
        onAdd={addToCart}
        onGoCart={() => {
          if (!isLoggedIn()) {
            if (confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) {
              setPage('login');
            }
            return;
          }
          setPage('cart');
        }}
        onGoHome={() => setPage('home')}
        onLogout={handleLogout}
        onLogin={() => setPage('login')}
        onGoProducts={handleGoToProducts}
        onGoAdmin={() => setPage('admin')}
        isLoading={isLoadingProducts}
        isLoggedIn={isLoggedIn()}
        userRole={localStorage.getItem('role') || ''}
        wishlist={wishlist}
        onToggleWishlist={toggleWishlist}
        isInWishlist={isInWishlist}
      />
    );
  }

  if (page === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        isLoading={isLoading}
        errorMessage={loginError}
        onBack={() => setPage('home')}
      />
    );
  }

  if (page === 'products') {
    return (
      <ProductListPage
        products={products}
        onView={handleView}
        cart={cart}
        cartCount={cartCount}
        setCart={setCart}
        setPage={setPage}
        onAddToCart={(product, qty = 1) => addToCart(product, qty)}
        isLoading={isLoadingProducts}
        onBack={() => setPage('home')}
      />
    );
  }

  if (page === "productDetail" && selectedProduct) {
    return (
      <ProductDetailPage
        product={selectedProduct}
        cartCount={cart.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0)}
        onBack={() => setPage("home")}
        onGoCart={() => {
          if (!isLoggedIn()) {
            if (confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) {
              setPage('login');
            }
            return;
          }
          setPage('cart');
        }}
        onAddToCart={(qty) => {
          addToCart(selectedProduct, qty);
        }}
        onBuyNow={(qty) => buyNow(selectedProduct, qty)}
        isLoggedIn={isLoggedIn()}
        apiBase={API_BASE}
        isInWishlist={isInWishlist(selectedProduct.id)}
        onToggleWishlist={() => toggleWishlist(selectedProduct)}
      />
    );
  }

  if (page === 'cart') {
    return (
      <CartPage
        cartItems={cart}
        onIncrease={(id) => {
          const item = cart.find((x) => x.id === id);
          if (item) addToCart(item, 1, false);
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
        onBack={() => setPage('home')}
      />
    );
  }

  if (page === "orderComplete") {
    return <OrderCompletePage onRestart={restartApp} />;
  }

  if (page === "admin") {
    // UI는 모두에게 보이지만, API 호출 시 권한 체크
    return (
      <AdminPage
        products={products}
        onBack={() => setPage('home')}
        onUpdateProducts={(updatedProducts) => setProducts(updatedProducts)}
        isLoggedIn={isLoggedIn()}
        userRole={localStorage.getItem('role') || ''}
      />
    );
  }
}
