"use client";
import { useState } from 'react';

// ============================================
// 가격 포맷 함수
// ============================================
const formatPrice = (price) => {
  return price.toLocaleString("ko-KR");
};

// ============================================
// 장바구니 아이콘 컴포넌트
// ============================================
function ShoppingCartIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

// ============================================
// 검색 아이콘 컴포넌트
// ============================================
function SearchIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

// ============================================
// 로딩 스피너 컴포넌트
// ============================================
function LoadingSpinner() {
  return (
    <div className="loading-container" data-testid="loading-spinner">
      <div className="spinner"></div>
      <p>상품을 불러오는 중...</p>
    </div>
  );
}

// ============================================
// 빈 결과 컴포넌트
// ============================================
function EmptyResults({ searchTerm }) {
  return (
    <div className="empty-results" data-testid="empty-results">
      <p>"{searchTerm}" 검색 결과가 없습니다.</p>
      <p className="empty-subtitle">다른 검색어로 시도해보세요.</p>
    </div>
  );
}

// ============================================
// 상품 카드 컴포넌트
// ============================================
function ProductCard({ product, onView, onAdd }) {
  return (
    <article
      className="product-card"
      id={`product-${product.id}`}
      data-testid={`product-card-${product.id}`}
    >
      <a
        href={`/products/${product.id}`}
        className="product-image"
        onClick={(e) => {
          e.preventDefault();
          onView(product.id);
        }}
        data-testid={`product-image-${product.id}`}
      >
        <img
          src={product.imageUrl || "/placeholder.svg"}
          alt={product.name}
          loading="lazy"
        />
        {product.discountRate > 0 && (
          <span className="discount-badge" data-testid={`discount-badge-${product.id}`}>
            {product.discountRate}%
          </span>
        )}
      </a>

      <div className="product-info">
        <a
          href={`/products/${product.id}`}
          className="product-name"
          onClick={(e) => {
            e.preventDefault();
            onView(product.id);
          }}
          data-testid={`product-name-${product.id}`}
        >
          <h3>{product.name}</h3>
        </a>

        <div className="product-price">
          {product.discountRate > 0 && (
            <span className="original-price" data-testid={`original-price-${product.id}`}>
              {product.originalPrice.toLocaleString()}원
            </span>
          )}
          <span className="discounted-price" data-testid={`price-${product.id}`}>
            {product.discountedPrice.toLocaleString()}원
          </span>
        </div>

        <div className="product-actions">
          <button
            className="add-to-cart-btn"
            onClick={() => onView(product.id)}
            data-testid={`view-detail-btn-${product.id}`}
          >
            상품상세
          </button>

          <button
            className="add-to-cart-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product);
            }}
            aria-label={`${product.name} 장바구니에 담기`}
            data-testid={`add-to-cart-btn-${product.id}`}
          >
            <ShoppingCartIcon className="cart-icon" />
            장바구니 담기
          </button>
        </div>
      </div>
    </article>
  );
}

// ============================================
// 상품 그리드 컴포넌트
// ============================================
function ProductGrid({ products, onView, onAdd }) {
  return (
    <section id="product-list-page" className="product-grid" data-testid="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onView={onView} onAdd={onAdd} />
      ))}
    </section>
  );
}

