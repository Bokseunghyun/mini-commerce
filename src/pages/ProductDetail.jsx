"use client";

import React, { useMemo, useState } from "react";

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
  isLoggedIn = false,
}) {
  const [quantity, setQuantity] = useState(1);
  const [stockInfo, setStockInfo] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  // 리뷰 작성 상태
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  
  // 리뷰 수정 상태
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewComment, setEditReviewComment] = useState('');

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // 재고 정보 조회
  React.useEffect(() => {
    if (!product?.id) return;
    
    setLoadingStock(true);
    fetch(`${API_BASE}/api/inventory?productId=${product.id}`)
      .then(res => res.json())
      .then(data => {
        setStockInfo(data);
      })
      .catch(err => {
        console.error('재고 조회 실패:', err);
      })
      .finally(() => {
        setLoadingStock(false);
      });
  }, [product?.id, API_BASE]);

  // 리뷰 목록 조회
  React.useEffect(() => {
    if (!product?.id) return;
    
    setLoadingReviews(true);
    fetch(`${API_BASE}/api/reviews?productId=${product.id}`)
      .then(res => res.json())
      .then(data => {
        setReviews(data.reviews || []);
      })
      .catch(err => {
        console.error('리뷰 조회 실패:', err);
      })
      .finally(() => {
        setLoadingReviews(false);
      });
  }, [product?.id, API_BASE]);

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

  // 리뷰 목록 새로고침
  const refreshReviews = async () => {
    if (!product?.id) return;
    
    setLoadingReviews(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews?productId=${product.id}`);
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (err) {
      console.error('리뷰 조회 실패:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // 리뷰 작성
  const handleSubmitReview = async () => {
    if (!isLoggedIn) {
      alert('로그인이 필요합니다.');
      return;
    }

    if (newReviewComment.trim().length < 10) {
      alert('리뷰는 최소 10자 이상 작성해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          productId: product.id,
          rating: newReviewRating,
          comment: newReviewComment.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`리뷰 작성 실패\n상태 코드: ${res.status}\n메시지: ${data.message || '알 수 없는 오류'}`);
        return;
      }

      alert('리뷰가 작성되었습니다.');
      setIsWritingReview(false);
      setNewReviewRating(5);
      setNewReviewComment('');
      await refreshReviews();
    } catch (err) {
      alert('리뷰 작성 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 리뷰 수정 시작
  const handleStartEdit = (review) => {
    setEditingReviewId(review.id);
    setEditReviewRating(review.rating);
    setEditReviewComment(review.comment);
  };

  // 리뷰 수정 제출
  const handleUpdateReview = async () => {
    if (editReviewComment.trim().length < 10) {
      alert('리뷰는 최소 10자 이상 작성해주세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          id: editingReviewId,
          rating: editReviewRating,
          comment: editReviewComment.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`리뷰 수정 실패\n상태 코드: ${res.status}\n메시지: ${data.message || '알 수 없는 오류'}`);
        return;
      }

      alert('리뷰가 수정되었습니다.');
      setEditingReviewId(null);
      setEditReviewRating(5);
      setEditReviewComment('');
      await refreshReviews();
    } catch (err) {
      alert('리뷰 수정 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 리뷰 삭제
  const handleDeleteReview = async (reviewId) => {
    if (!confirm('이 리뷰를 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ id: reviewId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`리뷰 삭제 실패\n상태 코드: ${res.status}\n메시지: ${data.message || '알 수 없는 오류'}`);
        return;
      }

      alert('리뷰가 삭제되었습니다.');
      await refreshReviews();
    } catch (err) {
      alert('리뷰 삭제 중 오류가 발생했습니다: ' + err.message);
    }
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
          padding: 12px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 350px;
          box-sizing: border-box;
        }
        @media (min-width: 768px) {
          .header-content { padding: 16px; gap: 12px; width: 100%; }
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 10px;
          background: none;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          font-size: 0.8125rem;
          color: #1a1a1a;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        @media (min-width: 768px) {
          .back-button { padding: 8px 12px; font-size: 0.875rem; }
        }
        .back-button:hover { background-color: #f5f5f5; }
        .back-icon { width: 16px; height: 16px; }


        .cart-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background-color: #1a1a1a;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        @media (min-width: 768px) {
          .cart-button { padding: 10px 16px; gap: 8px; font-size: 0.875rem; }
        }
        .cart-button:hover { background-color: #333333; }
        .cart-icon { width: 16px; height: 16px; }
        @media (min-width: 768px) {
          .cart-icon { width: 18px; height: 18px; }
        }
        .cart-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #dc2626;
          color: #fff;
          font-size: 11px;
          line-height: 18px;
          text-align: center;
          font-weight: 700;
        }
        @media (min-width: 768px) {
          .cart-badge { min-width: 20px; height: 20px; padding: 0 6px; font-size: 12px; line-height: 20px; }
        }

        .main-content { max-width: 1280px; margin: 0 auto; padding: 16px 12px; width: 350px; box-sizing: border-box; }
        @media (min-width: 768px) { .main-content { padding: 40px 24px; width: 100%; } }

        .product-layout { display: flex; flex-direction: column; gap: 24px; }
        @media (min-width: 1024px) { .product-layout { flex-direction: row; gap: 48px; } }

        .image-section { flex: 1; }
        .image-wrapper {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          overflow: hidden;
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          min-height: 300px;
        }
        @media (min-width: 768px) {
          .image-wrapper {
            min-height: 400px;
          }
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

        .info-section { flex: 1; display: flex; flex-direction: column; gap: 20px; }
        @media (min-width: 768px) { .info-section { gap: 24px; } }
        .product-title { font-size: 1.25rem; font-weight: 700; line-height: 1.4; }
        @media (min-width: 768px) { .product-title { font-size: 1.75rem; } }

        .product-description { font-size: 1rem; color: #737373; }

        .price-section {
          display: flex; flex-direction: column; gap: 8px;
          padding: 16px; background-color: #ffffff;
          border-radius: 12px; border: 1px solid #e5e5e5;
        }
        @media (min-width: 768px) {
          .price-section { padding: 20px; }
        }
        .price-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        @media (min-width: 768px) { .price-row { gap: 12px; } }
        .discount-rate { font-size: 1.25rem; font-weight: 700; color: #dc2626; }
        @media (min-width: 768px) { .discount-rate { font-size: 1.5rem; } }
        .discounted-price { font-size: 1.5rem; font-weight: 700; color: #1a1a1a; }
        @media (min-width: 768px) { .discounted-price { font-size: 1.75rem; } }
        .original-price { font-size: 0.875rem; color: #a3a3a3; text-decoration: line-through; }
        @media (min-width: 768px) { .original-price { font-size: 1rem; } }
        .savings { font-size: 0.8125rem; color: #dc2626; font-weight: 500; }
        @media (min-width: 768px) { .savings { font-size: 0.875rem; } }

        .quantity-section {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; background-color: #ffffff;
          border: 1px solid #e5e5e5; border-radius: 12px;
        }
        @media (min-width: 768px) {
          .quantity-section { padding: 16px 20px; }
        }
        .quantity-label { font-size: 0.8125rem; font-weight: 600; }
        @media (min-width: 768px) { .quantity-label { font-size: 0.875rem; } }
        .quantity-controls { display: flex; align-items: center; gap: 10px; }
        @media (min-width: 768px) { .quantity-controls { gap: 12px; } }
        .quantity-btn {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px;
          background-color: #f5f5f5;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          cursor: pointer;
        }
        @media (min-width: 768px) {
          .quantity-btn { width: 40px; height: 40px; }
        }
        .quantity-btn:hover:not(:disabled) { background-color: #e5e5e5; }
        .quantity-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .quantity-btn-icon { width: 16px; height: 16px; }
        @media (min-width: 768px) { .quantity-btn-icon { width: 18px; height: 18px; } }
        .quantity-value { font-size: 1rem; font-weight: 600; min-width: 36px; text-align: center; }
        @media (min-width: 768px) { .quantity-value { font-size: 1.125rem; min-width: 40px; } }

        .total-section {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; background-color: #f5f5f5;
          border: 1px solid #e5e5e5; border-radius: 12px;
        }
        @media (min-width: 768px) {
          .total-section { padding: 16px 20px; }
        }
        .total-label { font-size: 0.8125rem; font-weight: 500; color: #525252; }
        @media (min-width: 768px) { .total-label { font-size: 0.875rem; } }
        .total-price { font-size: 1.25rem; font-weight: 700; color: #1a1a1a; }
        @media (min-width: 768px) { .total-price { font-size: 1.5rem; } }

        .button-section { display: flex; flex-direction: column; gap: 12px; }
        @media (min-width: 640px) { .button-section { flex-direction: row; } }


        .btn {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          flex: 1; padding: 14px 20px;
          font-size: 0.9375rem; font-weight: 600;
          border-radius: 12px; cursor: pointer;
          transition: all 0.2s ease; border: none;
        }
        @media (min-width: 768px) {
          .btn { padding: 16px 24px; font-size: 1rem; gap: 8px; }
        }
        .btn-cart { background-color: #ffffff; color: #1a1a1a; border: 2px solid #1a1a1a; }
        .btn-cart:hover { background-color: #f5f5f5; }
        .btn-buy { background-color: #1a1a1a; color: #ffffff; }
        .btn-buy:hover { background-color: #333333; }
        .btn-icon { width: 18px; height: 18px; }
        @media (min-width: 768px) { .btn-icon { width: 20px; height: 20px; } }
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
                {/* 장바구니 담기 */}
                <button className="btn btn-cart" onClick={handleAddToCart} aria-label="장바구니에 담기">
                  <ShoppingCartIcon className="btn-icon" />
                  장바구니 담기
                </button>

                {/* 바로구매 */}
                <button className="btn btn-buy" onClick={handleBuyNow} aria-label="바로 구매하기">
                  바로 구매
                </button>
              </div>

              {/* 재고 정보 섹션 */}
              <div id="stock-info" className="stock-info-section" style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>재고 정보</h3>
                {loadingStock ? (
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>재고 정보 조회 중...</p>
                ) : stockInfo ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '13px', color: '#374151' }}>
                      <span style={{ fontWeight: '500' }}>재고:</span> {stockInfo.stock}개
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>
                      <span style={{ fontWeight: '500' }}>창고:</span> {stockInfo.warehouse}
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151' }}>
                      <span style={{ fontWeight: '500' }}>상태:</span>{' '}
                      <span style={{
                        color: stockInfo.stock === 0 ? '#dc2626' : stockInfo.stock < 5 ? '#f59e0b' : '#10b981'
                      }}>
                        {stockInfo.status === 'OUT_OF_STOCK' ? '품절' : 
                         stockInfo.status === 'LOW_STOCK' ? '재고 부족' : '재고 충분'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>재고 정보를 불러올 수 없습니다</p>
                )}
              </div>
            </section>
          </article>

          {/* 리뷰 섹션 */}
          <section id="reviews-section" className="reviews-section" style={{
            marginTop: '48px',
            padding: '24px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
                상품 리뷰 {!loadingReviews && `(${reviews.length})`}
              </h2>
              {isLoggedIn && !isWritingReview && (
                <button
                  onClick={() => setIsWritingReview(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: '#1a1a1a',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  리뷰 작성
                </button>
              )}
            </div>

            {/* 리뷰 작성 폼 */}
            {isWritingReview && (
              <div style={{
                padding: '20px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                marginBottom: '16px'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>리뷰 작성하기</h3>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    별점
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setNewReviewRating(star)}
                        style={{
                          fontSize: '24px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        {star <= newReviewRating ? '⭐' : '☆'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                    리뷰 내용 (최소 10자)
                  </label>
                  <textarea
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder="상품에 대한 리뷰를 작성해주세요."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      padding: '12px',
                      fontSize: '14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      resize: 'vertical',
                    }}
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                    {newReviewComment.length} / 500자
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleSubmitReview}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                      backgroundColor: '#1a1a1a',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    등록
                  </button>
                  <button
                    onClick={() => {
                      setIsWritingReview(false);
                      setNewReviewRating(5);
                      setNewReviewComment('');
                    }}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
            
            {loadingReviews ? (
              <p style={{ fontSize: '14px', color: '#6b7280' }}>리뷰를 불러오는 중...</p>
            ) : reviews.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#6b7280' }}>아직 작성된 리뷰가 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reviews.map((review) => {
                  const isEditing = editingReviewId === review.id;
                  const currentUsername = localStorage.getItem('token') ? 
                    JSON.parse(atob(localStorage.getItem('token').split('.')[1])).username : null;
                  const isOwnReview = currentUsername === review.username;

                  return (
                    <div key={review.id} className="review-item" style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {isEditing ? (
                        // 수정 모드
                        <div>
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                              별점
                            </label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setEditReviewRating(star)}
                                  style={{
                                    fontSize: '20px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '2px',
                                  }}
                                >
                                  {star <= editReviewRating ? '⭐' : '☆'}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div style={{ marginBottom: '12px' }}>
                            <textarea
                              value={editReviewComment}
                              onChange={(e) => setEditReviewComment(e.target.value)}
                              style={{
                                width: '100%',
                                minHeight: '80px',
                                padding: '10px',
                                fontSize: '14px',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                resize: 'vertical',
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={handleUpdateReview}
                              style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#ffffff',
                                backgroundColor: '#1a1a1a',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              저장
                            </button>
                            <button
                              onClick={() => {
                                setEditingReviewId(null);
                                setEditReviewRating(5);
                                setEditReviewComment('');
                              }}
                              style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#6b7280',
                                backgroundColor: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        // 일반 표시 모드
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div className="review-rating" style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#f59e0b'
                            }}>
                              {'⭐'.repeat(review.rating)}
                              <span style={{ marginLeft: '4px', color: '#6b7280' }}>({review.rating})</span>
                            </div>
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                              {review.username}
                            </span>
                          </div>
                          <p className="review-comment" style={{ 
                            fontSize: '14px', 
                            color: '#374151',
                            lineHeight: '1.6',
                            marginBottom: '8px'
                          }}>
                            {review.comment}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {review.createdAt && (
                              <p style={{ 
                                fontSize: '12px', 
                                color: '#9ca3af',
                              }}>
                                {new Date(review.createdAt).toLocaleDateString('ko-KR')}
                              </p>
                            )}
                            {isOwnReview && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleStartEdit(review)}
                                  style={{
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(review.id)}
                                  style={{
                                    padding: '4px 12px',
                                    fontSize: '12px',
                                    color: '#ef4444',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #fecaca',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
