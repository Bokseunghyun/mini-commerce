"use client";

import React, { useMemo, useState } from "react";
import ImageUpload from "../components/ImageUpload";
import { toast } from "../lib/toast.js";

const MAX_REVIEW_IMAGES = 3;

// 상품 옵션 (데모용 표준 옵션 — 담기/구매 전 필수 선택)
const COLOR_OPTIONS = ["블랙", "화이트", "네이비"];
const SIZE_OPTIONS = ["S", "M", "L", "XL"];

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
// 로딩 스피너
// ============================================
function LoadingSpinner({ label = "불러오는 중..." }) {
  return (
    <div className="loading-container" data-testid="loading-spinner">
      <div className="spinner"></div>
      <p>{label}</p>
    </div>
  );
}

// ============================================
// 별 문자열 (표시용)
// ============================================
const starString = (rating) => {
  const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "★".repeat(r) + "☆".repeat(5 - r);
};

// 토큰에서 username 추출 (실패해도 크래시 X)
const getCurrentUsername = () => {
  try {
    const token = sessionStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).username || null;
  } catch {
    return null;
  }
};

const REVIEW_PAGE_SIZE = 5;

const TAB_DEFS = [
  { key: "description", label: "상세설명" },
  { key: "specs", label: "상품스펙" },
  { key: "shipping", label: "배송·교환" },
  { key: "reviews", label: "리뷰" },
];

