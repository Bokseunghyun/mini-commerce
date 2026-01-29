"use client";

import React, { useMemo, useState } from "react";

// ============================================
// 가격 포맷 함수
// ============================================
const formatPrice = (price) => {
  const n = Number(price) || 0;
  return n.toLocaleString("ko-KR");
};

// ============================================
// 아이콘 컴포넌트들
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

function MinusIcon({ className }) {
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
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon({ className }) {
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ChevronLeftIcon({ className }) {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function CheckIcon({ className }) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// ============================================
// 상품 상세 페이지
// ============================================
export default function ProductDetailPage({
  product = null,
  cartItems = [],
  onAddToCart,
  onBuyNow,
  onBack,
  onGoCart,
}) {
  const [quantity, setQuantity] = useState(1);

  const cartCount = useMemo(() => {
    if (!Array.isArray(cartItems)) return 0;
    // "수량 합"으로 카운트
    return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  }, [cartItems]);

  const safeProduct = useMemo(() => {
    if (!product) return null;
    const price =
      Number(product.price) ||
      Number(product.discountedPrice) ||
      Number(product.originalPrice) ||
      0;

    return {
      ...product,
      price,
      discountedPrice: Number(product.discountedPrice) || price,
      originalPrice: Number(product.originalPrice) || price,
      discountRate: Number(product.discountRate) || 0,
      description: product.description || "",
      details: Array.isArray(product.details) ? product.details : [],
    };
  }, [product]);

  const handleQuantityDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleQuantityIncrease = () => {
    if (quantity < 99) setQuantity(quantity + 1);
  };

  if (!safeProduct) {
    return (
      <div style={{ padding: 24 }}>
        <p>상품 정보가 없습니다</p>
        <button onClick={onBack}>목록으로</button>
      </div>
    );
  }

  const totalPrice = (Number(safeProduct.discountedPrice) || safeProduct.price) * quantity;

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background-color: #fafafa;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .page-container { min-height: 100vh; background-color: #fafafa; }
        .page-header {
          position: sticky;
          top: 0;
          z-index: 100;
          border-bottom: 1px solid #e5e5e5;
          background-color: #ffffff;
        }
        .header-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .back-button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: none;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #1a1a1a;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.2s ease;
        }
        .back-button:hover { background-color: #f5f5f5; }
        .back-icon { width: 16px; height: 16px; }

        
        .cart-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background-color: #1a1a1a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .cart-button:hover { background-color: #333333; }
        .cart-icon { width: 18px; height: 18px; }

        .cart-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          background: #dc2626;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          border: 2px solid #fff;
        }

        .main-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 24px 16px;
        }
        @media (min-width: 768px) {
          .main-content { padding: 40px 24px; }
        }
        .product-layout {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }
        @media (min-width: 1024px) {
          .product-layout { flex-direction: row; gap: 48px; }
        }
        .image-section { flex: 1; }
        .image-wrapper {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          overflow: hidden;
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .discount-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          background-color: #dc2626;
          color: #ffffff;
          font-size: 0.875rem;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 8px;
        }
        .info-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .product-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a1a1a;
          line-height: 1.4;
        }
        @media (min-width: 768px) {
          .product-title { font-size: 1.75rem; }
        }
        .product-description {
          font-size: 1rem;
          color: #737373;
          line-height: 1.6;
        }
        .price-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e5e5;
        }
        .price-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .discount-rate {
          font-size: 1.5rem;
          font-weight: 700;
          color: #dc2626;
        }
        .discounted-price {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1a1a1a;
        }
        .original-price {
          font-size: 1rem;
          color: #a3a3a3;
          text-decoration: line-through;
        }
        .savings {
          font-size: 0.875rem;
          color: #dc2626;
          font-weight: 500;
        }
        .quantity-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
        }
        .quantity-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1a1a1a;
        }
        .quantity-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .quantity-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background-color: #f5f5f5;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .quantity-btn:hover:not(:disabled) { background-color: #e5e5e5; }
        .quantity-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .quantity-btn-icon { width: 18px; height: 18px; color: #1a1a1a; }
        .quantity-value {
          font-size: 1.125rem;
          font-weight: 600;
          min-width: 40px;
          text-align: center;
        }
        .total-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background-color: #f5f5f5;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
        }
        .total-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #525252;
        }
        .total-price {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1a1a1a;
        }
        .button-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .button-section { flex-direction: row; }
        }
        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex: 1;
          padding: 16px 24px;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .btn-cart {
          background-color: #ffffff;
          color: #1a1a1a;
          border: 2px solid #1a1a1a;
        }
        .btn-cart:hover { background-color: #f5f5f5; }
        .btn-buy {
          background-color: #1a1a1a;
          color: #ffffff;
        }
        .btn-buy:hover { background-color: #333333; }
        .btn-icon { width: 20px; height: 20px; }
        .details-section {
          margin-top: 48px;
          padding-top: 48px;
          border-top: 1px solid #e5e5e5;
        }
        .details-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 24px;
        }
        .details-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          list-style: none;
        }
        .details-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
        }
        .check-icon {
          width: 20px;
          height: 20px;
          color: #16a34a;
          flex-shrink: 0;
          margin-top: 2px;
        }
        .details-text {
          font-size: 0.9375rem;
          color: #525252;
          line-height: 1.5;
        }
      `}</style>

      <div className="page-container" data-testid="product-detail">
        <header className="page-header">
          <nav className="header-content">
            <button
              type="button"
              className="back-button"
              aria-label="상품 목록으로 돌아가기"
              onClick={onBack}
            >
              <ChevronLeftIcon className="back-icon" />
              <span>목록</span>
            </button>

            <button
              type="button"
              className="cart-button"
              aria-label="장바구니로 이동"
              onClick={onGoCart}
            >
              <ShoppingCartIcon className="cart-icon" />
              <span>장바구니</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </nav>
        </header>

        <main className="main-content">
          <article className="product-layout">
            <section className="image-section" aria-label="상품 이미지">
              <div className="image-wrapper">
                <img
                  src={safeProduct.imageUrl || "/placeholder.svg"}
                  alt={safeProduct.name}
                  className="product-image"
                />
                {safeProduct.discountRate > 0 && (
                  <span className="discount-badge">{safeProduct.discountRate}% OFF</span>
                )}
              </div>
            </section>

            <section className="info-section" aria-label="상품 정보">
              <h1 className="product-title" data-testid="product-title">
                {safeProduct.name}
              </h1>
              <p className="product-description">{safeProduct.description}</p>

              <div className="price-section" data-testid="product-price" aria-label="가격 정보">
                <div className="price-row">
                  {safeProduct.discountRate > 0 && (
                    <span className="discount-rate">{safeProduct.discountRate}%</span>
                  )}
                  <span className="discounted-price">
                    {formatPrice(safeProduct.discountedPrice)}원
                  </span>
                </div>
                {safeProduct.discountRate > 0 && (
                  <div className="price-row">
                    <span className="original-price">{formatPrice(safeProduct.originalPrice)}원</span>
                    <span className="savings">
                      {formatPrice(safeProduct.originalPrice - safeProduct.discountedPrice)}원 할인
                    </span>
                  </div>
                )}
              </div>

              <div className="quantity-section" role="group" aria-label="수량 선택">
                <span className="quantity-label">수량</span>
                <div className="quantity-controls">
                  <button
                    className="quantity-btn"
                    onClick={handleQuantityDecrease}
                    disabled={quantity <= 1}
                    data-testid="quantity-decrease"
                    aria-label="수량 감소"
                    type="button"
                  >
                    <MinusIcon className="quantity-btn-icon" />
                  </button>
                  <span className="quantity-value" aria-live="polite" aria-atomic="true">
                    {quantity}
                  </span>
                  <button
                    className="quantity-btn"
                    onClick={handleQuantityIncrease}
                    disabled={quantity >= 99}
                    data-testid="quantity-increase"
                    aria-label="수량 증가"
                    type="button"
                  >
                    <PlusIcon className="quantity-btn-icon" />
                  </button>
                </div>
              </div>

              <div className="total-section">
                <span className="total-label">총 상품금액</span>
                <span className="total-price">{formatPrice(totalPrice)}원</span>
              </div>

              <div className="button-section">
                <button
                  className="btn btn-cart"
                  onClick={() => onAddToCart?.(safeProduct, quantity)}
                  data-testid="add-to-cart-button"
                  aria-label="장바구니에 담기"
                  type="button"
                >
                  <ShoppingCartIcon className="btn-icon" />
                  장바구니 담기
                </button>

                <button
                  className="btn btn-buy"
                  onClick={() => onBuyNow?.(safeProduct, quantity)}
                  data-testid="buy-now-button"
                  aria-label="바로 구매하기"
                  type="button"
                >
                  바로 구매
                </button>
              </div>
            </section>
          </article>

          <section className="details-section" aria-label="상품 상세 정보">
            <h2 className="details-title">상품 상세 정보</h2>
            <ul className="details-list">
              {safeProduct.details.map((detail, index) => (
                <li key={index} className="details-item">
                  <CheckIcon className="check-icon" />
                  <span className="details-text">{detail}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </>
  );
}
