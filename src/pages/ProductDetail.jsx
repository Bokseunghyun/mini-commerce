"use client";

import React, { useMemo, useState, useEffect } from "react";

// ============================================
// 가격 포맷
// ============================================
const formatPrice = (price) => (Number(price) || 0).toLocaleString("ko-KR");

// ============================================
// 아이콘
// ============================================
function ShoppingCartIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}
function MinusIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
    </svg>
  );
}
function PlusIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
function ChevronLeftIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

// ============================================
// 상품 상세
// props:
// - product: selectedProduct
// - cartCount: 장바구니 총 수량(뱃지용)
// - onBack(): 목록으로
// - onGoCart(): 장바구니로
// - onAddToCart(qty): "장바구니 담기" (이동 X)
// - onBuyNow(qty): "바로구매" (order 동일)
// ============================================
export default function ProductDetailPage({
  product,
  cartCount = 0,
  onBack,
  onGoCart,
  onAddToCart,
  onBuyNow,
}) {
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // 리뷰 로드
  useEffect(() => {
    if (product?.id) {
      setIsLoadingReviews(true);
      fetch(`${API_BASE}/api/main?action=reviews&productId=${product.id}`)
        .then(res => res.json())
        .then(data => {
          setReviews(Array.isArray(data) ? data : []);
        })
        .catch(() => setReviews([]))
        .finally(() => setIsLoadingReviews(false));
    }
  }, [product?.id]);

  // 리뷰 작성
  const handleSubmitReview = async () => {
    if (!newReview.comment.trim()) {
      alert('리뷰 내용을 입력해주세요');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('로그인이 필요합니다');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE}/api/main?action=reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: product.id,
          rating: newReview.rating,
          comment: newReview.comment,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || '리뷰 작성 실패');
        return;
      }

      setReviews([data, ...reviews]);
      setNewReview({ rating: 5, comment: '' });
      alert('리뷰가 작성되었습니다');
    } catch (e) {
      alert('리뷰 작성 중 오류 발생');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const safeProduct = product || {};
  const unitPrice = useMemo(() => {
    // discountedPrice 우선, 없으면 price, 없으면 0
    const n = Number(safeProduct.discountedPrice ?? safeProduct.price ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [safeProduct]);

  const totalPrice = unitPrice * (Number(quantity) || 1);

  const handleQuantityDecrease = () => {
    setQuantity((q) => Math.max(1, (Number(q) || 1) - 1));
  };
  const handleQuantityIncrease = () => {
    setQuantity((q) => Math.min(99, (Number(q) || 1) + 1));
  };

  const handleAddToCart = () => {
    const qty = Math.max(1, Number(quantity) || 1);
    onAddToCart?.(qty); // 여기서 페이지 이동 안함
  };

  const handleBuyNow = () => {
    const qty = Math.max(1, Number(quantity) || 1);
    onBuyNow?.(qty);
  };

  if (!product) return null;

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
          gap: 12px;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          background: none;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #1a1a1a;
          cursor: pointer;
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

        .main-content { max-width: 1280px; margin: 0 auto; padding: 24px 16px; }
        @media (min-width: 768px) { .main-content { padding: 40px 24px; } }

        .product-layout { display: flex; flex-direction: column; gap: 32px; }
        @media (min-width: 1024px) { .product-layout { flex-direction: row; gap: 48px; } }

        .image-section { flex: 1; }
        .image-wrapper {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          overflow: hidden;
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
        }
        .product-image { width: 100%; height: 100%; object-fit: cover; }

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

        .info-section { flex: 1; display: flex; flex-direction: column; gap: 24px; }
        .product-title { font-size: 1.5rem; font-weight: 700; line-height: 1.4; }
        @media (min-width: 768px) { .product-title { font-size: 1.75rem; } }

        .product-description { font-size: 1rem; color: #737373; }

        .price-section {
          display: flex; flex-direction: column; gap: 8px;
          padding: 20px; background-color: #ffffff;
          border-radius: 12px; border: 1px solid #e5e5e5;
        }
        .price-row { display: flex; align-items: center; gap: 12px; }
        .discount-rate { font-size: 1.5rem; font-weight: 700; color: #dc2626; }
        .discounted-price { font-size: 1.75rem; font-weight: 700; color: #1a1a1a; }
        .original-price { font-size: 1rem; color: #a3a3a3; text-decoration: line-through; }
        .savings { font-size: 0.875rem; color: #dc2626; font-weight: 500; }

        .quantity-section {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; background-color: #ffffff;
          border: 1px solid #e5e5e5; border-radius: 12px;
        }
        .quantity-label { font-size: 0.875rem; font-weight: 600; }
        .quantity-controls { display: flex; align-items: center; gap: 12px; }
        .quantity-btn {
          display: flex; align-items: center; justify-content: center;
          width: 40px; height: 40px;
          background-color: #f5f5f5;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          cursor: pointer;
        }
        .quantity-btn:hover:not(:disabled) { background-color: #e5e5e5; }
        .quantity-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .quantity-btn-icon { width: 18px; height: 18px; }
        .quantity-value { font-size: 1.125rem; font-weight: 600; min-width: 40px; text-align: center; }

        .total-section {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; background-color: #f5f5f5;
          border: 1px solid #e5e5e5; border-radius: 12px;
        }
        .total-label { font-size: 0.875rem; font-weight: 500; color: #525252; }
        .total-price { font-size: 1.5rem; font-weight: 700; color: #1a1a1a; }

        .button-section { display: flex; flex-direction: column; gap: 12px; }
        @media (min-width: 640px) { .button-section { flex-direction: row; } }

        
        .btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          flex: 1; padding: 16px 24px;
          font-size: 1rem; font-weight: 600;
          border-radius: 12px; cursor: pointer;
          transition: all 0.2s ease; border: none;
        }
        .btn-cart { background-color: #ffffff; color: #1a1a1a; border: 2px solid #1a1a1a; }
        .btn-cart:hover { background-color: #f5f5f5; }
        .btn-buy { background-color: #1a1a1a; color: #ffffff; }
        .btn-buy:hover { background-color: #333333; }
        .btn-icon { width: 20px; height: 20px; }

        /* 리뷰 섹션 */
        .reviews-section {
          padding: 32px 0;
          border-top: 8px solid #f5f5f5;
        }
        .reviews-header {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .review-form {
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .rating-input {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        .star-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .star-btn:hover { transform: scale(1.2); }
        .review-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 14px;
          resize: vertical;
        }
        .submit-review-btn {
          margin-top: 12px;
          padding: 10px 20px;
          background-color: #1a1a1a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-review-btn:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        .review-item {
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .review-author {
          font-weight: 600;
          font-size: 14px;
        }
        .review-date {
          font-size: 12px;
          color: #737373;
        }
        .review-rating {
          color: #fbbf24;
          font-size: 14px;
        }
        .review-comment {
          font-size: 14px;
          color: #525252;
          line-height: 1.6;
        }
        .no-reviews {
          text-align: center;
          padding: 40px;
          color: #737373;
        }
      `}</style>

      <div className="page-container" data-testid="product-detail">
        <header className="page-header">
          <nav className="header-content">
            <button type="button" className="back-button" onClick={onBack} aria-label="상품 목록으로 돌아가기">
              <ChevronLeftIcon className="back-icon" />
              <span>목록</span>
            </button>

            {}
            <button
              type="button"
              className="cart-button"
              aria-label={`장바구니로 이동 (총 ${cartCount}개)`}
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
                <img src={safeProduct.imageUrl || "/placeholder.svg"} alt={safeProduct.name} className="product-image" />
                {Number(safeProduct.discountRate) > 0 && (
                  <span className="discount-badge">{safeProduct.discountRate}% OFF</span>
                )}
              </div>
            </section>

            <section className="info-section" aria-label="상품 정보">
              <h1 className="product-title" data-testid="product-title">{safeProduct.name}</h1>
              {safeProduct.description && <p className="product-description">{safeProduct.description}</p>}

              <div className="price-section" data-testid="product-price" aria-label="가격 정보">
                <div className="price-row">
                  {Number(safeProduct.discountRate) > 0 && <span className="discount-rate">{safeProduct.discountRate}%</span>}
                  <span className="discounted-price">{formatPrice(unitPrice)}원</span>
                </div>

                {Number(safeProduct.discountRate) > 0 && safeProduct.originalPrice != null && (
                  <div className="price-row">
                    <span className="original-price">{formatPrice(safeProduct.originalPrice)}원</span>
                    <span className="savings">{formatPrice((Number(safeProduct.originalPrice) || 0) - unitPrice)}원 할인</span>
                  </div>
                )}
              </div>

              <div className="quantity-section" role="group" aria-label="수량 선택">
                <span className="quantity-label">수량</span>
                <div className="quantity-controls">
                  <button className="quantity-btn" onClick={handleQuantityDecrease} disabled={quantity <= 1} aria-label="수량 감소">
                    <MinusIcon className="quantity-btn-icon" />
                  </button>
                  <span className="quantity-value" aria-live="polite" aria-atomic="true">{quantity}</span>
                  <button className="quantity-btn" onClick={handleQuantityIncrease} disabled={quantity >= 99} aria-label="수량 증가">
                    <PlusIcon className="quantity-btn-icon" />
                  </button>
                </div>
              </div>

              <div className="total-section">
                <span className="total-label">총 상품금액</span>
                <span className="total-price">{formatPrice(totalPrice)}원</span>
              </div>

              <div className="button-section">
                {}
                <button className="btn btn-cart" onClick={handleAddToCart} aria-label="장바구니에 담기">
                  <ShoppingCartIcon className="btn-icon" />
                  장바구니 담기
                </button>

                {}
                <button className="btn btn-buy" onClick={handleBuyNow} aria-label="바로 구매하기">
                  바로 구매
                </button>
              </div>
            </section>

            {/* 리뷰 섹션 */}
            <section className="reviews-section" data-testid="reviews-section">
              <h2 className="reviews-header">상품 리뷰 ({reviews.length})</h2>

              {/* 리뷰 작성 폼 */}
              <div className="review-form" data-testid="review-form">
                <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>리뷰 작성하기</h3>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="star-btn"
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      data-testid={`star-${star}`}
                    >
                      {star <= newReview.rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
                <textarea
                  className="review-textarea"
                  placeholder="이 상품에 대한 솔직한 리뷰를 남겨주세요 (최대 500자)"
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                  maxLength={500}
                  data-testid="review-comment-input"
                />
                <button
                  type="button"
                  className="submit-review-btn"
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview}
                  data-testid="submit-review-btn"
                >
                  {isSubmittingReview ? '작성 중...' : '리뷰 등록'}
                </button>
              </div>

              {/* 리뷰 목록 */}
              {isLoadingReviews ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  리뷰를 불러오는 중...
                </div>
              ) : reviews.length === 0 ? (
                <div className="no-reviews" data-testid="no-reviews">
                  아직 작성된 리뷰가 없습니다. 첫 번째 리뷰를 작성해보세요!
                </div>
              ) : (
                <div data-testid="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-item" data-testid={`review-${review.id}`}>
                      <div className="review-header">
                        <div>
                          <span className="review-author">{review.username}</span>
                          <span className="review-rating" style={{ marginLeft: '8px' }}>
                            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                          </span>
                        </div>
                        <span className="review-date">
                          {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="review-comment">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </article>
        </main>
      </div>
    </>
  );
}
