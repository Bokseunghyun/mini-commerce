"use client";

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
// 상품 카드 컴포넌트
// ============================================
function ProductCard({ product, onView, onAdd }) {
  return (
    <article className="product-card" id={`product-${product.id}`}>
      {/* 이미지 영역 */}
      <a
        href={`/products/${product.id}`}
        className="product-image"
        onClick={(e) => {
          e.preventDefault();
          onView(product.id);
        }}
      >
        <img
          src={product.imageUrl || "/placeholder.svg"}
          alt={product.name}
          loading="lazy"
        />
        {product.discountRate > 0 && (
          <span className="discount-badge">{product.discountRate}%</span>
        )}
      </a>

      {/* 상품 정보 */}
      <div className="product-info">
        <a
          href={`/products/${product.id}`}
          className="product-name"
          onClick={(e) => {
            e.preventDefault();
            onView(product.id);
          }}
        >
          <h3>{product.name}</h3>
        </a>

        <div className="product-price">
          {product.discountRate > 0 && (
            <span className="original-price">
              {product.originalPrice.toLocaleString()}원
            </span>
          )}
          <span className="discounted-price">
            {product.discountedPrice.toLocaleString()}원
          </span>
        </div>

        <div className="product-actions">
          <button
            className="add-to-cart-btn"
            onClick={() => onView(product.id)}
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
    <section id="product-list-page" className="product-grid">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          onView={onView}
          onAdd={onAdd}
        />
      ))}
    </section>
  );
}

// ============================================
// 메인 페이지 컴포넌트
// ============================================
export default function ProductListPage({ products, onView, cart, setCart, setPage }) {
  const addToCart = (product) => {
    setCart((prev) => [...prev, product]);
  };

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #fafafa;
          color: #1a1a1a;
          line-height: 1.5;
        }

        .page-container {
          min-height: 100vh;
          background-color: #fafafa;
        }

        .page-header {
          border-bottom: 1px solid #e5e5e5;
          background-color: #ffffff;
        }

        .header-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px 16px;
        }

        @media (min-width: 640px) {
          .header-content {
            padding: 24px;
          }
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

      
        .go-to-cart-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background-color: #1a1a1a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
          white-space: nowrap;
          position: relative;
        }

        .go-to-cart-btn:hover {
          background-color: #333333;
        }

        .cart-icon-large {
          width: 20px;
          height: 20px;
        }

      
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
          font-weight: 700;
        }

        @media (max-width: 639px) {
          .go-to-cart-btn {
            padding: 10px;
          }
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a1a1a;
        }

        @media (min-width: 640px) {
          .page-title {
            font-size: 1.875rem;
          }
        }

        .page-subtitle {
          margin-top: 8px;
          color: #737373;
        }

        .main-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 32px 16px;
        }

        @media (min-width: 640px) {
          .main-content {
            padding: 32px 24px;
          }
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        @media (min-width: 640px) {
          .product-grid {
            gap: 24px;
          }
        }

        @media (min-width: 1024px) {
          .product-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

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
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .product-card:hover .product-image img {
          transform: scale(1.05);
        }

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

        .product-name {
          text-decoration: none;
          color: inherit;
        }

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

        .product-name:hover h3 {
          color: #737373;
        }

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

        .add-to-cart-btn:hover {
          background-color: #333333;
        }

        .cart-icon {
          width: 16px;
          height: 16px;
        }
      `}</style>

      <main className="page-container">
        <header className="page-header">
          <div className="header-content">
            <div className="header-top">
              <div>
                <h1 className="page-title">베스트 상품</h1>
                <p className="page-subtitle">지금 가장 인기있는 상품을 만나보세요</p>
              </div>

              {}
              <button
                type="button"
                className="go-to-cart-btn"
                onClick={() => setPage("cart")}
                aria-label={`장바구니로 이동 (총 ${cart.length}개)`}
              >
                <ShoppingCartIcon className="cart-icon-large" />
                <span className="cart-badge">{cart.length}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="main-content">
          <ProductGrid products={products} onView={onView} onAdd={addToCart} />
        </div>
      </main>
    </>
  );
}