// ============================================
// 메인 페이지 컴포넌트
// ============================================
export default function ProductListPage({
  products,
  onView,
  cart,
  cartCount,
  setCart,
  setPage,
  onAddToCart,
  isLoading = false // 로딩 상태 prop 추가
}) {
  // 검색 및 정렬 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('default'); // default, price-asc, price-desc, name
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const addToCart = (product) => {
    if (onAddToCart) onAddToCart(product, 1);
  };

  // API 검색 함수
  const performSearch = async (term, sort) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      params.append('q', term.trim());
      if (sort && sort !== 'default') {
        params.append('sort', sort);
      }

      const res = await fetch(`${API_BASE}/api/search?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setSearchResults(data.products || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색어 변경 시 API 호출
  const handleSearchChange = (term) => {
    setSearchTerm(term);
    if (term.trim()) {
      performSearch(term, sortBy);
    } else {
      setSearchResults([]);
    }
  };

  // 정렬 변경 시 API 재호출
  const handleSortChange = (sort) => {
    setSortBy(sort);
    if (searchTerm.trim()) {
      performSearch(searchTerm, sort);
    }
  };

  // 표시할 상품 결정: 검색 중이거나 검색어가 있으면 검색 결과, 아니면 전체 상품
  const displayProducts = searchTerm.trim() ? searchResults : products;

  // 클라이언트 정렬 (검색 안 했을 때만)
  const sortedProducts = !searchTerm.trim() ? [...displayProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name':
        return a.name.localeCompare(b.name, 'ko-KR');
      case 'discount':
        return b.discountRate - a.discountRate;
      default:
        return 0;
    }
  }) : displayProducts;

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #fafafa;
          color: #1a1a1a;
          line-height: 1.5;
        }

        .page-container { min-height: 100vh; background-color: #fafafa; }

        .page-header { border-bottom: 1px solid #e5e5e5; background-color: #ffffff; }

        .header-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px 16px;
        }

        @media (min-width: 640px) {
          .header-content { padding: 24px; }
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .go-to-cart-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background-color: #1a1a1a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease;
          white-space: nowrap;
          position: relative;
        }

        .go-to-cart-btn:hover { background-color: #333333; }

        .cart-icon-large { width: 20px; height: 20px; }

        .cart-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: #dc2626;
          color: #fff;
          font-size: 12px;
          line-height: 20px;
          text-align: center;
          font-weight: 800;
        }

        .page-title { font-size: 1.5rem; font-weight: 700; color: #1a1a1a; }
        @media (min-width: 640px) { .page-title { font-size: 1.875rem; } }

        .page-subtitle { margin-top: 8px; color: #737373; }

        /* 검색 및 필터 영역 */
        .search-filter-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px 16px 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (min-width: 640px) {
          .search-filter-container {
            padding: 24px 24px 0;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
          }
        }

        .search-box {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #a3a3a3;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px 10px 40px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #1a1a1a;
          box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.1);
        }

        .sort-container {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .sort-label {
          font-size: 0.875rem;
          color: #737373;
          white-space: nowrap;
        }

        .sort-select {
          padding: 8px 12px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 0.875rem;
          background-color: #ffffff;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .sort-select:focus {
          outline: none;
          border-color: #1a1a1a;
        }

        .results-info {
          max-width: 1280px;
          margin: 0 auto;
          padding: 16px 16px 0;
          font-size: 0.875rem;
          color: #737373;
        }

        @media (min-width: 640px) {
          .results-info { padding: 16px 24px 0; }
        }

        .main-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px 16px;
        }
        @media (min-width: 640px) { .main-content { padding: 32px 24px; } }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 640px) { .product-grid { gap: 24px; } }
        @media (min-width: 1024px) { .product-grid { grid-template-columns: repeat(4, 1fr); } }

        .product-card {
          position: relative;
          display: flex;
          flex-direction: column;
          border-radius: 8px;
          border: 1px solid #e5e5e5;
          background-color: #ffffff;
          transition: box-shadow 0.2s ease;
        }
        .product-card:hover {
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .product-image {
          position: relative;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 8px 8px 0 0;
          display: block;
          text-decoration: none;
          min-height: 200px;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-image img { transform: scale(1.05); }

        .discount-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background-color: #dc2626;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .product-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 12px;
          padding: 16px;
        }

        .product-name { text-decoration: none; color: inherit; }

        .product-name h3 {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1a1a1a;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 0.2s ease;
        }

        .product-name:hover h3 { color: #737373; }

        .product-price {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: auto;
        }

        .original-price {
          font-size: 0.75rem;
          color: #a3a3a3;
          text-decoration: line-through;
        }

        .discounted-price {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1a1a1a;
        }

        .add-to-cart-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          margin-top: 8px;
          padding: 10px 16px;
          background-color: #1a1a1a;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .add-to-cart-btn:hover { background-color: #333333; }

        .cart-icon { width: 16px; height: 16px; }

        /* 로딩 스피너 */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e5e5;
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-container p {
          color: #737373;
          font-size: 0.875rem;
        }

        /* 빈 결과 */
        .empty-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 8px;
        }

        .empty-results p {
          font-size: 1rem;
          color: #1a1a1a;
        }

        .empty-subtitle {
          font-size: 0.875rem;
          color: #737373;
        }
      `}</style>

      <main className="page-container">
        <header className="page-header">
          <div className="header-content">
            <div className="header-top">
              <div>
                <h1 className="page-title">베스트 상품</h1>
                <p className="page-subtitle">
                  지금 가장 인기있는 상품을 만나보세요
                </p>
              </div>

              <button
                type="button"
                className="go-to-cart-btn"
                onClick={() => setPage("cart")}
                aria-label={`장바구니로 이동 (총 ${cartCount}개)`}
                data-testid="cart-button"
              >
                <ShoppingCartIcon className="cart-icon-large" />
                {cartCount > 0 && <span className="cart-badge" data-testid="cart-badge">{cartCount}</span>}
                <span>장바구니</span>
              </button>
            </div>
          </div>
        </header>

        {/* 검색 및 필터 영역 */}
        <div className="search-filter-container">
          <div className="search-box">
            <SearchIcon className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="상품명 검색..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              data-testid="search-input"
            />
          </div>

          <div className="sort-container">
            <label className="sort-label" htmlFor="sort-select">정렬:</label>
            <select
              id="sort-select"
              className="sort-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              data-testid="sort-select"
            >
              <option value="default">기본순</option>
              <option value="price-asc">낮은 가격순</option>
              <option value="price-desc">높은 가격순</option>
              <option value="name">이름순</option>
              <option value="discount">할인율순</option>
            </select>
          </div>
        </div>

        {/* 검색 결과 정보 */}
        {searchTerm && (
          <div className="results-info" data-testid="results-info">
            총 {sortedProducts.length}개의 상품을 찾았습니다.
          </div>
        )}

        <div className="main-content">
          {(isLoading || isSearching) ? (
            <LoadingSpinner />
          ) : sortedProducts.length === 0 ? (
            <EmptyResults searchTerm={searchTerm} />
          ) : (
            <ProductGrid products={sortedProducts} onView={onView} onAdd={addToCart} />
          )}
        </div>
      </main>
    </>
  );
}
