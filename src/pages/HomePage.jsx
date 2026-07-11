"use client";

import { useState, useEffect } from "react";
import QAGuide from "./QAGuide.jsx";
import UserMenu from "../components/UserMenu.jsx";
import { toast } from "../lib/toast.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ============================================
// 메인 배너 슬라이드 데이터 (자동 전환 캐러셀용)
// 링크는 QA 연습용 외부 링크(새 탭)로 연결됩니다.
// ============================================
const BANNER_SLIDES = [
  {
    id: "winter-sale",
    title: "겨울 시즌 특가 세일",
    subtitle: "최대 50% 할인된 가격으로 만나보세요",
    href: "https://www.naver.com",
    linkLabel: "네이버 바로가기",
    background: "linear-gradient(135deg, #1a1a1a 0%, #374151 100%)",
  },
  {
    id: "realtime-news",
    title: "지금 뜨는 실시간 뉴스",
    subtitle: "가장 핫한 소식을 한눈에 확인하세요",
    href: "https://news.naver.com",
    linkLabel: "네이버 뉴스 보기",
    background: "linear-gradient(135deg, #047857 0%, #10b981 100%)",
  },
  {
    id: "search-everything",
    title: "무엇이든 검색해보세요",
    subtitle: "원하는 정보를 가장 빠르게 찾아드립니다",
    href: "https://www.google.com",
    linkLabel: "구글에서 검색",
    background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
  },
  {
    id: "trending-video",
    title: "인기 급상승 동영상",
    subtitle: "지금 가장 많이 보는 영상을 만나보세요",
    href: "https://www.youtube.com",
    linkLabel: "유튜브 바로가기",
    background: "linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)",
  },
  {
    id: "todays-pick",
    title: "오늘의 추천 콘텐츠",
    subtitle: "엄선된 소식과 이슈를 모아드립니다",
    href: "https://www.daum.net",
    linkLabel: "다음 바로가기",
    background: "linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)",
  },
];

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
  onGoCart,
  onGoHome,
  onLogout,
  onLogin,
  onGoAdmin,
  onGoWishlist = () => {},
  onGoOrders = () => {},
  onGoSignup = () => {},
  onGoProfile = () => {},
  isLoading = false,
  isLoggedIn = false,
  userRole = "",
  username = "",
}) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("default");
  // 추가 필터: 최대가격 슬라이더 / 할인상품만 / 재고있음만
  const [maxPrice, setMaxPrice] = useState(null); // null = 제한 없음
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showQAGuide, setShowQAGuide] = useState(false);
  const [wishlistIds, setWishlistIds] = useState(() => new Set());
  // 메인 배너 캐러셀: 현재 슬라이드 인덱스 / 마우스 오버 시 일시정지
  const [bannerSlide, setBannerSlide] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);

  const categories = ["전체", "전자기기", "액세서리", "생활"];

  // 로그인 상태면 위시리스트 1회 조회하여 하트 상태 초기화
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!isLoggedIn || !token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/user-actions?type=wishlist`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) {
          setWishlistIds(new Set((data.items || []).map((it) => Number(it.productId))));
        }
      } catch (err) {
        console.error('Wishlist load error:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // 위시리스트 토글 (하트 클릭)
  const handleWishlistToggle = async (product) => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인하시겠습니까?')) {
        onLogin?.();
      }
      return;
    }

    const pid = Number(product.id);
    const isWished = wishlistIds.has(pid);

    try {
      const res = await fetch(`${API_BASE}/api/user-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: isWished ? 'wishlist_remove' : 'wishlist_add',
          productId: pid,
        }),
      });
      const data = await res.json().catch(() => ({}));

      const alreadyAdded = !isWished && res.status === 409; // ALREADY_IN_WISHLIST
      const alreadyRemoved = isWished && res.status === 404; // NOT_IN_WISHLIST

      if (res.ok || alreadyAdded || alreadyRemoved) {
        setWishlistIds((prev) => {
          const next = new Set(prev);
          if (isWished) next.delete(pid);
          else next.add(pid);
          return next;
        });
      } else {
        toast.error(data.message || '위시리스트 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
      toast.error('위시리스트 처리 중 오류가 발생했습니다.');
    }
  };

  // 스크롤 위치 저장 (페이지 떠날 때)
  useEffect(() => {
    return () => {
      sessionStorage.setItem('homePageScrollPosition', window.scrollY.toString());
    };
  }, []);

  // 메인 배너 자동 전환: 4초 간격으로 다음 슬라이드로 이동.
  // bannerSlide 가 바뀔 때마다 타이머를 재설정하므로 수동 조작(화살표/도트) 후에도 간격이 리셋된다.
  // 마우스 오버(bannerPaused) 시에는 정지.
  useEffect(() => {
    if (bannerPaused || BANNER_SLIDES.length <= 1) return undefined;
    const t = setTimeout(() => {
      setBannerSlide((s) => (s + 1) % BANNER_SLIDES.length);
    }, 4000);
    return () => clearTimeout(t);
  }, [bannerSlide, bannerPaused]);

  // 배너 이전/다음 이동 헬퍼 (음수 방지 위해 + length 후 나머지 연산)
  const goToBanner = (idx) =>
    setBannerSlide((idx + BANNER_SLIDES.length) % BANNER_SLIDES.length);

  // ============================================
  // 검색 필터링 (appliedKeyword 기준 - 검색 버튼 클릭 후 적용)
  // ============================================
  const filteredBySearch = products.filter((product) => {
    // active가 false인 상품은 제외
    if (product.active === false) return false;
    
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
  // 가격/할인/재고 필터
  // ============================================
  const priceCeiling = filteredBySearch.reduce(
    (m, p) => Math.max(m, Number(p.price) || 0),
    0
  );
  const effectiveMax = maxPrice == null ? priceCeiling : maxPrice;
  const filteredByOptions = filteredByCategory.filter((product) => {
    if (priceCeiling > 0 && (Number(product.price) || 0) > effectiveMax) return false;
    if (onSaleOnly && !((Number(product.discountRate) || 0) > 0)) return false;
    if (inStockOnly && !((Number(product.stock) || 0) > 0)) return false;
    return true;
  });

  // ============================================
  // 정렬
  // ============================================
  const sortedProducts = [...filteredByOptions].sort((a, b) => {
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
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    // REQ 6: 검색어가 없을 때 API 호출하여 오류 표시
    if (!searchKeyword.trim()) {
      try {
        const res = await fetch(`${API_BASE}/api/search?q=`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(`API 오류 발생!\n상태 코드: ${res.status}\n메시지: ${data.message || '검색 실패'}\n코드: ${data.code || ''}`);
        }
      } catch (err) {
        toast.error('네트워크 오류: ' + err.message);
      }
      return;
    }
    setAppliedKeyword(searchKeyword);
  };

  // 장바구니 버튼 클릭 핸들러 (로그인 유도)
  const handleCartClick = () => {
    if (!isLoggedIn) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인하시겠습니까?')) {
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
        @keyframes bannerFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .banner-slide {
          animation: bannerFade 0.5s ease;
        }
        .banner-arrow:hover {
          background: rgba(255, 255, 255, 0.35) !important;
        }
        .banner-cta {
          transition: background-color 0.2s, transform 0.2s;
        }
        .banner-content:hover .banner-cta {
          background: rgba(255, 255, 255, 0.28);
          transform: translateX(4px);
        }
        .cart-btn-br {
          display: none;
        }
        @media (max-width: 768px) {
          .product-grid { 
            grid-template-columns: repeat(2, 1fr) !important; 
            gap: 16px !important;
            padding: 16px 12px !important;
          }
          .cart-btn-br {
            display: inline !important;
          }
          .cart-btn-text {
            line-height: 1.3 !important;
          }
          .header-inner {
            flex-wrap: wrap;
            gap: 12px !important;
          }
          .header-actions {
            flex-wrap: wrap;
            gap: 8px !important;
            width: 100% !important;
            margin-left: 0 !important;
            justify-content: flex-start !important;
          }
          /* 모바일: 계정 메뉴 아이콘만 우측 끝으로 밀어 붙인다 */
          .header-actions .user-menu {
            margin-left: auto;
          }
          .search-form {
            order: 3;
            width: 100%;
            max-width: 100% !important;
          }
          .banner {
            padding: 40px 16px !important;
          }
          .banner-title {
            font-size: 24px !important;
          }
          .banner-subtitle {
            font-size: 14px !important;
          }
          .banner-arrow {
            width: 36px !important;
            height: 36px !important;
            font-size: 24px !important;
          }
          .banner-arrow-prev {
            left: 6px !important;
          }
          .banner-arrow-next {
            right: 6px !important;
          }
          .control-inner {
            flex-wrap: nowrap !important;
            gap: 8px !important;
          }
          .category-wrapper {
            flex: 1 !important;
            display: flex !important;
            gap: 6px !important;
            flex-wrap: nowrap !important;
            min-width: 0 !important;
          }
          .category-button {
            flex: 1 !important;
            padding: 8px 4px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
            min-width: 0 !important;
          }
          .sort-container {
            flex-shrink: 0 !important;
            gap: 4px !important;
          }
          .sort-label {
            font-size: 12px !important;
          }
          .sort-select {
            font-size: 12px !important;
            padding: 6px 8px !important;
            min-width: 80px !important;
          }
        }
        @media (max-width: 480px) {
          .product-grid { 
            grid-template-columns: repeat(2, 1fr) !important; 
            gap: 16px !important;
            padding: 16px 12px !important;
          }
          .logo {
            font-size: 20px !important;
          }
          .header-actions button {
            padding: 8px 12px !important;
            font-size: 13px !important;
          }
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
          <div style={styles.headerInner} className="header-inner">
            <div
              id="shop-logo"
              className="logo shop-logo"
              style={styles.logo}
              onClick={() => {
                setSearchKeyword("");
                setAppliedKeyword("");
                setActiveCategory("전체");
                setSortBy("default");
                sessionStorage.removeItem('homePageScrollPosition');
                window.scrollTo(0, 0);
                onGoHome?.();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchKeyword("");
                  setAppliedKeyword("");
                  setActiveCategory("전체");
                  setSortBy("default");
                  sessionStorage.removeItem('homePageScrollPosition');
                  window.scrollTo(0, 0);
                  onGoHome?.();
                }
              }}
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

              {/* 관리자 버튼 - 항상 표시, 클릭 시 권한 체크에서 오류 발생 */}
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

              {/* 계정 메뉴 (로그인/회원가입 또는 내정보/위시리스트/주문내역/로그아웃) */}
              <UserMenu
                isLoggedIn={isLoggedIn}
                role={userRole}
                username={username}
                onGoLogin={onLogin}
                onGoSignup={onGoSignup}
                onGoProfile={onGoProfile}
                onGoWishlist={onGoWishlist}
                onGoOrders={onGoOrders}
                onLogout={onLogout}
              />
            </div>
          </div>
        </header>

        {/* Main Banner (자동 전환 캐러셀) */}
        <section
          className="main-banner banner"
          style={{ ...styles.banner, background: BANNER_SLIDES[bannerSlide].background }}
          data-testid="main-banner"
          data-banner-index={bannerSlide}
          onMouseEnter={() => setBannerPaused(true)}
          onMouseLeave={() => setBannerPaused(false)}
          aria-roledescription="carousel"
          aria-label="프로모션 배너"
        >
          <a
            key={bannerSlide}
            href={BANNER_SLIDES[bannerSlide].href}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.bannerContent}
            className="banner-content banner-slide"
            data-testid="banner-slide"
            data-slide-id={BANNER_SLIDES[bannerSlide].id}
            aria-label={`${BANNER_SLIDES[bannerSlide].title} - ${BANNER_SLIDES[bannerSlide].linkLabel} (새 탭)`}
          >
            <h1 style={styles.bannerTitle} className="banner-title" data-testid="banner-title">
              {BANNER_SLIDES[bannerSlide].title}
            </h1>
            <p style={styles.bannerSubtitle} className="banner-subtitle" data-testid="banner-subtitle">
              {BANNER_SLIDES[bannerSlide].subtitle}
            </p>
            <span style={styles.bannerCta} className="banner-cta">
              {BANNER_SLIDES[bannerSlide].linkLabel} →
            </span>
          </a>

          {/* 이전 슬라이드 */}
          <button
            type="button"
            className="banner-arrow banner-arrow-prev"
            style={{ ...styles.bannerArrow, ...styles.bannerArrowPrev }}
            onClick={() => goToBanner(bannerSlide - 1)}
            aria-label="이전 배너"
            data-testid="banner-prev"
          >
            ‹
          </button>

          {/* 다음 슬라이드 */}
          <button
            type="button"
            className="banner-arrow banner-arrow-next"
            style={{ ...styles.bannerArrow, ...styles.bannerArrowNext }}
            onClick={() => goToBanner(bannerSlide + 1)}
            aria-label="다음 배너"
            data-testid="banner-next"
          >
            ›
          </button>

          {/* 도트 인디케이터 */}
          <div style={styles.bannerDots} className="banner-dots" role="tablist" aria-label="배너 선택">
            {BANNER_SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`banner-dot ${i === bannerSlide ? "active" : ""}`}
                style={{
                  ...styles.bannerDot,
                  ...(i === bannerSlide ? styles.bannerDotActive : {}),
                }}
                onClick={() => goToBanner(i)}
                role="tab"
                aria-selected={i === bannerSlide}
                aria-label={`${i + 1}번 배너: ${s.title}`}
                data-testid={`banner-dot-${i}`}
              />
            ))}
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

          {/* 추가 필터: 최대가격 슬라이더 / 할인상품만 / 재고있음만 */}
          <div style={styles.filterRow} className="filter-row" data-testid="product-filters">
            <div style={styles.filterGroup}>
              <label htmlFor="filter-price" style={styles.filterLabel}>
                최대 가격 <strong data-testid="filter-price-value">{effectiveMax.toLocaleString()}원</strong>
              </label>
              <input
                type="range"
                id="filter-price"
                data-testid="filter-price-range"
                min="0"
                max={priceCeiling || 0}
                step="1000"
                value={effectiveMax}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                disabled={!priceCeiling}
                style={styles.priceSlider}
                aria-label="최대 가격 필터"
              />
            </div>
            <label style={styles.filterCheck} htmlFor="filter-onsale">
              <input
                type="checkbox"
                id="filter-onsale"
                data-testid="filter-onsale"
                checked={onSaleOnly}
                onChange={(e) => setOnSaleOnly(e.target.checked)}
              />
              할인 상품만
            </label>
            <label style={styles.filterCheck} htmlFor="filter-instock">
              <input
                type="checkbox"
                id="filter-instock"
                data-testid="filter-instock"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
              />
              재고 있음만
            </label>
            {(maxPrice != null || onSaleOnly || inStockOnly) && (
              <button
                type="button"
                data-testid="filter-reset"
                onClick={() => {
                  setMaxPrice(null);
                  setOnSaleOnly(false);
                  setInStockOnly(false);
                }}
                style={styles.filterReset}
              >
                필터 초기화
              </button>
            )}
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
            <div style={styles.productGrid} className="product-grid products-container" data-testid="product-grid" role="list">
              {sortedProducts.map((product, index) => {
                const isWished = isLoggedIn && wishlistIds.has(Number(product.id));
                const soldOut = product.stock === 0;

                return (
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
                    style={{ ...styles.productImage, cursor: "pointer" }}
                    data-testid={`product-image-${product.id}`}
                    onClick={() => onView?.(product.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onView?.(product.id);
                      }
                    }}
                    aria-label={`${product.name} 상세 보기`}
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
                    {soldOut && (
                      <span
                        className="soldout-badge badge"
                        style={styles.soldoutBadge}
                        data-testid={`soldout-badge-${product.id}`}
                        aria-label={`${product.name} 품절`}
                      >
                        품절
                      </span>
                    )}
                    <button
                      type="button"
                      id={`wishlist-toggle-${product.id}`}
                      name={`wishlist-${product.id}`}
                      className={`wishlist-toggle heart-button ${isWished ? "wished" : ""}`}
                      style={{
                        ...styles.wishlistToggle,
                        ...(isWished ? styles.wishlistToggleActive : {}),
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWishlistToggle(product);
                      }}
                      aria-pressed={isWished}
                      aria-label={
                        isWished
                          ? `${product.name} 위시리스트에서 제거`
                          : `${product.name} 위시리스트에 추가`
                      }
                      data-testid={`wishlist-toggle-${product.id}`}
                    >
                      {isWished ? "♥" : "♡"}
                    </button>
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
                      {/* 홈 카드는 상세 페이지로만 이동 — 옵션(색상/사이즈) 선택은 상세에서 강제되므로
                          카드에서 바로 담기(옵션 미선택 담기)를 없애 데이터 정합성을 맞춘다. */}
                      <button
                        type="button"
                        id={`product-${product.id}-view`}
                        name={`view-${product.id}`}
                        className="btn btn-primary view-btn product-view-button"
                        aria-label={`${product.name} 상품 상세`}
                        onClick={() => onView?.(product.id)}
                        style={styles.viewBtn}
                        data-testid={`view-detail-btn-${product.id}`}
                        data-action="view"
                      >
                        상품 상세
                      </button>
                    </div>
                  </div>
                </article>
                );
              })}
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
    gap: "8px",
    marginLeft: "auto",
    flexWrap: "wrap",
    rowGap: "8px",
    justifyContent: "flex-end",
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
  banner: {
    position: "relative",
    overflow: "hidden",
    background: "linear-gradient(135deg, #1a1a1a 0%, #374151 100%)",
    padding: "60px 24px",
    textAlign: "center",
    transition: "background 0.6s ease",
  },
  bannerContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    maxWidth: "800px",
    margin: "0 auto",
    textDecoration: "none",
    cursor: "pointer",
  },
  bannerCta: {
    display: "inline-flex",
    alignItems: "center",
    marginTop: "8px",
    padding: "10px 22px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#ffffff",
    background: "rgba(255, 255, 255, 0.16)",
    border: "1px solid rgba(255, 255, 255, 0.45)",
    borderRadius: "24px",
  },
  bannerArrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: "44px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    fontSize: "30px",
    lineHeight: 1,
    color: "#ffffff",
    background: "rgba(255, 255, 255, 0.18)",
    border: "none",
    borderRadius: "50%",
    cursor: "pointer",
    zIndex: 2,
    transition: "background 0.2s",
  },
  bannerArrowPrev: {
    left: "16px",
  },
  bannerArrowNext: {
    right: "16px",
  },
  bannerDots: {
    position: "absolute",
    left: "50%",
    bottom: "16px",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "8px",
    zIndex: 2,
  },
  bannerDot: {
    width: "10px",
    height: "10px",
    padding: 0,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255, 255, 255, 0.45)",
    cursor: "pointer",
    transition: "background 0.2s, width 0.2s",
  },
  bannerDotActive: {
    width: "24px",
    borderRadius: "5px",
    background: "#ffffff",
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
  filterRow: {
    maxWidth: "1200px",
    margin: "12px auto 0",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    paddingTop: "12px",
    borderTop: "1px solid #f1f5f9",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: "240px",
  },
  filterLabel: {
    fontSize: "13px",
    color: "#374151",
    whiteSpace: "nowrap",
  },
  priceSlider: {
    flex: 1,
    minWidth: "120px",
    cursor: "pointer",
    accentColor: "#1a1a1a",
  },
  filterCheck: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#374151",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  filterReset: {
    padding: "6px 12px",
    fontSize: "13px",
    color: "#6b7280",
    backgroundColor: "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
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
    gridTemplateColumns: "repeat(3, 1fr)",
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
  soldoutBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    padding: "6px 14px",
    borderRadius: "6px",
    zIndex: 2,
    pointerEvents: "none",
  },
  wishlistToggle: {
    position: "absolute",
    top: "12px",
    right: "12px",
    zIndex: 3,
    width: "36px",
    height: "36px",
    padding: 0,
    borderRadius: "50%",
    border: "1px solid #e5e7eb",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    color: "#6b7280",
    fontSize: "18px",
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "color 0.2s, transform 0.2s, border-color 0.2s",
  },
  wishlistToggleActive: {
    color: "#dc2626",
    borderColor: "#fecaca",
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
    width: "100%",
    padding: "12px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
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
  addBtnDisabled: {
    backgroundColor: "#d1d5db",
    color: "#6b7280",
    cursor: "not-allowed",
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
    gap: "8px",
    gridColumn: "1 / -1",
    padding: "80px 20px",
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
