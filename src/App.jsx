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
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [userRole, setUserRole] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // REQ 1: 앱 초기 진입 시 반드시 비로그인 상태
  useEffect(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  }, []);

  // URL 기반 라우팅: URL 변경 시 page 상태 업데이트
  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    
    if (path === '/login') {
      setPage('login');
    } else if (path === '/products') {
      setPage('products');
    } else if (path.startsWith('/product/')) {
      const productId = parseInt(path.split('/product/')[1]);
      if (productId) {
        setPage('productDetail');
        // selectedProduct는 별도 로직에서 설정됨
      }
    } else if (path === '/cart') {
      setPage('cart');
    } else if (path === '/order-complete') {
      setPage('orderComplete');
    } else if (path === '/admin') {
      setPage('admin');
    } else {
      setPage('home');
    }
  }, []);

  // popstate 이벤트 감지 (브라우저 뒤로가기/앞으로가기)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      
      if (path === '/login') {
        setPage('login');
      } else if (path === '/products') {
        setPage('products');
      } else if (path.startsWith('/product/')) {
        const productId = parseInt(path.split('/product/')[1]);
        if (productId && products.length > 0) {
          const product = products.find(p => p.id === productId);
          if (product) {
            setSelectedProduct(product);
            setPage('productDetail');
          }
        }
      } else if (path === '/cart') {
        setPage('cart');
      } else if (path === '/order-complete') {
        setPage('orderComplete');
      } else if (path === '/admin') {
        setPage('admin');
      } else {
        setPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [products]);

  // page 변경 시 URL 업데이트
  useEffect(() => {
    const currentPath = window.location.pathname;
    let newPath = '/';

    if (page === 'login') newPath = '/login';
    else if (page === 'products') newPath = '/products';
    else if (page === 'productDetail' && selectedProduct) newPath = `/product/${selectedProduct.id}`;
    else if (page === 'cart') newPath = '/cart';
    else if (page === 'orderComplete') newPath = '/order-complete';
    else if (page === 'admin') newPath = '/admin';
    else newPath = '/';

    if (currentPath !== newPath) {
      window.history.pushState({}, '', newPath);
    }
  }, [page, selectedProduct]);

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

      // localStorage에 저장된 전체 상품 목록이 있으면 우선 사용
      const savedProducts = localStorage.getItem('allProductsModifications');
      if (savedProducts) {
        try {
          const parsedProducts = JSON.parse(savedProducts);
          setProducts(parsedProducts.map(normalizeProduct));
          setIsLoadingProducts(false);
          return;
        } catch (e) {
          // localStorage 파싱 실패 시 API 호출로 fallback
        }
      }

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
          const apiProducts = list.map(normalizeProduct);
          
          setProducts(apiProducts);
        })
        .catch(() => {
          setProducts([]);
        })
        .finally(() => {
          setIsLoadingProducts(false);
        });
    }
  }, [page, API_BASE]);

  const viewProduct = async (id) => {
    try {
      const pid = Number(id);

      // 먼저 localStorage에서 찾기 (Admin이 추가/수정한 상품)
      const savedProducts = localStorage.getItem('allProductsModifications');
      if (savedProducts) {
        try {
          const parsedProducts = JSON.parse(savedProducts);
          const localProduct = parsedProducts.find(p => Number(p.id) === pid);
          if (localProduct) {
            setSelectedProduct(normalizeProduct(localProduct));
            setPage('productDetail');
            return;
          }
        } catch (e) {
          // localStorage 파싱 실패 시 API 호출로 fallback
        }
      }

      // localStorage에 없으면 API 호출
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

  const addToCart = async (product, qty = 1, showAlert = true) => {
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

    // 장바구니에 추가 (낙관적 업데이트)
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
    return (
      <AdminPage
        products={products}
        onBack={() => setPage('home')}
        onUpdateProducts={(updatedProducts) => setProducts(updatedProducts)}
        onAccessDenied={() => setPage('home')}
        apiBase={API_BASE}
      />
    );
  }
}
