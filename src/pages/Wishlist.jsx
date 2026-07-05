"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 위시리스트 페이지
 * - GET /api/user-actions?type=wishlist 로 목록 조회 (토큰은 액션 시점에 localStorage에서 읽음)
 * - 상품명/이미지 클릭 → onView(productId)
 * - 장바구니 담기 → onAddToCart(item, 1) + in-DOM 메시지
 * - 삭제 → POST /api/user-actions {action:'wishlist_remove'} → 행 제거
 */

// 상품 옵션 (데모용 표준 옵션 — 상세페이지와 동일한 색상/사이즈 세트)
const COLOR_OPTIONS = ["블랙", "화이트", "네이비"];
const SIZE_OPTIONS = ["S", "M", "L", "XL"];

function formatPrice(price) {
  return (Number(price) || 0).toLocaleString("ko-KR");
}

function LoadingSpinner() {
  return (
    <div style={styles.loadingContainer} data-testid="loading-spinner">
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>위시리스트를 불러오는 중...</p>
    </div>
  );
}

export default function WishlistPage({ apiBase, onBack, onView, onAddToCart }) {
  const API_BASE = apiBase || "";

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [items, setItems] = useState([]);
  const [loadError, setLoadError] = useState("");
  // 액션 결과 메시지: { type: 'success' | 'error', text }
  const [message, setMessage] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  // 위시리스트 항목별 선택 옵션 { [productId]: { color, size } } — 담기 전 필수 선택
  const [optionSel, setOptionSel] = useState({});

  const setOption = (productId, key, value) =>
    setOptionSel((prev) => ({ ...prev, [productId]: { ...prev[productId], [key]: value } }));

  const fetchWishlist = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setIsLoading(false);
      return;
    }
    setIsLoggedIn(true);
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/api/user-actions?type=wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      if (!res.ok) {
        setLoadError(data.message || `위시리스트 조회 실패 (status=${res.status})`);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setLoadError(`네트워크 오류: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // 장바구니 담기
  const handleAddToCart = (item) => {
    setMessage(null);
    // 상세페이지와 동일하게 색상/사이즈를 필수로 강제 (옵션 없이 담기 방지)
    const sel = optionSel[item.productId] || {};
    if (!sel.color || !sel.size) {
      setMessage({ type: "error", text: "색상과 사이즈를 선택해주세요." });
      return;
    }
    // App의 addToCart는 id 필드를 사용하므로 productId를 id로 매핑해 전달
    onAddToCart?.({ ...item, id: item.productId }, 1, { color: sel.color, size: sel.size });
    setMessage({
      type: "success",
      text: `'${item.name}' 상품을 장바구니에 담았습니다 (${sel.color} / ${sel.size})`,
    });
  };

  // 위시리스트에서 삭제
  const handleRemove = async (item) => {
    setMessage(null);
    setRemovingId(item.productId);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/user-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ action: "wishlist_remove", productId: item.productId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 404 NOT_IN_WISHLIST 등: 서버 메시지 그대로 표시
        setMessage({
          type: "error",
          text: data.message || `삭제 실패 (status=${res.status})`,
        });
        if (res.status === 404) {
          // 서버에 이미 없는 항목이면 목록에서도 제거
          setItems((prev) => prev.filter((it) => it.productId !== item.productId));
        }
        return;
      }

      setItems((prev) => prev.filter((it) => it.productId !== item.productId));
      setMessage({
        type: "success",
        text: data.message || "위시리스트에서 삭제되었습니다",
      });
    } catch (e) {
      setMessage({ type: "error", text: `네트워크 오류: ${e.message}` });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      id="wishlist-page"
      className="wishlist-page"
      style={styles.page}
      data-testid="wishlist-page"
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        /* 모바일: 카드 내 액션 버튼을 전체폭 2등분으로 (우측 여백 채움) */
        @media (max-width: 640px) {
          .wishlist-item-actions { width: 100%; gap: 8px; }
          .wishlist-item-actions .btn { flex: 1; }
        }
      `}</style>

      <main style={styles.container} className="wishlist-container">
        {isLoading ? (
          <LoadingSpinner />
        ) : !isLoggedIn ? (
          <div
            id="wishlist-login-required"
            className="wishlist-login-required login-required-notice"
            style={styles.noticeBox}
            data-testid="wishlist-login-required"
            role="alert"
          >
            <p style={styles.noticeTitle}>로그인이 필요한 서비스입니다</p>
            <p style={styles.noticeText}>위시리스트는 로그인 후 확인할 수 있습니다.</p>
            <button
              type="button"
              id="wishlist-go-home"
              className="btn btn-primary wishlist-go-home-button"
              aria-label="홈으로 이동"
              onClick={onBack}
              style={styles.primaryBtn}
              data-testid="wishlist-go-home"
            >
              홈으로
            </button>
          </div>
        ) : loadError ? (
          <div
            id="wishlist-error"
            className="wishlist-error"
            style={styles.errorBox}
            data-testid="wishlist-error"
            role="alert"
          >
            {loadError}
          </div>
        ) : items.length === 0 ? (
          <div
            id="wishlist-empty"
            className="wishlist-empty"
            style={styles.noticeBox}
            data-testid="wishlist-empty"
            role="status"
          >
            <p style={styles.noticeTitle}>위시리스트가 비어있습니다</p>
            <p style={styles.noticeText}>마음에 드는 상품을 위시리스트에 담아보세요.</p>
            <button
              type="button"
              id="wishlist-empty-go-home"
              className="btn btn-primary wishlist-empty-go-home-button"
              aria-label="쇼핑하러 가기"
              onClick={onBack}
              style={styles.primaryBtn}
              data-testid="wishlist-empty-go-home"
            >
              쇼핑하러 가기
            </button>
          </div>
        ) : (
          <>
            <p style={styles.countText} data-testid="wishlist-count" className="wishlist-count">
              총 <strong>{items.length}</strong>개의 상품
            </p>

            {/* 액션 결과 메시지 */}
            {message && (
              <div
                id="wishlist-message"
                className={`wishlist-message wishlist-message-${message.type}`}
                style={{
                  ...styles.messageBox,
                  ...(message.type === "success"
                    ? styles.messageSuccess
                    : styles.messageError),
                }}
                data-testid="wishlist-message"
                data-status={message.type}
                role={message.type === "success" ? "status" : "alert"}
                aria-live="polite"
              >
                {message.text}
              </div>
            )}

            <div
              style={styles.itemList}
              className="wishlist-item-list"
              data-testid="wishlist-item-list"
              role="list"
            >
              {items.map((item) => (
                <article
                  key={item.productId}
                  id={`wishlist-item-${item.productId}`}
                  className="wishlist-item"
                  style={styles.itemCard}
                  data-testid={`wishlist-item-${item.productId}`}
                  data-product-id={item.productId}
                  data-product-name={item.name}
                  role="listitem"
                >
                  <div
                    className="wishlist-item-image-wrapper"
                    style={styles.imageWrapper}
                    onClick={() => onView?.(item.productId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onView?.(item.productId);
                    }}
                    aria-label={`${item.name} 상세 보기`}
                    data-testid={`wishlist-image-${item.productId}`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="wishlist-item-image"
                        style={styles.image}
                      />
                    ) : (
                      <div style={styles.imagePlaceholder} className="wishlist-item-placeholder">
                        {item.name?.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="wishlist-item-info" style={styles.itemInfo}>
                    <h3
                      id={`wishlist-name-${item.productId}`}
                      className="wishlist-item-name"
                      style={styles.itemName}
                      onClick={() => onView?.(item.productId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") onView?.(item.productId);
                      }}
                      aria-label={`${item.name} 상세 보기`}
                      data-testid={`wishlist-name-${item.productId}`}
                      title={item.name}
                    >
                      {item.name}
                    </h3>
                    <span
                      className="wishlist-item-price"
                      style={styles.itemPrice}
                      data-testid={`wishlist-price-${item.productId}`}
                    >
                      {formatPrice(item.price)}원
                    </span>
                    <div
                      className="wishlist-item-options"
                      style={styles.optionRow}
                      data-testid={`wishlist-options-${item.productId}`}
                    >
                      <select
                        aria-label={`${item.name} 색상 선택`}
                        value={(optionSel[item.productId] || {}).color || ""}
                        onChange={(e) => setOption(item.productId, "color", e.target.value)}
                        style={styles.optionSelect}
                        data-testid={`wishlist-option-color-${item.productId}`}
                      >
                        <option value="">색상 선택</option>
                        {COLOR_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <select
                        aria-label={`${item.name} 사이즈 선택`}
                        value={(optionSel[item.productId] || {}).size || ""}
                        onChange={(e) => setOption(item.productId, "size", e.target.value)}
                        style={styles.optionSelect}
                        data-testid={`wishlist-option-size-${item.productId}`}
                      >
                        <option value="">사이즈 선택</option>
                        {SIZE_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="wishlist-item-actions" style={styles.itemActions}>
                    <button
                      type="button"
                      id={`wishlist-add-to-cart-${item.productId}`}
                      className="btn btn-primary wishlist-add-to-cart-button"
                      aria-label={`${item.name} 장바구니 담기`}
                      onClick={() => handleAddToCart(item)}
                      style={styles.addToCartBtn}
                      data-testid={`wishlist-add-to-cart-${item.productId}`}
                    >
                      장바구니 담기
                    </button>
                    <button
                      type="button"
                      id={`wishlist-remove-${item.productId}`}
                      className="btn btn-danger wishlist-remove-button"
                      aria-label={`${item.name} 위시리스트에서 삭제`}
                      onClick={() => handleRemove(item)}
                      disabled={removingId === item.productId}
                      style={{
                        ...styles.removeBtn,
                        ...(removingId === item.productId ? styles.removeBtnDisabled : {}),
                      }}
                      data-testid={`wishlist-remove-${item.productId}`}
                    >
                      {removingId === item.productId ? "삭제 중..." : "삭제"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

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
    gap: "16px",
  },
  backBtn: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    backgroundColor: "transparent",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "color 0.2s, border-color 0.2s",
    whiteSpace: "nowrap",
  },
  headerTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1a1a1a",
    margin: 0,
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px 16px 48px",
    boxSizing: "border-box",
  },
  countText: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 16px",
  },
  messageBox: {
    borderRadius: "8px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "16px",
  },
  messageSuccess: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#16a34a",
  },
  messageError: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
  },
  itemList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  itemCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  imageWrapper: {
    width: "80px",
    height: "80px",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
    cursor: "pointer",
    flexShrink: 0,
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    fontWeight: "700",
    color: "#94a3b8",
    backgroundColor: "#e2e8f0",
  },
  itemInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    minWidth: "180px",
  },
  itemName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
    cursor: "pointer",
    lineHeight: 1.4,
  },
  itemPrice: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a1a1a",
  },
  optionRow: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
    flexWrap: "wrap",
  },
  optionSelect: {
    padding: "6px 10px",
    fontSize: "13px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    outline: "none",
  },
  itemActions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  addToCartBtn: {
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
  },
  removeBtn: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#dc2626",
    backgroundColor: "#ffffff",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  removeBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  noticeBox: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    padding: "48px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
  },
  noticeTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
  },
  noticeText: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  primaryBtn: {
    marginTop: "8px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "16px",
    color: "#dc2626",
    fontSize: "14px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "320px",
    gap: "16px",
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
};