// ============================================
// 상품 상세
// props:
// - product: selectedProduct
// - onAddToCart(qty): "장바구니 담기" (이동 X)
// - onBuyNow(qty): "바로구매" (order 동일)
// ============================================
export default function ProductDetailPage({
  product,
  onAddToCart,
  onBuyNow,
  isLoggedIn = false,
}) {
  const [quantity, setQuantity] = useState(1);
  // 상품 옵션 선택 (색상/사이즈) — 담기/구매 전 필수
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [stockInfo, setStockInfo] = useState(null);
  const [loadingStock, setLoadingStock] = useState(true);

  // 갤러리 상태
  const [mainImageIdx, setMainImageIdx] = useState(0);

  // 탭 상태
  const [activeTab, setActiveTab] = useState("description");

  // 리뷰 상태
  const [reviewList, setReviewList] = useState([]); // 페이지네이션된 목록
  const [reviewCount, setReviewCount] = useState(0); // 전체 개수
  const [allReviews, setAllReviews] = useState([]); // 요약 계산용(최대 100개)
  const [reviewSort, setReviewSort] = useState("latest");
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviewsVersion, setReviewsVersion] = useState(0); // 등록/수정/삭제 후 새로고침 트리거

  // 리뷰 작성 폼 상태
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState("");
  const [newReviewImages, setNewReviewImages] = useState([]); // 업로드된 리뷰 이미지 url (최대 3)
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFormMessage, setReviewFormMessage] = useState(null); // {type:'success'|'error', text}

  // 리뷰 수정 상태
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewComment, setEditReviewComment] = useState("");

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
  const productId = product?.id;

  // 페이지 진입 시 스크롤 최상단으로 이동
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 상품이 바뀌면 갤러리/폼 상태 초기화
  React.useEffect(() => {
    setMainImageIdx(0);
    setQuantity(1);
    setNewReviewRating(5);
    setNewReviewComment("");
    setNewReviewImages([]);
    setReviewFormMessage(null);
    setEditingReviewId(null);
  }, [productId]);

  // 재고 정보 조회 (/api/inventory)
  React.useEffect(() => {
    if (!productId) return;

    setLoadingStock(true);
    fetch(`${API_BASE}/api/inventory?productId=${productId}`)
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
  }, [productId, API_BASE]);

  // 리뷰 첫 페이지 + 요약용 전체 목록 조회
  React.useEffect(() => {
    if (!productId) return;
    let cancelled = false;

    setLoadingReviews(true);
    Promise.all([
      fetch(`${API_BASE}/api/reviews?productId=${productId}&sort=${reviewSort}&limit=${REVIEW_PAGE_SIZE}&offset=0`).then((res) => res.json()),
      fetch(`${API_BASE}/api/reviews?productId=${productId}&limit=100&offset=0`).then((res) => res.json()),
    ])
      .then(([page, all]) => {
        if (cancelled) return;
        setReviewList(page.reviews || []);
        setReviewCount(Number(page.count) || 0);
        setAllReviews(all.reviews || []);
      })
      .catch((err) => {
        console.error('리뷰 조회 실패:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingReviews(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId, reviewSort, reviewsVersion, API_BASE]);

  // 리뷰 더보기 (다음 페이지 append)
  const handleLoadMoreReviews = async () => {
    if (!productId || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reviews?productId=${productId}&sort=${reviewSort}&limit=${REVIEW_PAGE_SIZE}&offset=${reviewList.length}`
      );
      const data = await res.json();
      setReviewList((prev) => [...prev, ...(data.reviews || [])]);
      if (data.count != null) setReviewCount(Number(data.count) || 0);
    } catch (err) {
      console.error('리뷰 조회 실패:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const safeProduct = useMemo(() => product || {}, [product]);
  const unitPrice = useMemo(() => {
    // discountedPrice 우선, 없으면 price, 없으면 0
    const n = Number(safeProduct.discountedPrice ?? safeProduct.price ?? 0);
    return Number.isFinite(n) ? n : 0;
  }, [safeProduct]);

  const totalPrice = unitPrice * (Number(quantity) || 1);

  // 갤러리 이미지 (images 없으면 imageUrl 폴백)
  const galleryImages = useMemo(() => {
    const imgs = Array.isArray(safeProduct.images) ? safeProduct.images.filter(Boolean) : [];
    if (imgs.length > 0) return imgs;
    return safeProduct.imageUrl ? [safeProduct.imageUrl] : [];
  }, [safeProduct]);
  const mainImageSrc = galleryImages[mainImageIdx] || galleryImages[0] || safeProduct.imageUrl || "/placeholder.svg";

  // 재고 뱃지 상태 (product.stock 기준)
  const stockCount = Number(safeProduct.stock);
  const isSoldOut = stockCount === 0;
  const stockState = isSoldOut ? "soldout" : stockCount > 0 && stockCount < 5 ? "low" : "ok";
  const stockLabel = isSoldOut
    ? "품절"
    : stockState === "low"
      ? `품절임박 · 재고 ${stockCount}개`
      : "재고 충분";
  // 수량 최대치 = 재고 (live 재고 우선, 없으면 product.stock). 최소 1.
  const maxQty = Math.max(1, Number(stockInfo?.stock ?? stockCount) || 1);

  // 스펙 / 태그 / 상세 (없어도 크래시 X)
  const specEntries = useMemo(() => Object.entries(safeProduct.specs || {}), [safeProduct]);
  const tags = Array.isArray(safeProduct.tags) ? safeProduct.tags : [];
  const details = Array.isArray(safeProduct.details) ? safeProduct.details : [];

  // 리뷰 요약 (전체 리뷰 기준)
  const reviewStats = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    allReviews.forEach((r) => {
      const rt = Math.round(Number(r.rating) || 0);
      sum += Number(r.rating) || 0;
      if (dist[rt] != null) dist[rt] += 1;
    });
    const total = allReviews.length;
    return { total, average: total > 0 ? sum / total : 0, dist };
  }, [allReviews]);

  const handleQuantityDecrease = () => {
    setQuantity((q) => Math.max(1, (Number(q) || 1) - 1));
  };
  const handleQuantityIncrease = () => {
    setQuantity((q) => Math.min(maxQty, (Number(q) || 1) + 1));
  };

  // 옵션 선택 검증 (색상/사이즈 필수). 미선택 시 토스트 후 중단.
  const validateOptions = () => {
    if (!selectedColor || !selectedSize) {
      toast.error("색상과 사이즈를 선택해주세요.");
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!validateOptions()) return;
    const qty = Math.max(1, Number(quantity) || 1);
    onAddToCart?.(qty, { color: selectedColor, size: selectedSize }); // 여기서 페이지 이동 안함
  };

  const handleBuyNow = () => {
    if (!validateOptions()) return;
    const qty = Math.max(1, Number(quantity) || 1);
    onBuyNow?.(qty, { color: selectedColor, size: selectedSize });
  };

  // 리뷰 이미지 업로드 성공 시 url 누적 (최대 3장)
  const handleReviewImageUploaded = (url) => {
    setNewReviewImages((prev) => (prev.length >= MAX_REVIEW_IMAGES ? prev : [...prev, url]));
  };
  const handleRemoveReviewImage = (idx) => {
    setNewReviewImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // 리뷰 작성 (인라인 메시지 표시)
  const handleSubmitReview = async () => {
    if (submittingReview) return;
    setReviewFormMessage(null);
    setSubmittingReview(true);

    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          productId: safeProduct.id,
          rating: newReviewRating,
          comment: newReviewComment.trim(),
          images: newReviewImages,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // API 에러 메시지를 그대로 표시 (예: COMMENT_TOO_SHORT, REVIEW_ALREADY_EXISTS)
        setReviewFormMessage({
          type: 'error',
          text: data.message || data.code || `오류가 발생했습니다 (${res.status})`,
        });
        return;
      }

      setReviewFormMessage({ type: 'success', text: '리뷰가 등록되었습니다' });
      setNewReviewRating(5);
      setNewReviewComment('');
      setNewReviewImages([]);
      setReviewsVersion((v) => v + 1); // 목록 + 요약 새로고침
    } catch (err) {
      setReviewFormMessage({ type: 'error', text: '리뷰 등록 중 오류가 발생했습니다: ' + err.message });
    } finally {
      setSubmittingReview(false);
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
      toast.error('리뷰는 최소 10자 이상 작성해주세요.');
      return;
    }

    try {
      const token = sessionStorage.getItem('token');
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
        toast.error(`리뷰 수정 실패\n상태 코드: ${res.status}\n메시지: ${data.message || '알 수 없는 오류'}`);
        return;
      }

      toast.success('리뷰가 수정되었습니다.');
      setEditingReviewId(null);
      setEditReviewRating(5);
      setEditReviewComment('');
      setReviewsVersion((v) => v + 1);
    } catch (err) {
      toast.error('리뷰 수정 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // 리뷰 삭제
  const handleDeleteReview = async (reviewId) => {
    if (!confirm('이 리뷰를 삭제하시겠습니까?')) return;

    try {
      const token = sessionStorage.getItem('token');
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
        toast.error(`리뷰 삭제 실패\n상태 코드: ${res.status}\n메시지: ${data.message || '알 수 없는 오류'}`);
        return;
      }

      toast.success('리뷰가 삭제되었습니다.');
      setReviewsVersion((v) => v + 1);
    } catch (err) {
      toast.error('리뷰 삭제 중 오류가 발생했습니다: ' + err.message);
    }
  };

  if (!product) return null;

  const currentUsername = getCurrentUsername();

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
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px 16px;
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

        .main-content { max-width: 1200px; margin: 0 auto; padding: 16px 12px; width: 350px; box-sizing: border-box; }
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

        .gallery-thumbs { display: flex; gap: 8px; margin-top: 12px; }
        .gallery-thumb {
          width: 68px; height: 68px; padding: 0;
          border: 2px solid #e5e5e5; border-radius: 8px;
          background-color: #ffffff; overflow: hidden;
          cursor: pointer; transition: border-color 0.15s ease;
        }
        @media (min-width: 768px) { .gallery-thumb { width: 80px; height: 80px; } }
        .gallery-thumb:hover { border-color: #a3a3a3; }
        .gallery-thumb.selected { border-color: #1a1a1a; }
        .gallery-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

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

        .stock-badge {
          display: inline-block;
          width: fit-content;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.8125rem;
          font-weight: 600;
        }
        .stock-badge-soldout { background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .stock-badge-low { background-color: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
        .stock-badge-ok { background-color: #f5f5f5; color: #525252; border: 1px solid #e5e5e5; }

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
        .btn-cart:hover:not(:disabled) { background-color: #f5f5f5; }
        .btn-buy { background-color: #1a1a1a; color: #ffffff; }
        .btn-buy:hover:not(:disabled) { background-color: #333333; }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-icon { width: 18px; height: 18px; }
        @media (min-width: 768px) { .btn-icon { width: 20px; height: 20px; } }

        /* ===== 탭 ===== */
        .tabs-section {
          margin-top: 48px;
          background-color: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          overflow: hidden;
        }
        .tab-list { display: flex; border-bottom: 1px solid #e5e5e5; background-color: #fafafa; }
        .tab-button {
          flex: 1;
          padding: 14px 6px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #737373;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: color 0.15s ease, border-color 0.15s ease;
          white-space: nowrap;
        }
        @media (min-width: 768px) { .tab-button { padding: 16px 8px; font-size: 0.9375rem; } }
        .tab-button:hover { color: #1a1a1a; }
        .tab-button[aria-selected="true"] {
          color: #1a1a1a;
          border-bottom-color: #1a1a1a;
          background-color: #ffffff;
        }
        .tab-panel { padding: 20px 16px; }
        @media (min-width: 768px) { .tab-panel { padding: 32px 24px; } }

        /* 상세설명 */
        .description-text { font-size: 0.9375rem; color: #374151; line-height: 1.8; white-space: pre-line; }
        .tag-chip-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
        .product-tag-chip {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 999px;
          background-color: #f5f5f5;
          border: 1px solid #e5e5e5;
          color: #525252;
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .detail-benefit-list { margin-top: 20px; padding-left: 18px; color: #525252; font-size: 0.875rem; display: flex; flex-direction: column; gap: 4px; }

        /* 상품스펙 */
        .specs-table { width: 100%; border-collapse: collapse; }
        .specs-table th, .specs-table td {
          padding: 12px 14px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 0.875rem;
          text-align: left;
          vertical-align: top;
        }
        .specs-table th { width: 36%; background-color: #f9fafb; color: #525252; font-weight: 600; }
        .specs-table td { color: #1a1a1a; }

        /* 배송·교환 */
        .policy-block { margin-bottom: 24px; }
        .policy-block:last-child { margin-bottom: 0; }
        .policy-title { font-size: 1rem; font-weight: 700; margin-bottom: 10px; }
        .policy-list { padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 0.875rem; color: #374151; }

        /* 리뷰 요약 */
        .review-summary {
          display: flex; flex-direction: column; gap: 20px;
          padding: 20px; background-color: #f9fafb;
          border: 1px solid #e5e7eb; border-radius: 12px;
          margin-bottom: 20px;
        }
        @media (min-width: 640px) { .review-summary { flex-direction: row; align-items: center; gap: 40px; } }
        .review-summary-average { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 120px; }
        .rating-average { font-size: 2.25rem; font-weight: 700; color: #1a1a1a; line-height: 1.2; }
        .rating-average-stars { color: #f59e0b; font-size: 1rem; letter-spacing: 2px; }
        .rating-average-total { font-size: 0.8125rem; color: #6b7280; }
        .rating-bars { flex: 1; display: flex; flex-direction: column; gap: 6px; width: 100%; }
        .rating-bar-row { display: flex; align-items: center; gap: 10px; }
        .rating-bar-label { font-size: 0.8125rem; color: #525252; width: 28px; text-align: right; }
        .rating-bar-track { flex: 1; height: 8px; background-color: #e5e7eb; border-radius: 999px; overflow: hidden; }
        .rating-bar-fill { height: 100%; background-color: #f59e0b; border-radius: 999px; transition: width 0.3s ease; }
        .rating-bar-count { font-size: 0.8125rem; color: #6b7280; width: 24px; }

        /* 리뷰 툴바 */
        .review-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .review-toolbar-title { font-size: 1rem; font-weight: 700; }
        .review-sort-select {
          padding: 8px 12px;
          font-size: 0.8125rem;
          border: 1px solid #e5e5e5;
          border-radius: 8px;
          background-color: #ffffff;
          color: #1a1a1a;
          cursor: pointer;
        }

        /* 리뷰 작성 폼 */
        .review-write-form {
          padding: 20px;
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          margin-bottom: 20px;
        }
        .review-write-title { font-size: 1rem; font-weight: 700; margin-bottom: 12px; }
        .star-input-row { display: flex; align-items: center; gap: 2px; margin-bottom: 12px; }
        .star-input-btn {
          font-size: 26px;
          line-height: 1;
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px 4px;
          color: #d4d4d4;
          transition: color 0.1s ease;
        }
        .star-input-btn.filled { color: #f59e0b; }
        .star-input-value { margin-left: 8px; font-size: 0.875rem; font-weight: 600; color: #525252; }
        .review-comment-input {
          width: 100%;
          min-height: 96px;
          padding: 12px;
          font-size: 0.875rem;
          font-family: inherit;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          resize: vertical;
        }
        .review-char-count { font-size: 0.75rem; color: #6b7280; margin: 4px 0 12px; }
        .review-submit-btn {
          padding: 10px 24px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #ffffff;
          background-color: #1a1a1a;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .review-submit-btn:hover:not(:disabled) { background-color: #333333; }
        .review-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .review-form-message { margin-top: 12px; font-size: 0.875rem; font-weight: 500; padding: 10px 12px; border-radius: 8px; }
        .review-form-message.success { color: #15803d; background-color: #f0fdf4; border: 1px solid #bbf7d0; }
        .review-form-message.error { color: #dc2626; background-color: #fef2f2; border: 1px solid #fecaca; }
        .review-login-required {
          font-size: 0.875rem; color: #6b7280;
          padding: 14px 16px; background-color: #f9fafb;
          border: 1px dashed #d4d4d4; border-radius: 8px;
          margin-bottom: 20px;
        }

        /* 리뷰 목록 */
        .review-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
        .review-item {
          padding: 16px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .review-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; }
        .review-item-stars { color: #f59e0b; font-size: 0.875rem; letter-spacing: 1px; }
        .review-item-rating-num { margin-left: 4px; color: #6b7280; font-size: 0.8125rem; }
        .review-item-username { font-size: 0.75rem; color: #9ca3af; }
        .review-item-comment { font-size: 0.875rem; color: #374151; line-height: 1.6; margin-bottom: 8px; }
        .review-item-images { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .review-item-image {
          width: 80px; height: 80px; object-fit: cover;
          border-radius: 8px; border: 1px solid #e5e7eb; background-color: #fff;
        }

        /* 리뷰 이미지 업로드 */
        .review-image-upload { margin-bottom: 12px; }
        .review-image-upload-label { font-size: 0.8125rem; font-weight: 600; color: #525252; margin-bottom: 8px; }
        .review-image-thumbs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
        .review-image-thumb-wrap { position: relative; width: 72px; height: 72px; }
        .review-image-thumb {
          width: 72px; height: 72px; object-fit: cover;
          border-radius: 8px; border: 1px solid #e5e7eb;
        }
        .review-image-remove {
          position: absolute; top: -6px; right: -6px;
          width: 20px; height: 20px; line-height: 18px; text-align: center;
          padding: 0; border-radius: 50%;
          background-color: #1a1a1a; color: #fff;
          border: none; cursor: pointer; font-size: 14px;
        }
        .review-item-footer { display: flex; justify-content: space-between; align-items: center; }
        .review-item-date { font-size: 0.75rem; color: #9ca3af; }
        .review-empty { font-size: 0.875rem; color: #6b7280; padding: 24px 0; text-align: center; }
        .review-load-more-btn {
          display: block;
          width: 100%;
          margin-top: 16px;
          padding: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #1a1a1a;
          background-color: #ffffff;
          border: 1px solid #d4d4d4;
          border-radius: 8px;
          cursor: pointer;
        }
        .review-load-more-btn:hover:not(:disabled) { background-color: #f5f5f5; }
        .review-load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* 로딩 스피너 */
        .loading-container {
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          padding: 32px 0; color: #6b7280; font-size: 0.875rem;
        }
        .spinner {
          width: 28px; height: 28px;
          border: 3px solid #e5e5e5;
          border-top-color: #1a1a1a;
          border-radius: 50%;
          animation: pd-spin 0.8s linear infinite;
        }
        @keyframes pd-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="page-container" data-testid="product-detail">
        <main className="main-content">
          <article className="product-layout">
            <section className="image-section" aria-label="상품 이미지">
              <div className="image-wrapper">
                <img
                  id="product-main-image"
                  data-testid="product-main-image"
                  src={mainImageSrc}
                  alt={safeProduct.name}
                  className="product-image"
                />
                {Number(safeProduct.discountRate) > 0 && (
                  <span className="discount-badge">{safeProduct.discountRate}% OFF</span>
                )}
              </div>

              {galleryImages.length > 0 && (
                <div className="gallery-thumbs" data-testid="gallery-thumbs" role="group" aria-label="상품 이미지 썸네일">
                  {galleryImages.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      id={`gallery-thumb-${i}`}
                      data-testid={`gallery-thumb-${i}`}
                      className={`gallery-thumb${i === mainImageIdx ? " selected" : ""}`}
                      aria-pressed={i === mainImageIdx}
                      aria-label={`상품 이미지 ${i + 1}번 보기`}
                      onClick={() => setMainImageIdx(i)}
                    >
                      <img src={img} alt={`${safeProduct.name} 썸네일 ${i + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="info-section" aria-label="상품 정보">
              <div>
                <h1 className="product-title" data-testid="product-title">{safeProduct.name}</h1>
                <div style={{ marginTop: "10px" }}>
                  <span
                    id="stock-badge"
                    data-testid="stock-badge"
                    role="status"
                    className={`stock-badge stock-badge-${stockState}`}
                  >
                    {stockLabel}
                  </span>
                </div>
              </div>

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

              {/* 옵션 선택 (색상/사이즈) — 담기/구매 전 필수 */}
              <div
                className="option-section"
                data-testid="product-options"
                role="group"
                aria-label="옵션 선택"
                style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px 0" }}
              >
                {[
                  { key: "color", label: "색상", opts: COLOR_OPTIONS, sel: selectedColor, set: setSelectedColor },
                  { key: "size", label: "사이즈", opts: SIZE_OPTIONS, sel: selectedSize, set: setSelectedSize },
                ].map((grp) => (
                  <div key={grp.key} style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", minWidth: "48px" }}>
                      {grp.label} <span style={{ color: "#dc2626" }}>*</span>
                    </span>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {grp.opts.map((o) => {
                        const active = grp.sel === o;
                        return (
                          <button
                            key={o}
                            type="button"
                            data-testid={`option-${grp.key}-${o}`}
                            aria-pressed={active}
                            onClick={() => grp.set(o)}
                            style={{
                              padding: "8px 14px",
                              fontSize: "0.875rem",
                              borderRadius: "8px",
                              cursor: "pointer",
                              border: active ? "1px solid #1a1a1a" : "1px solid #d1d5db",
                              backgroundColor: active ? "#1a1a1a" : "#ffffff",
                              color: active ? "#ffffff" : "#374151",
                              fontWeight: active ? 700 : 500,
                            }}
                          >
                            {o}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {(selectedColor || selectedSize) && (
                  <p data-testid="option-selected" style={{ margin: 0, fontSize: "0.8125rem", color: "#6b7280" }}>
                    선택: {selectedColor || "—"} / {selectedSize || "—"}
                  </p>
                )}
              </div>

              <div className="quantity-section" role="group" aria-label="수량 선택">
                <span className="quantity-label">수량</span>
                <div className="quantity-controls">
                  <button className="quantity-btn" onClick={handleQuantityDecrease} disabled={quantity <= 1} aria-label="수량 감소">
                    <MinusIcon className="quantity-btn-icon" />
                  </button>
                  <span className="quantity-value" aria-live="polite" aria-atomic="true">{quantity}</span>
                  <button className="quantity-btn" onClick={handleQuantityIncrease} disabled={quantity >= maxQty || isSoldOut} aria-label="수량 증가">
                    <PlusIcon className="quantity-btn-icon" />
                  </button>
                </div>
              </div>

              <div className="total-section">
                <span className="total-label">총 상품금액</span>
                <span className="total-price">{formatPrice(totalPrice)}원</span>
              </div>

              <div className="button-section">
                {/* 장바구니 담기 (품절 시 비활성화) */}
                <button
                  id="add-to-cart-button"
                  data-testid="add-to-cart-button"
                  className="btn btn-cart"
                  onClick={handleAddToCart}
                  disabled={isSoldOut}
                  aria-label="장바구니에 담기"
                >
                  <ShoppingCartIcon className="btn-icon" />
                  장바구니 담기
                </button>

                {/* 바로구매 (품절 시 비활성화) */}
                <button
                  id="buy-now-button"
                  data-testid="buy-now-button"
                  className="btn btn-buy"
                  onClick={handleBuyNow}
                  disabled={isSoldOut}
                  aria-label="바로 구매하기"
                >
                  바로 구매
                </button>
              </div>

              {/* 재고 정보 섹션 (/api/inventory) */}
              <div id="stock-info" data-testid="stock-info" className="stock-info-section" style={{
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

          {/* ===== 상세 정보 탭 ===== */}
          <section className="tabs-section" data-testid="product-tabs" aria-label="상품 상세 정보">
            <div className="tab-list" role="tablist" aria-label="상품 정보 탭">
              {TAB_DEFS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  id={`tab-${tab.key}`}
                  data-testid={`tab-${tab.key}`}
                  className="tab-button"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`tab-panel-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {tab.key === "reviews" && !loadingReviews ? ` (${reviewCount})` : ""}
                </button>
              ))}
            </div>

            {/* --- 상세설명 --- */}
            {activeTab === "description" && (
              <div
                className="tab-panel"
                role="tabpanel"
                id="tab-panel-description"
                data-testid="tab-panel-description"
                aria-labelledby="tab-description"
              >
                <p className="description-text" data-testid="product-description">
                  {safeProduct.description || "등록된 상세 설명이 없습니다."}
                </p>

                {tags.length > 0 && (
                  <div className="tag-chip-list" data-testid="product-tags">
                    {tags.map((tag, i) => (
                      <span key={i} className="product-tag-chip" data-testid={`product-tag-${i}`}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {details.length > 0 && (
                  <ul className="detail-benefit-list" data-testid="product-details">
                    {details.map((d, i) => (
                      <li key={i} className="product-detail-item">{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* --- 상품스펙 --- */}
            {activeTab === "specs" && (
              <div
                className="tab-panel"
                role="tabpanel"
                id="tab-panel-specs"
                data-testid="tab-panel-specs"
                aria-labelledby="tab-specs"
              >
                {specEntries.length > 0 ? (
                  <table className="specs-table" id="specs-table" data-testid="specs-table">
                    <tbody>
                      {specEntries.map(([key, value], i) => (
                        <tr key={key} className="spec-row" data-testid={`spec-row-${i}`}>
                          <th scope="row">{key}</th>
                          <td>{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="review-empty" data-testid="specs-empty">등록된 상품 스펙이 없습니다.</p>
                )}
              </div>
            )}

            {/* --- 배송·교환 --- */}
            {activeTab === "shipping" && (
              <div
                className="tab-panel"
                role="tabpanel"
                id="tab-panel-shipping"
                data-testid="tab-panel-shipping"
                aria-labelledby="tab-shipping"
              >
                <div className="policy-block" data-testid="shipping-policy">
                  <h3 className="policy-title">배송 안내</h3>
                  <ul className="policy-list">
                    <li>배송비: 3,000원 (30,000원 이상 구매 시 무료배송)</li>
                    <li>평균 배송 기간: 결제 완료 후 2~3일 이내 도착 (주말·공휴일 제외)</li>
                    <li>오후 2시 이전 결제 완료 시 당일 출고됩니다.</li>
                    <li>제주 및 도서산간 지역은 추가 배송비 3,000원이 부과됩니다.</li>
                  </ul>
                </div>

                <div className="policy-block" data-testid="exchange-policy">
                  <h3 className="policy-title">교환·반품 안내</h3>
                  <ul className="policy-list">
                    <li>상품 수령 후 7일 이내 교환·반품 신청이 가능합니다.</li>
                    <li>단순 변심의 경우 왕복 배송비(6,000원)는 고객 부담입니다.</li>
                    <li>상품 불량 및 오배송의 경우 배송비는 판매자가 부담합니다.</li>
                    <li>포장 개봉 또는 사용 흔적이 있는 상품은 교환·반품이 제한될 수 있습니다.</li>
                    <li>교환·반품 접수는 마이페이지 &gt; 주문내역에서 신청해주세요.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* --- 리뷰 --- */}
            {activeTab === "reviews" && (
              <div
                className="tab-panel"
                role="tabpanel"
                id="tab-panel-reviews"
                data-testid="tab-panel-reviews"
                aria-labelledby="tab-reviews"
              >
                {/* 평점 요약 */}
                <div className="review-summary" data-testid="review-summary">
                  <div className="review-summary-average">
                    <span id="rating-average" data-testid="rating-average" className="rating-average">
                      {reviewStats.total > 0 ? reviewStats.average.toFixed(1) : "0.0"}
                    </span>
                    <span className="rating-average-stars" aria-hidden="true">{starString(reviewStats.average)}</span>
                    <span className="rating-average-total">리뷰 {reviewCount}개</span>
                  </div>
                  <div className="rating-bars">
                    {[5, 4, 3, 2, 1].map((r) => {
                      const cnt = reviewStats.dist[r] || 0;
                      const pct = reviewStats.total > 0 ? Math.round((cnt / reviewStats.total) * 100) : 0;
                      return (
                        <div key={r} className="rating-bar-row">
                          <span className="rating-bar-label">{r}점</span>
                          <div className="rating-bar-track">
                            <div
                              className="rating-bar-fill"
                              data-testid={`rating-bar-${r}`}
                              style={{ width: `${pct}%` }}
                              aria-label={`${r}점 리뷰 ${cnt}개`}
                            />
                          </div>
                          <span className="rating-bar-count" data-testid={`rating-count-${r}`}>{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 리뷰 작성 폼 (로그인 시에만) */}
                {isLoggedIn ? (
                  <div className="review-write-form" data-testid="review-write-form">
                    <h3 className="review-write-title">리뷰 작성</h3>

                    <div className="star-input-row" role="group" aria-label="별점 선택">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          id={`star-input-${star}`}
                          data-testid={`star-input-${star}`}
                          className={`star-input-btn${star <= newReviewRating ? " filled" : ""}`}
                          aria-pressed={star <= newReviewRating}
                          aria-label={`별점 ${star}점`}
                          onClick={() => setNewReviewRating(star)}
                        >
                          {star <= newReviewRating ? "★" : "☆"}
                        </button>
                      ))}
                      <span className="star-input-value" data-testid="star-input-value">{newReviewRating}점</span>
                    </div>

                    <textarea
                      id="review-comment"
                      data-testid="review-comment"
                      className="review-comment-input"
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder="상품에 대한 리뷰를 작성해주세요. (최소 10자)"
                      maxLength={500}
                      aria-label="리뷰 내용"
                    />
                    <p className="review-char-count">{newReviewComment.length} / 500자 (최소 10자)</p>

                    {/* 리뷰 이미지 첨부 (최대 3장) */}
                    <div className="review-image-upload" data-testid="review-image-upload">
                      <p className="review-image-upload-label">
                        사진 첨부 <span style={{ color: '#9ca3af' }}>({newReviewImages.length}/{MAX_REVIEW_IMAGES})</span>
                      </p>
                      {newReviewImages.length > 0 && (
                        <div className="review-image-thumbs" data-testid="review-image-thumbs">
                          {newReviewImages.map((url, i) => (
                            <div key={i} className="review-image-thumb-wrap">
                              <img
                                src={url}
                                alt={`첨부 이미지 ${i + 1}`}
                                className="review-image-thumb"
                                data-testid={`review-upload-thumb-${i}`}
                              />
                              <button
                                type="button"
                                className="review-image-remove"
                                data-testid={`review-upload-remove-${i}`}
                                aria-label={`첨부 이미지 ${i + 1} 삭제`}
                                onClick={() => handleRemoveReviewImage(i)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {newReviewImages.length < MAX_REVIEW_IMAGES && (
                        <ImageUpload
                          kind="review"
                          apiBase={API_BASE}
                          maxLabel={`이미지 최대 ${MAX_REVIEW_IMAGES}장, 각 2MB 이하`}
                          onUploaded={handleReviewImageUploaded}
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      id="review-submit"
                      data-testid="review-submit"
                      className="review-submit-btn"
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                    >
                      {submittingReview ? "등록 중..." : "리뷰 등록"}
                    </button>

                    {reviewFormMessage && (
                      <p
                        id="review-form-message"
                        data-testid="review-form-message"
                        role="alert"
                        className={`review-form-message ${reviewFormMessage.type}`}
                      >
                        {reviewFormMessage.text}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="review-login-required" data-testid="review-login-required">
                    리뷰를 작성하려면 로그인이 필요합니다.
                  </p>
                )}

                {/* 정렬 */}
                <div className="review-toolbar">
                  <h3 className="review-toolbar-title">
                    상품 리뷰 {!loadingReviews && `(${reviewCount})`}
                  </h3>
                  <select
                    id="review-sort"
                    data-testid="review-sort"
                    className="review-sort-select"
                    value={reviewSort}
                    onChange={(e) => setReviewSort(e.target.value)}
                    aria-label="리뷰 정렬"
                  >
                    <option value="latest">최신순</option>
                    <option value="rating">평점순</option>
                  </select>
                </div>

                {/* 리뷰 목록 */}
                {loadingReviews ? (
                  <LoadingSpinner label="리뷰를 불러오는 중..." />
                ) : reviewList.length === 0 ? (
                  <p className="review-empty" data-testid="review-empty">아직 작성된 리뷰가 없습니다.</p>
                ) : (
                  <ul className="review-list" data-testid="review-list">
                    {reviewList.map((review) => {
                      const isEditing = editingReviewId === review.id;
                      const isOwnReview = currentUsername != null && currentUsername === review.username;

                      return (
                        <li key={review.id} className="review-item" data-testid={`review-item-${review.id}`}>
                          {isEditing ? (
                            // 수정 모드
                            <div data-testid={`review-edit-form-${review.id}`}>
                              <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                  별점
                                </label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => setEditReviewRating(star)}
                                      aria-pressed={star <= editReviewRating}
                                      aria-label={`별점 ${star}점`}
                                      style={{
                                        fontSize: '20px',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        color: star <= editReviewRating ? '#f59e0b' : '#d4d4d4',
                                      }}
                                    >
                                      {star <= editReviewRating ? '★' : '☆'}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div style={{ marginBottom: '12px' }}>
                                <textarea
                                  value={editReviewComment}
                                  onChange={(e) => setEditReviewComment(e.target.value)}
                                  aria-label="리뷰 수정 내용"
                                  style={{
                                    width: '100%',
                                    minHeight: '80px',
                                    padding: '10px',
                                    fontSize: '14px',
                                    fontFamily: 'inherit',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    resize: 'vertical',
                                  }}
                                />
                              </div>

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
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
                                  type="button"
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
                              <div className="review-item-header">
                                <span className="review-item-stars" aria-label={`평점 ${review.rating}점`}>
                                  {starString(review.rating)}
                                  <span className="review-item-rating-num">({review.rating})</span>
                                </span>
                                <span className="review-item-username">{review.username}</span>
                              </div>
                              <p className="review-item-comment">{review.comment}</p>
                              {Array.isArray(review.images) && review.images.length > 0 && (
                                <div
                                  className="review-item-images"
                                  data-testid={`review-images-${review.id}`}
                                >
                                  {review.images.map((img, i) => (
                                    <img
                                      key={i}
                                      src={img}
                                      alt={`리뷰 이미지 ${i + 1}`}
                                      className="review-item-image"
                                      data-testid={`review-image-${review.id}-${i}`}
                                      loading="lazy"
                                    />
                                  ))}
                                </div>
                              )}
                              <div className="review-item-footer">
                                <span className="review-item-date">
                                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString('ko-KR') : ''}
                                </span>
                                {isOwnReview && (
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      type="button"
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
                                      type="button"
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
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* 더보기 */}
                {!loadingReviews && reviewList.length < reviewCount && (
                  <button
                    type="button"
                    id="review-load-more"
                    data-testid="review-load-more"
                    className="review-load-more-btn"
                    onClick={handleLoadMoreReviews}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "불러오는 중..." : `더보기 (${reviewList.length}/${reviewCount})`}
                  </button>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
