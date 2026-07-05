import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import ProductListPage from './pages/ProductList';
import ProductDetailPage from './pages/ProductDetail';
import CartPage from './pages/cart';
import LoginPage from './pages/login.jsx';
import SignupPage from './pages/Signup.jsx';
import Modal from './components/Modal.jsx';
import ToastHost from './components/ToastHost.jsx';
import { toast } from './lib/toast.js';
import CheckoutPage from './pages/Checkout.jsx';
import OrderCompletePage from "./pages/OrderComplete.jsx";
import OrderHistoryPage from './pages/OrderHistory.jsx';
import WishlistPage from './pages/Wishlist.jsx';
import AdminPage from "./pages/AdminPage.jsx";
import ProfilePage from './pages/Profile.jsx';
import TrackingPage from './pages/Tracking.jsx';
import InicisCompletePage from './pages/InicisComplete.jsx';
import SiteHeader from './components/SiteHeader.jsx';

// URL 경로 → page 상태 매핑 (초기 진입 시 사용)
function getPageFromPath(path) {
  if (path === '/login') return 'login';
  if (path === '/signup') return 'signup';
  if (path === '/products') return 'products';
  if (path.startsWith('/product/')) {
    const productId = parseInt(path.split('/product/')[1]);
    return productId ? 'productDetail' : 'home';
  }
  if (path === '/cart') return 'cart';
  if (path === '/checkout') return 'checkout';
  if (path === '/order-complete') return 'orderComplete';
  if (path === '/orders') return 'orders';
  if (path === '/wishlist') return 'wishlist';
  if (path === '/admin') return 'admin';
  if (path === '/profile') return 'profile';
  if (path === '/tracking') return 'tracking';
  if (path === '/payment-inicis-complete') return 'inicisComplete';
  return 'home';
}

