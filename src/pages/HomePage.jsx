"use client";

import { useState } from "react";
import QAGuide from "./QAGuide.jsx";

// ============================================
// 로딩 스피너 컴포넌트
// ============================================
function LoadingSpinner() {
  return (
    <div style={styles.loadingContainer} data-testid="loading-spinner">
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>상품을 불러오는 중...</p>
    </div>
  );
}

// ============================================
// 빈 결과 컴포넌트
// ============================================
function EmptyResults({ searchTerm }) {
  return (
    <div style={styles.emptyResults} data-testid="empty-results">
      <p style={styles.emptyText}>"{searchTerm}" 검색 결과가 없습니다.</p>
      <p style={styles.emptySubtext}>다른 검색어로 시도해보세요.</p>
    </div>
  );
}

// ============================================
// 메인 HomePage 컴포넌트
// ============================================
export default function HomePage({
  products = [],
  cartCount = 0,
  onView,
  onAdd,
  onGoCart,
  onGoHome,
  onLogout,
  onLogin,
  onGoAdmin,
  isLoading = false,
  isLoggedIn = false,
  userRole = "",
}) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("default");
  const [showQAGuide, setShowQAGuide] = useState(false);

  const categories = ["전체", "전자기기", "액세서리", "생활"];

  // ============================================
  // 검색 필터링 (appliedKeyword 기준 - 검색 버튼 클릭 후 적용)
  // ============================================
  const filteredBySearch = products.filter((product) => {
    const searchLower = appliedKeyword.toLowerCase().trim();
    if (!searchLower) return true;

    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower)
    );
  });

  // ============================================
  // 카테고리 필터링
  // ============================================
  const filteredByCategory = filteredBySearch.filter((product) => {
    if (activeCategory === "전체") return true;
    return product.category === activeCategory;
  });

  // ============================================
  // 정렬
  // ============================================
  const sortedProducts = [...filteredByCategory].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return (a.price || 0) - (b.price || 0);
      case "price-desc":
        return (b.price || 0) - (a.price || 0);
      case "name":
        return (a.name || "").localeCompare(b.name || "", "ko-KR");
      case "discount":
        return (b.discountRate || 0) - (a.discountRate || 0);
      default:
        return 0;
    }
  });

  const handleCategoryClick = (category) => {
    setActiveCategory(category);
  };

  const handleSearchChange = (e) => {
    setSearchKeyword(e.target.value);
  };

  // 검색 버튼 클릭 또는 엔터키 시 appliedKeyword 업데이트
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedKeyword(searchKeyword);
  };

  // 장바구니 버튼 클릭 핸들러 (로그인 유도)
  const handleCartClick = () => {
    if (!isLoggedIn) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) {
        onLogin?.();
      }
      return;
    }
    onGoCart?.();
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="home-page" style={styles.page} data-testid="home-page">
        {/* Header */}
        <header
          id="home-header"
          className="home-header"
          style={styles.header}
          data-testid="home-header"
          role="banner"
        >
          <div style={styles.headerInner}>
            <div
              id="shop-logo"
              className="logo shop-logo"
              style={styles.logo}
              onClick={onGoHome}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onGoHome?.()}
              data-testid="logo"
              aria-label="ShopDemo 홈으로 이동"
            >
              ShopDemo
            </div>

            <form onSubmit={handleSearchSubmit} style={styles.searchForm} className="search-form">
              <input
                type="text"
                id="home-search"
                name="searchKeyword"
                className="search-input"
                aria-label="상품 검색"
                placeholder="상품을 검색하세요"
                value={searchKeyword}
                onChange={handleSearchChange}
                style={styles.searchInput}
                data-testid="search-input"
              />
              <button
                type="submit"
                id="home-search-btn"
                className="btn btn-secondary search-button"
                aria-label="검색"
                style={styles.searchBtn}
                data-testid="search-button"
              >
                검색
              </button>
            </form>

            <div style={styles.headerActions} className="header-actions">
              {/* QA 가이드 버튼 */}
              <button
                type="button"
                id="qa-guide-btn"
                name="qaGuideButton"
                className="btn btn-info qa-guide-button"
                aria-label="QA 자동화 가이드"
                onClick={() => setShowQAGuide(true)}
                style={styles.qaGuideBtn}
              >
                📘 QA 가이드
              </button>

              {/* 장바구니 버튼 - 로그인 유도 포함 */}
              <button
                type="button"
                id="home-cart-btn"
                name="cartButton"
                className="btn btn-cart cart-button"
                aria-label="장바구니로 이동"
                onClick={handleCartClick}
                style={styles.cartBtn}
                data-testid="cart-button"
              >
                장바구니
                {cartCount > 0 && (
                  <span
                    id="cart-badge"
                    className="cart-count badge"
                    style={styles.cartCount}
                    data-testid="cart-badge"
                    aria-live="polite"
                  >
                    {cartCount}
                  </span>
                )}
              </button>

              {/* 관리자 버튼 - admin 로그인 시만 표시 */}
              {isLoggedIn && userRole === "ADMIN" && (
                <button
                  type="button"
                  id="home-admin-btn"
                  name="adminButton"
                  className="btn btn-admin admin-button"
                  aria-label="관리자 페이지"
                  onClick={onGoAdmin}
                  style={styles.adminBtn}
                  data-testid="admin-button"
                >
                  관리자
                </button>
              )}

              {/* 로그인 / 로그아웃 토글 */}
              {isLoggedIn ? (
                <button
                  type="button"
                  id="home-logout"
                  name="logoutButton"
                  className="btn btn-ghost logout-button"
                  aria-label="로그아웃"
                  onClick={onLogout}
                  style={styles.logoutBtn}
                  data-testid="logout-button"
                >
                  로그아웃
                </button>
              ) : (
                <button
                  type="button"
                  id="home-login"
                  name="loginButton"
                  className="btn btn-ghost login-button"
                  aria-label="로그인"
                  onClick={onLogin}
                  style={styles.loginBtn}
                  data-testid="login-button"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Banner */}
        <section className="main-banner" style={styles.banner} data-testid="main-banner">
          <div style={styles.bannerContent}>
            <h1 style={styles.bannerTitle}>겨울 시즌 특가 세일</h1>
            <p style={styles.bannerSubtitle}>최대 50% 할인된 가격으로 만나보세요</p>
          </div>
        </section>

        {/* Category & Sort Controls */}
        <section
          id="home-category"
          className="category-filter"
          style={styles.controlSection}
          data-testid="control-section"
          role="navigation"
          aria-label="상품 카테고리 필터"
        >
          <div style={styles.controlInner}>
            <div style={styles.categoryWrapper} className="category-wrapper">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  id={`category-${category}`}
                  name={`category-${category}`}
                  className={`btn btn-category category-button ${
                    activeCategory === category ? "active" : ""
                  }`}
                  onClick={() => handleCategoryClick(category)}
                  style={{
                    ...styles.categoryBtn,
                    ...(activeCategory === category ? styles.categoryBtnActive : {}),
                  }}
                  data-testid={`category-${category}`}
                  data-category={category}
                  aria-pressed={activeCategory === category}
                >
                  {category}
                </button>
              ))}
            </div>

            <div style={styles.sortContainer} className="sort-container">
              <label htmlFor="sort-select" style={styles.sortLabel}>
                정렬:
              </label>
              <select
                id="sort-select"
                name="sortBy"
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.sortSelect}
                data-testid="sort-select"
                aria-label="상품 정렬 방식"
              >
                <option value="default">기본순</option>
                <option value="price-asc">낮은 가격순</option>
                <option value="price-desc">높은 가격순</option>
                <option value="name">이름순</option>
                <option value="discount">할인율순</option>
              </select>
            </div>
          </div>
        </section>

        {/* Search Results Info */}
        {appliedKeyword && (
          <div style={styles.resultsInfo} data-testid="results-info">
            총 {sortedProducts.length}개의 상품을 찾았습니다.
          </div>
        )}

        {/* Product Grid */}
        <main
          id="home-product-grid"
          className="product-grid"
          style={styles.productGridWrapper}
        >
          {isLoading ? (
            <LoadingSpinner />
          ) : sortedProducts.length === 0 && appliedKeyword ? (
            <EmptyResults searchTerm={appliedKeyword} />
          ) : (
            <div style={styles.productGrid} className="products-container" data-testid="product-grid" role="list">
              {sortedProducts.map((product, index) => (
                <article
                  key={product.id}
                  id={`product-${product.id}`}
                  className="product-card product-item"
                  style={styles.productCard}
                  data-testid={`product-card-${product.id}`}
                  data-product-id={product.id}
                  data-product-name={product.name}
                  data-product-category={product.category}
                  data-product-index={index}
                  role="listitem"
                >
                  <div
                    className="product-image product-thumbnail"
                    style={styles.productImage}
                    data-testid={`product-image-${product.id}`}
                  >
                    {product.imageUrl || product.image ? (
                      <img
                        src={product.imageUrl || product.image || "/placeholder.svg"}
                        alt={product.name}
                        className="product-img"
                        style={styles.productImg}
                      />
                    ) : (
                      <div style={styles.productImgPlaceholder} className="product-placeholder">
                        {product.name?.charAt(0)}
                      </div>
                    )}
                    {product.discountRate > 0 && (
                      <span
                        className="discount-badge badge"
                        style={styles.discountBadge}
                        data-testid={`discount-badge-${product.id}`}
                        aria-label={`${product.discountRate}% 할인`}
                      >
                        {product.discountRate}%
                      </span>
                    )}
                  </div>
                  <div className="product-info product-details" style={styles.productInfo}>
                    <h3
                      className="product-name product-title"
                      style={styles.productName}
                      data-testid={`product-name-${product.id}`}
                      title={product.name}
                    >
                      {product.name}
                    </h3>
                    <div className="product-price price-wrapper" style={styles.priceWrapper}>
                      {product.originalPrice && (
                        <span
                          className="original-price price-before"
                          style={styles.originalPrice}
                          data-testid={`original-price-${product.id}`}
                          aria-label={`정가 ${product.originalPrice.toLocaleString()}원`}
                        >
                          {product.originalPrice.toLocaleString()}원
                        </span>
                      )}
                      <span
                        className="sale-price price-current"
                        style={styles.salePrice}
                        data-testid={`price-${product.id}`}
                        aria-label={`판매가 ${(product.price || product.discountedPrice || 0).toLocaleString()}원`}
                      >
                        {(product.price || product.discountedPrice || 0).toLocaleString()}
                        원
                      </span>
                    </div>
                    <div className="product-actions action-buttons" style={styles.productActions}>
                      <button
                        type="button"
                        id={`product-${product.id}-view`}
                        name={`view-${product.id}`}
                        className="btn btn-secondary view-btn product-view-button"
                        aria-label="상품 상세"
                        onClick={() => onView?.(product.id)}
                        style={styles.viewBtn}
                        data-testid={`view-detail-btn-${product.id}`}
                        data-action="view"
                      >
                        상세
                      </button>
                      <button
                        type="button"
                        id={`product-${product.id}-add`}
                        name={`add-${product.id}`}
                        className="btn btn-primary add-btn product-add-button"
                        aria-label="장바구니 담기"
                        onClick={() => onAdd?.(product)}
                        style={styles.addBtn}
                        data-testid={`add-to-cart-btn-${product.id}`}
                      >
                        장바구니 담기
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="home-footer" style={styles.footer} data-testid="footer">
          <div style={styles.footerInner}>
            <p style={styles.footerText}>© 2026 ShopDemo. All rights reserved.</p>
            <p style={styles.footerText}>QA 자동화 연습용 데모 페이지입니다.</p>
          </div>
        </footer>
      </div>

      {/* QA Guide Modal */}
      {showQAGuide && <QAGuide onClose={() => setShowQAGuide(false)} />}
    </>
  );
}

// ============================================
// 스타일 정의
// ============================================
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
  },
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
  logo: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1a1a1a",
    cursor: "pointer",
    flexShrink: 0,
  },
  searchForm: {
    display: "flex",
    flex: 1,
    maxWidth: "480px",
    gap: "8px",
  },
  searchInput: {
    flex: 1,
    padding: "10px 16px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  searchBtn: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    whiteSpace: "nowrap",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginLeft: "auto",
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
  },
  cartCount: {
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    padding: "2px 8px",
    borderRadius: "12px",
  },
  qaGuideBtn: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#0891b2",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    whiteSpace: "nowrap",
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
  },
  logoutBtn: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    backgroundColor: "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "color 0.2s, border-color 0.2s",
  },
  loginBtn: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    backgroundColor: "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "color 0.2s, border-color 0.2s",
  },
  banner: {
    background: "linear-gradient(135deg, #1a1a1a 0%, #374151 100%)",
    padding: "60px 24px",
    textAlign: "center",
  },
  bannerContent: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  bannerTitle: {
    fontSize: "36px",
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: "12px",
    marginTop: 0,
  },
  bannerSubtitle: {
    fontSize: "18px",
    color: "#dbeafe",
    margin: 0,
  },
  controlSection: {
    backgroundColor: "#ffffff",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  controlInner: {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  categoryWrapper: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    flex: 1,
  },
  categoryBtn: {
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#4b5563",
    backgroundColor: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: "24px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  categoryBtnActive: {
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  sortContainer: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  sortLabel: {
    fontSize: "14px",
    color: "#6b7280",
    fontWeight: "500",
    whiteSpace: "nowrap",
  },
  sortSelect: {
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    outline: "none",
    transition: "border-color 0.2s",
  },
  resultsInfo: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "16px 24px 0",
    fontSize: "14px",
    color: "#6b7280",
  },
  productGridWrapper: {
    flex: 1,
    width: "100%",
    boxSizing: "border-box",
  },
  productGrid: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "32px 24px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "24px",
    minHeight: "400px",
    width: "100%",
  },
  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    transition: "box-shadow 0.3s, transform 0.3s",
  },
  productImage: {
    position: "relative",
    aspectRatio: "1 / 1",
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
  },
  productImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  productImgPlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "48px",
    fontWeight: "700",
    color: "#94a3b8",
    backgroundColor: "#e2e8f0",
  },
  discountBadge: {
    position: "absolute",
    top: "12px",
    left: "12px",
    backgroundColor: "#dc2626",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "700",
    padding: "4px 8px",
    borderRadius: "6px",
  },
  productInfo: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flex: 1,
  },
  productName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
    lineHeight: 1.4,
    minHeight: "44.8px",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  priceWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  originalPrice: {
    fontSize: "14px",
    color: "#9ca3af",
    textDecoration: "line-through",
  },
  salePrice: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1a1a1a",
  },
  productActions: {
    display: "flex",
    gap: "8px",
    marginTop: "auto",
  },
  viewBtn: {
    flex: 1,
    padding: "10px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#ffffff",
    backgroundColor: "#374151",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  addBtn: {
    flex: 2,
    padding: "10px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  footer: {
    backgroundColor: "#1f2937",
    padding: "32px 24px",
    marginTop: "auto",
  },
  footerInner: {
    maxWidth: "1200px",
    margin: "0 auto",
    textAlign: "center",
  },
  footerText: {
    fontSize: "14px",
    color: "#9ca3af",
    margin: "4px 0",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    gap: "16px",
    gridColumn: "1 / -1",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #e5e7eb",
    borderTopColor: "#1a1a1a",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: "14px",
    margin: 0,
  },
  emptyResults: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    gap: "8px",
    gridColumn: "1 / -1",
  },
  emptyText: {
    fontSize: "16px",
    color: "#1f2937",
    margin: 0,
  },
  emptySubtext: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
};
