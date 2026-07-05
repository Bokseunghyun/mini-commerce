"use client";

import UserMenu from "./UserMenu.jsx";

// ============================================
// 공통 사이트 헤더 (서브 페이지 전역 헤더)
// - 좌측: 뒤로 버튼 + 로고(홈 이동)
// - 우측: 전체 네비게이션 (장바구니/배송조회/위시리스트/주문내역/내정보/관리자/로그인·로그아웃)
// HomePage 헤더와 동일한 비주얼 스타일을 사용한다.
// ============================================
export default function SiteHeader({
  onBack,
  onGoHome,
  onGoCart,
  onGoWishlist,
  onGoOrders,
  onGoProfile,
  onGoTracking,
  onGoAdmin,
  onGoLogin,
  onGoSignup,
  onLogout,
  isLoggedIn = false,
  role = "",
  username = "",
  cartCount = 0,
}) {
  return (
    <header
      id="site-header"
      className="site-header"
      style={styles.header}
      data-testid="site-header"
      role="banner"
      data-role={role}
    >
      <div style={styles.headerInner} className="site-header-inner">
        {/* LEFT: 뒤로 + 로고 */}
        <div style={styles.headerLeft} className="site-header-left">
          <button
            type="button"
            id="site-back-btn"
            name="siteBackButton"
            className="btn btn-ghost site-back-button"
            aria-label="뒤로 가기"
            onClick={onBack}
            style={styles.backBtn}
            data-testid="site-back-btn"
          >
            ← 뒤로
          </button>

          <div
            id="site-logo"
            className="site-logo"
            style={styles.logo}
            onClick={onGoHome}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onGoHome?.();
              }
            }}
            data-testid="site-logo"
            aria-label="Mini Commerce 홈으로 이동"
          >
            Mini Commerce
          </div>
        </div>

        {/* RIGHT: 네비게이션 */}
        <nav
          style={styles.headerActions}
          className="site-header-actions"
          aria-label="사이트 내비게이션"
        >
          <button
            type="button"
            id="site-nav-cart"
            name="siteNavCart"
            className="btn btn-cart site-nav-cart"
            aria-label="장바구니로 이동"
            onClick={onGoCart}
            style={styles.cartBtn}
            data-testid="site-nav-cart"
          >
            장바구니
            {cartCount > 0 && (
              <span
                id="site-cart-badge"
                className="cart-count badge"
                style={styles.cartCount}
                data-testid="site-cart-badge"
                aria-live="polite"
              >
                {cartCount}
              </span>
            )}
          </button>

          {/* 배송조회 - 항상 표시, 로그인 불필요 */}
          <button
            type="button"
            id="site-nav-tracking"
            name="siteNavTracking"
            className="btn btn-ghost site-nav-tracking"
            aria-label="배송조회로 이동"
            onClick={onGoTracking}
            style={styles.navBtn}
            data-testid="site-nav-tracking"
          >
            배송조회
          </button>

          {/* 관리자 - 항상 표시 (HomePage와 동일) */}
          <button
            type="button"
            id="site-nav-admin"
            name="siteNavAdmin"
            className="btn btn-admin site-nav-admin"
            aria-label="관리자 페이지"
            onClick={onGoAdmin}
            style={styles.adminBtn}
            data-testid="site-nav-admin"
          >
            관리자
          </button>

          {/* 계정 메뉴 (로그인/회원가입 또는 내정보/위시리스트/주문내역/로그아웃) */}
          <UserMenu
            isLoggedIn={isLoggedIn}
            role={role}
            username={username}
            onGoLogin={onGoLogin}
            onGoSignup={onGoSignup}
            onGoProfile={onGoProfile}
            onGoWishlist={onGoWishlist}
            onGoOrders={onGoOrders}
            onLogout={onLogout}
          />
        </nav>
      </div>
    </header>
  );
}

// ============================================
// 스타일 정의 (HomePage 헤더 스타일 값을 그대로 미러링)
// ============================================
const styles = {
  header: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    padding: "16px 24px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexShrink: 0,
  },
  backBtn: {
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    backgroundColor: "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "color 0.2s, border-color 0.2s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  logo: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1a1a1a",
    cursor: "pointer",
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
    flexWrap: "wrap",
    rowGap: "8px",
    justifyContent: "flex-end",
  },
  navBtn: {
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    backgroundColor: "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "color 0.2s, border-color 0.2s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  cartBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    whiteSpace: "nowrap",
    position: "relative",
    flexShrink: 0,
  },
  cartCount: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: "12px",
  },
  adminBtn: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#374151",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  logoutBtn: {
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    backgroundColor: "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "color 0.2s, border-color 0.2s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  loginBtn: {
    padding: "10px 14px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    backgroundColor: "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "color 0.2s, border-color 0.2s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
};