export default function App() {
  // URL 기반 라우팅: 초기 진입 URL에 맞는 페이지로 시작 (딥링크 지원)
  const [page, setPage] = useState(() => getPageFromPath(window.location.pathname));
  // 로그인/회원가입은 페이지 이동 없이 모달로 띄운다 (null | 'login' | 'signup')
  const [authModal, setAuthModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  // 서버 장바구니 (GET /api/user-actions?type=cart 의 items:
  // [{ productId, name, price, imageUrl, quantity, stock }])
  const [cart, setCart] = useState([]);
  // 바로구매 상품 ({ id, name, price, imageUrl, quantity } | null)
  const [buyNowItem, setBuyNowItem] = useState(null);
  // 장바구니에서 선택(체크)한 항목만 결제로 (null = 서버 장바구니 전체)
  const [checkoutItems, setCheckoutItems] = useState(null);
  // 마지막 완료 주문 (주문 완료 페이지 표시용)
  const [lastOrder, setLastOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [loginError, setLoginError] = useState("");
  // 딥링크(/product/:id) 진입 시 상품 조회 중 여부
  const [isProductLoading, setIsProductLoading] = useState(
    () => getPageFromPath(window.location.pathname) === 'productDetail'
  );

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // 로그인 상태는 sessionStorage(토큰/역할/사용자명)에 보관한다.
  //  - 같은 탭에서는 새로고침해도 유지된다.
  //  - 탭을 닫으면 사라진다(다음날/새 탭에서는 로그아웃 상태). 탭 간에도 공유되지 않는다.
  // 로그아웃/주문완료 시에만 명시적으로 토큰을 제거한다.

  // URL 기반 라우팅: URL 변경 시 page 상태 업데이트
  useEffect(() => {
    const path = window.location.pathname;

    if (path.startsWith('/product/')) {
      const productId = parseInt(path.split('/product/')[1]);
      if (productId) {
        // 딥링크 진입: API에서 상품을 조회한 뒤 상세 페이지 표시
        setPage('productDetail');
        setIsProductLoading(true);
        viewProduct(productId).finally(() => setIsProductLoading(false));
      } else {
        setPage('home');
      }
    } else {
      applyPage(getPageFromPath(path));
    }
    // 최초 마운트 시 1회만 실행 (viewProduct는 의존성에서 의도적으로 제외)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // popstate 이벤트 감지 (브라우저 뒤로가기/앞으로가기)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;

      if (path.startsWith('/product/')) {
        const productId = parseInt(path.split('/product/')[1]);
        if (productId && products.length > 0) {
          const product = products.find(p => p.id === productId);
          if (product) {
            setSelectedProduct(product);
            setPage('productDetail');
          }
        }
      } else {
        applyPage(getPageFromPath(path));
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
    else if (page === 'signup') newPath = '/signup';
    else if (page === 'products') newPath = '/products';
    else if (page === 'productDetail') {
      // 상품 조회가 끝나기 전에는 URL을 덮어쓰지 않음 (딥링크 /product/:id 유지)
      if (!selectedProduct) return;
      newPath = `/product/${selectedProduct.id}`;
    }
    else if (page === 'cart') newPath = '/cart';
    else if (page === 'checkout') newPath = '/checkout';
    else if (page === 'orderComplete') newPath = '/order-complete';
    else if (page === 'orders') newPath = '/orders';
    else if (page === 'wishlist') newPath = '/wishlist';
    else if (page === 'admin') newPath = '/admin';
    else if (page === 'profile') newPath = '/profile';
    else if (page === 'tracking') newPath = '/tracking';
    else if (page === 'inicisComplete') return; // 쿼리스트링(paymentKey) 보존을 위해 URL 재작성 안 함
    else newPath = '/';

    if (currentPath !== newPath) {
      window.history.pushState({}, '', newPath);
    }
  }, [page, selectedProduct]);

  const isLoggedIn = () => {
    return !!sessionStorage.getItem('token');
  };

  // 로그인 필요 페이지 이동 (미로그인 시 로그인 페이지 이동 confirm)
  const goWithLoginCheck = (targetPage) => {
    if (!isLoggedIn()) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인하시겠습니까?')) {
        openLogin();
      }
      return;
    }
    setPage(targetPage);
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

  // 서버 장바구니 조회 → cart 상태 동기화
  const fetchCart = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      setCart([]);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/user-actions?type=cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) setCart([]);
        return;
      }

      setCart(Array.isArray(data.items) ? data.items : []);
    } catch {
      // 네트워크 오류 시 기존 상태 유지
    }
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

      sessionStorage.setItem("token", result.data.token || "");
      sessionStorage.setItem("role", result.data.user?.role || "");
      sessionStorage.setItem("username", result.data.user?.username || "");
      // 로그인 성공 시 서버 장바구니 동기화 후 모달만 닫는다 (현재 페이지 유지)
      fetchCart();
      setAuthModal(null);
    } catch {
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

  // 상품 목록 조회 (DB가 단일 소스)
  useEffect(() => {
    if (page === 'products' || page === 'home') {
      setIsLoadingProducts(true);
      const token = sessionStorage.getItem('token');

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

  // 장바구니 페이지 진입 시 서버 장바구니 동기화
  useEffect(() => {
    if (page === 'cart' && sessionStorage.getItem('token')) {
      fetchCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const viewProduct = async (id) => {
    try {
      const pid = Number(id);

      const res = await fetch(`${API_BASE}/api/products/${pid}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data.message || '상품 조회 실패';
        const code = data.code ? ` (${data.code})` : '';
        toast.error(`${res.status}${code}\n${msg}`);

        setSelectedProduct(null);
        return;
      }

      const product = normalizeProduct(data);
      setSelectedProduct(product);
      setPage('productDetail');
    } catch (e) {
      toast.error(e?.message || '알 수 없는 오류');
      setSelectedProduct(null);
    }
  };

  const handleView = async (id) => {
    await viewProduct(id);
  };

  // 장바구니 담기: 서버 장바구니에 수량 누적 (cart_add)
  const addToCart = async (product, qty = 1, showAlert = true, options = null) => {
    if (!isLoggedIn()) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인하시겠습니까?')) {
        openLogin();
      }
      return;
    }

    const productId = Number(product?.id ?? product?.productId);
    const quantity = Math.max(1, Number(qty) || 1);

    if (!productId) return;

    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/user-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ action: 'cart_add', productId, quantity, ...(options ? { options } : {}) }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.message || `장바구니 추가 실패 (status=${res.status})`);
        return;
      }

      if (Array.isArray(data.cart)) {
        setCart(data.cart);
      } else {
        await fetchCart();
      }

      if (showAlert) {
        toast.success('장바구니에 상품이 추가되었습니다.');
      }
    } catch {
      toast.error('장바구니 추가 중 오류 발생');
    }
  };

  // 장바구니 수량 변경: 절대 수량으로 갱신 (cart_update, 최소 1)
  const updateCartQuantity = async (productId, quantity) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/user-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          action: 'cart_update',
          productId: Number(productId),
          quantity: Math.max(1, Number(quantity) || 1),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.message || `수량 변경 실패 (status=${res.status})`);
        return;
      }

      if (Array.isArray(data.cart)) {
        setCart(data.cart);
      } else {
        await fetchCart();
      }
    } catch {
      toast.error('수량 변경 중 오류 발생');
    }
  };

  // 장바구니 삭제 (cart_remove)
  const removeFromCart = async (productId) => {
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/user-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ action: 'cart_remove', productId: Number(productId) }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.message || `삭제 실패 (status=${res.status})`);
        // 서버에 이미 없는 항목(404)이면 재조회로 동기화
        if (res.status === 404) await fetchCart();
        return;
      }

      if (Array.isArray(data.cart)) {
        setCart(data.cart);
      } else {
        await fetchCart();
      }
    } catch {
      toast.error('삭제 중 오류 발생');
    }
  };

  const cartCount = cart.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0);

  // 바로구매: 결제 페이지로 이동 (실제 주문 생성은 결제 페이지에서 수행)
  const buyNow = (product, quantity = 1, options = null) => {
    if (!isLoggedIn()) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인하시겠습니까?')) {
        openLogin();
      }
      return;
    }

    if (!product) return;
    const p = normalizeProduct(product);

    setBuyNowItem({
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: p.imageUrl || (Array.isArray(p.images) ? p.images[0] : '') || '',
      quantity: Math.max(1, Number(quantity) || 1),
      options: options || null,
    });
    setPage('checkout');
  };

  const restartApp = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("username");

    // 클라이언트 상태만 초기화 (서버 장바구니는 계정에 유지됨)
    setCart([]);
    setSelectedProduct(null);
    setBuyNowItem(null);
    setLastOrder(null);
    setPage("home");
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      restartApp();
    }
  };

  const handleGoToProducts = () => {
    goWithLoginCheck('products');
  };

  // 로그인/회원가입 모달 열고 닫기 (페이지 이동 없음)
  const openLogin = () => { setLoginError(""); setAuthModal('login'); };
  const openSignup = () => setAuthModal('signup');
  const closeAuth = () => setAuthModal(null);

  // getPageFromPath 결과 반영 — 단, login/signup 은 페이지가 아니라 모달로 연다
  const applyPage = (p) => {
    if (p === 'login' || p === 'signup') { setPage('home'); setAuthModal(p); }
    else setPage(p);
  };

  // 서브 페이지 전역 공통 헤더 (홈/로그인/회원가입 제외한 모든 페이지 상단에 렌더)
  const siteHeader = (
    <SiteHeader
      onBack={() => window.history.back()}
      onGoHome={() => setPage('home')}
      onGoCart={() => goWithLoginCheck('cart')}
      onGoWishlist={() => goWithLoginCheck('wishlist')}
      onGoOrders={() => goWithLoginCheck('orders')}
      onGoProfile={() => goWithLoginCheck('profile')}
      onGoTracking={() => setPage('tracking')}
      onGoAdmin={() => setPage('admin')}
      onGoLogin={() => openLogin()}
      onGoSignup={() => openSignup()}
      onLogout={handleLogout}
      isLoggedIn={isLoggedIn()}
      role={sessionStorage.getItem('role') || ''}
      username={sessionStorage.getItem('username') || ''}
      cartCount={cartCount}
    />
  );

  const renderPage = () => {
  if (page === 'home') {
    return (
      <HomePage
        products={products}
        cartCount={cartCount}
        onView={handleView}
        onGoCart={() => goWithLoginCheck('cart')}
        onGoHome={() => setPage('home')}
        onLogout={handleLogout}
        onLogin={() => openLogin()}
        onGoSignup={() => openSignup()}
        onGoWishlist={() => goWithLoginCheck('wishlist')}
        onGoOrders={() => goWithLoginCheck('orders')}
        onGoProducts={handleGoToProducts}
        onGoAdmin={() => setPage('admin')}
        onGoProfile={() => goWithLoginCheck('profile')}
        isLoading={isLoadingProducts}
        isLoggedIn={isLoggedIn()}
        userRole={sessionStorage.getItem('role') || ''}
        username={sessionStorage.getItem('username') || ''}
      />
    );
  }

  if (page === 'products') {
    return (
      <>
        {siteHeader}
        <ProductListPage
          products={products}
          onView={handleView}
          cartCount={cartCount}
          setPage={setPage}
          onAddToCart={(product, qty = 1) => addToCart(product, qty)}
          isLoading={isLoadingProducts}
          onBack={() => setPage('home')}
        />
      </>
    );
  }

  if (page === "productDetail" && !selectedProduct) {
    // 딥링크 진입 등으로 상품 조회가 진행 중이면 로딩 인디케이터 표시
    if (isProductLoading) {
      return (
        <div
          data-testid="loading-spinner"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "16px",
          }}
        >
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e5e7eb",
              borderTopColor: "#1a1a1a",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>상품을 불러오는 중...</p>
        </div>
      );
    }

    // 상품 조회 실패(404/500 등) 시 홈으로 리다이렉트
    setPage("home");
    return null;
  }

  if (page === "productDetail" && selectedProduct) {
    return (
      <>
        {siteHeader}
        <ProductDetailPage
          product={selectedProduct}
          cartCount={cartCount}
          onBack={() => setPage("home")}
          onGoCart={() => goWithLoginCheck('cart')}
          onAddToCart={(qty, options) => {
            addToCart(selectedProduct, qty, true, options);
          }}
          onBuyNow={(qty, options) => buyNow(selectedProduct, qty, options)}
          isLoggedIn={isLoggedIn()}
        />
      </>
    );
  }

  if (page === 'cart') {
    return (
      <>
        {siteHeader}
        <CartPage
          cartItems={cart}
          onIncrease={(productId) => {
            const item = cart.find((x) => Number(x.productId) === Number(productId));
            if (!item) return;
            const stock = Number(item.stock);
            const current = Number(item.quantity) || 1;
            // 재고 상한까지만 증가 (재고 정보가 있을 때)
            if (Number.isFinite(stock) && stock > 0 && current >= stock) {
              toast.error(`재고가 ${stock}개까지만 담을 수 있습니다.`);
              return;
            }
            updateCartQuantity(productId, current + 1);
          }}
          onDecrease={(productId) => {
            const item = cart.find((x) => Number(x.productId) === Number(productId));
            if (item) updateCartQuantity(productId, Math.max(1, (Number(item.quantity) || 1) - 1));
          }}
          onRemove={(productId) => removeFromCart(productId)}
          onCheckout={(selected) => {
            setBuyNowItem(null);
            // 체크한 항목만 결제로 (선택 없으면 전체)
            setCheckoutItems(Array.isArray(selected) && selected.length ? selected : null);
            setPage('checkout');
          }}
          onBack={() => setPage('home')}
        />
      </>
    );
  }

  if (page === 'checkout') {
    return (
      <>
        {siteHeader}
        <CheckoutPage
          apiBase={API_BASE}
          buyNowItem={buyNowItem}
          selectedItems={checkoutItems}
          onOrderComplete={async (order) => {
            setLastOrder(order || null);
            setBuyNowItem(null);
            // 선택 항목만 주문한 경우: 주문한 항목을 장바구니에서 제거
            if (Array.isArray(checkoutItems) && checkoutItems.length) {
              const token = sessionStorage.getItem('token');
              for (const it of checkoutItems) {
                try {
                  await fetch(`${API_BASE}/api/user-actions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
                    body: JSON.stringify({ action: 'cart_remove', productId: it.productId }),
                  });
                } catch { /* 무시 */ }
              }
            }
            setCheckoutItems(null);
            // 장바구니 주문이면 서버가 장바구니를 비웠으므로 재조회로 동기화
            fetchCart();
            setPage('orderComplete');
          }}
          onBack={() => {
            setCheckoutItems(null);
            if (buyNowItem) {
              setBuyNowItem(null);
              setPage(selectedProduct ? 'productDetail' : 'home');
            } else {
              setPage('cart');
            }
          }}
        />
      </>
    );
  }

  if (page === "orderComplete") {
    return (
      <>
        {siteHeader}
        <OrderCompletePage
          order={lastOrder}
          onGoOrders={() => setPage('orders')}
          onRestart={restartApp}
        />
      </>
    );
  }

  if (page === 'orders') {
    return (
      <>
        {siteHeader}
        <OrderHistoryPage
          apiBase={API_BASE}
          onBack={() => setPage('home')}
          onGoHome={() => setPage('home')}
        />
      </>
    );
  }

  if (page === 'wishlist') {
    return (
      <>
        {siteHeader}
        <WishlistPage
          apiBase={API_BASE}
          onBack={() => setPage('home')}
          onView={handleView}
          onAddToCart={(product, qty = 1) => addToCart(product, qty, false)}
        />
      </>
    );
  }

  if (page === 'profile') {
    return (
      <>
        {siteHeader}
        <ProfilePage
          apiBase={API_BASE}
          onBack={() => setPage('home')}
          onGoOrders={() => setPage('orders')}
          onGoTracking={() => setPage('tracking')}
        />
      </>
    );
  }

  if (page === 'tracking') {
    return (
      <>
        {siteHeader}
        <TrackingPage
          apiBase={API_BASE}
          onBack={() => setPage('home')}
        />
      </>
    );
  }

  if (page === 'inicisComplete') {
    return (
      <InicisCompletePage
        apiBase={API_BASE}
        onOrderComplete={(order) => {
          setLastOrder(order || null);
          setBuyNowItem(null);
          setCheckoutItems(null);
          fetchCart();
          setPage('orderComplete');
        }}
        onCancel={() => setPage('checkout')}
      />
    );
  }

  if (page === "admin") {
    return (
      <>
        {siteHeader}
        <AdminPage
          products={products}
          onBack={() => setPage('home')}
          onUpdateProducts={(updatedProducts) => setProducts(updatedProducts)}
          onAccessDenied={() => setPage('home')}
          apiBase={API_BASE}
        />
      </>
    );
  }

  // 알 수 없는 page 상태 방어: 홈으로 리다이렉트 (undefined 렌더 방지)
  setPage('home');
  return null;
  }; // end renderPage

  return (
    <>
      {renderPage()}

      <ToastHost />

      {authModal === 'login' && (
        <Modal open onClose={closeAuth} title="로그인" testid="login-modal">
          <LoginPage
            embedded
            onLogin={handleLogin}
            isLoading={isLoading}
            errorMessage={loginError}
          />
          <div style={authSwitchStyle}>
            계정이 없으신가요?{' '}
            <button
              type="button"
              onClick={openSignup}
              data-testid="switch-to-signup"
              style={authSwitchBtnStyle}
            >
              회원가입
            </button>
          </div>
        </Modal>
      )}

      {authModal === 'signup' && (
        <Modal open onClose={closeAuth} title="회원가입" testid="signup-modal">
          <SignupPage
            embedded
            apiBase={API_BASE}
            onSignupSuccess={openLogin}
          />
          <div style={authSwitchStyle}>
            이미 계정이 있으신가요?{' '}
            <button
              type="button"
              onClick={openLogin}
              data-testid="switch-to-login"
              style={authSwitchBtnStyle}
            >
              로그인
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// 모달 하단 로그인 ↔ 회원가입 전환 링크 스타일
const authSwitchStyle = {
  textAlign: 'center',
  marginTop: '16px',
  fontSize: '14px',
  color: '#6b7280',
};
const authSwitchBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  fontWeight: 600,
  cursor: 'pointer',
  padding: 0,
  fontSize: '14px',
};
