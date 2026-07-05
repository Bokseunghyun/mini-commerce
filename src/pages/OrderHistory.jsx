"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "../components/Modal.jsx";
import { toast } from "../lib/toast.js";

// 주문취소 사유 (실제 커머스 취소 플로우 연출)
const CANCEL_REASONS = [
  "단순 변심",
  "상품이 마음에 들지 않음",
  "배송이 너무 느림",
  "다른 상품을 주문하고 싶음",
  "주문 실수",
  "기타",
];

/**
 * 주문 내역 페이지
 * - GET /api/orders 로 주문 목록 조회 (토큰은 액션 시점에 localStorage에서 읽음)
 * - 행 클릭 시 상세 펼침 (GET /api/orders/:id 로 배송 정보 포함 상세 조회)
 * - PAID 주문에 한해 주문취소 (PATCH /api/orders/:id {action:'cancel'})
 */

function formatPrice(price) {
  return (Number(price) || 0).toLocaleString("ko-KR");
}

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function itemSummary(items) {
  if (!Array.isArray(items) || items.length === 0) return "주문 상품 정보 없음";
  const first = items[0]?.name || "상품";
  return items.length > 1 ? `${first} 외 ${items.length - 1}건` : first;
}

// 주문 상태 5종: 한글 라벨 + 구분 색상 (badge 스타일 키는 styles 참조)
const STATUS_META = {
  PAID: { label: "결제완료", style: "statusPaid" },
  PREPARING: { label: "상품준비중", style: "statusPreparing" },
  SHIPPING: { label: "배송중", style: "statusShipping" },
  DELIVERED: { label: "배송완료", style: "statusDelivered" },
  CANCELED: { label: "취소됨", style: "statusCanceled" },
};

function statusMeta(status) {
  return STATUS_META[status] || { label: status || "-", style: "statusCanceled" };
}

// 취소 가능 상태 (PAID/PREPARING 만)
function isCancelable(status) {
  return status === "PAID" || status === "PREPARING";
}

// 진행 가능 상태 (종료 상태 제외)
function isAdvanceable(status) {
  return status !== "DELIVERED" && status !== "CANCELED";
}

// 송장/배송조회 노출 상태 (SHIPPING/DELIVERED)
function hasTracking(status) {
  return status === "SHIPPING" || status === "DELIVERED";
}

function LoadingSpinner() {
  return (
    <div style={styles.loadingContainer} data-testid="loading-spinner">
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>주문 내역을 불러오는 중...</p>
    </div>
  );
}

export default function OrderHistoryPage({ apiBase, onGoHome }) {
  const API_BASE = apiBase || "";

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [orders, setOrders] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  // 주문 상세 캐시: { [orderId]: { loading, order, error } }
  const [details, setDetails] = useState({});
  // 취소 결과 메시지: { type: 'success' | 'error', text }
  const [cancelMessage, setCancelMessage] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  // 배송조회 인라인 상태: { [orderId]: { loading, data, error } }
  const [tracking, setTracking] = useState({});
  // 상태 진행 결과 메시지: { type: 'success' | 'error', text }
  const [advanceMessage, setAdvanceMessage] = useState(null);
  const [advancingId, setAdvancingId] = useState(null);
  // 커스텀 주문취소 모달: 대상 주문 + 선택 사유
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  // 자동 진행(테스트 편의): 이 주문을 일정 간격으로 다음 단계 진행
  const [autoAdvanceId, setAutoAdvanceId] = useState(null);
  // 부분취소: 펼친 주문의 선택 항목 {productId:true} + 확인 대상 주문
  const [itemSel, setItemSel] = useState({});
  const [partialTarget, setPartialTarget] = useState(null);
  const [partialProcessing, setPartialProcessing] = useState(false);

  const fetchOrders = useCallback(async () => {
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
      const res = await fetch(`${API_BASE}/api/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      if (!res.ok) {
        setLoadError(data.message || `주문 내역 조회 실패 (status=${res.status})`);
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e) {
      setLoadError(`네트워크 오류: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // 행 클릭: 상세 펼침/접기 + 상세(배송 정보 포함) 조회
  const handleToggleDetail = (orderId) => {
    setItemSel({}); // 다른 주문을 펼치면 부분취소 선택 초기화
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);

    if (!details[orderId]) {
      setDetails((prev) => ({ ...prev, [orderId]: { loading: true } }));
      const token = sessionStorage.getItem("token");
      fetch(`${API_BASE}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || "주문 상세 조회 실패");
          return data.order;
        })
        .then((order) => {
          setDetails((prev) => ({ ...prev, [orderId]: { loading: false, order } }));
        })
        .catch((e) => {
          setDetails((prev) => ({
            ...prev,
            [orderId]: { loading: false, error: e.message },
          }));
        });
    }
  };

  // 주문취소 모달 열기 (실제 커머스 취소 플로우: 사유 선택 후 확인)
  const openCancelModal = (orderId) => {
    setCancelReason("");
    setCancelMessage(null);
    setCancelTarget(orderId);
  };

  // 모달에서 '취소 요청' 확인 → 실제 취소 실행
  const confirmCancel = async () => {
    if (!cancelReason) {
      toast.error("취소 사유를 선택해주세요.");
      return;
    }
    const orderId = cancelTarget;
    setCancelTarget(null);
    await runCancel(orderId, cancelReason);
  };

  // 주문 취소 실행 (사유는 안내/토스트용 — 서버 취소 API 호출)
  const runCancel = async (orderId, reason) => {
    setCancelMessage(null);
    setCancelingId(orderId);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 409 ALREADY_CANCELED 등: 서버 메시지 그대로 표시
        setCancelMessage({
          type: "error",
          text: data.message || `주문 취소 실패 (status=${res.status})`,
        });
        if (res.status === 409) {
          // 이미 취소된 주문이면 목록 상태도 동기화
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELED" } : o))
          );
        }
        return;
      }

      const nextStatus = data.order?.status || "CANCELED";
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      setDetails((prev) => {
        if (!prev[orderId]?.order) return prev;
        return {
          ...prev,
          [orderId]: {
            ...prev[orderId],
            order: { ...prev[orderId].order, status: nextStatus },
          },
        };
      });
      setCancelMessage({
        type: "success",
        text: `${data.message || "주문이 취소되었습니다"}${reason ? ` (사유: ${reason})` : ""}`,
      });
    } catch (e) {
      setCancelMessage({ type: "error", text: `네트워크 오류: ${e.message}` });
    } finally {
      setCancelingId(null);
    }
  };

  // 배송조회 (GET /api/tracking?orderId= — 인증). 외부 택배 API 목킹 연습 대상.
  const handleTrack = async (orderId) => {
    setTracking((prev) => ({ ...prev, [orderId]: { loading: true } }));
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/tracking?orderId=${encodeURIComponent(orderId)}`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const text =
          res.status === 404
            ? data.message || "배송 추적 정보를 찾을 수 없습니다"
            : data.message || `배송 조회 실패 (status=${res.status})`;
        setTracking((prev) => ({ ...prev, [orderId]: { loading: false, error: text } }));
        return;
      }

      setTracking((prev) => ({ ...prev, [orderId]: { loading: false, data } }));
    } catch (e) {
      setTracking((prev) => ({
        ...prev,
        [orderId]: { loading: false, error: `네트워크 오류: ${e.message}` },
      }));
    }
  };

  // 주문 상태 진행 (PATCH /api/orders/:id {action:'advance'}) — 테스터가 라이프사이클을 직접 진행
  const handleAdvance = async (orderId) => {
    setAdvanceMessage(null);
    setAdvancingId(orderId);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ action: "advance" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAdvanceMessage({
          type: "error",
          text:
            res.status === 409
              ? data.message || "더 이상 진행할 수 없는 주문 상태입니다"
              : data.message || `주문 상태 진행 실패 (status=${res.status})`,
        });
        return;
      }

      const nextStatus = data.order?.status;
      const nextTracking = data.order?.trackingNumber;
      if (nextStatus) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: nextStatus, trackingNumber: nextTracking ?? o.trackingNumber }
              : o
          )
        );
        setDetails((prev) => {
          if (!prev[orderId]?.order) return prev;
          return {
            ...prev,
            [orderId]: {
              ...prev[orderId],
              order: {
                ...prev[orderId].order,
                status: nextStatus,
                trackingNumber: nextTracking ?? prev[orderId].order.trackingNumber,
              },
            },
          };
        });
      }
      // 이전 배송조회 결과는 상태가 바뀌었으니 무효화 (다시 조회하도록)
      setTracking((prev) => {
        if (!prev[orderId]) return prev;
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setAdvanceMessage({
        type: "success",
        text: data.message || `주문 상태가 변경되었습니다: ${nextStatus || ""}`,
      });
    } catch (e) {
      setAdvanceMessage({ type: "error", text: `네트워크 오류: ${e.message}` });
    } finally {
      setAdvancingId(null);
    }
  };

  // 자동 진행: autoAdvanceId 설정 시, 진행 가능한 동안 5초 간격으로 다음 단계로 진행.
  // 종료 상태(배송완료/취소) 도달 시 자동 정지. (자동화 관찰·폴링 연습용; 테스트는 advance API 직접 호출도 가능)
  useEffect(() => {
    if (!autoAdvanceId) return undefined;
    const order = orders.find((o) => o.id === autoAdvanceId);
    if (!order || !isAdvanceable(order.status)) {
      setAutoAdvanceId(null);
      return undefined;
    }
    const t = setTimeout(() => {
      handleAdvance(autoAdvanceId);
    }, 5000);
    return () => clearTimeout(t);
    // handleAdvance 는 매 렌더 재생성되므로 deps 제외 (포함 시 매 렌더 타이머 리셋)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAdvanceId, orders]);

  // 부분취소: 항목 체크 토글
  const toggleItemSel = (pid) =>
    setItemSel((prev) => ({ ...prev, [pid]: !prev[pid] }));

  // 부분취소: 선택 항목이 있으면 확인 모달 열기
  const openPartialCancel = (orderId) => {
    const selected = Object.keys(itemSel).filter((k) => itemSel[k]);
    if (selected.length === 0) {
      toast.error("취소/반품할 상품을 선택해주세요.");
      return;
    }
    setPartialTarget(orderId);
  };

  // 부분취소 확정 → PATCH cancel_items
  const confirmPartialCancel = async () => {
    const orderId = partialTarget;
    const productIds = Object.keys(itemSel)
      .filter((k) => itemSel[k])
      .map(Number);
    setPartialTarget(null);
    setPartialProcessing(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ action: "cancel_items", productIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || `부분취소 실패 (status=${res.status})`);
        return;
      }
      toast.success(data.message || "취소되었습니다.");
      // 목록 상태 + 상세(항목 canceled 플래그) 갱신
      if (data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: data.order.status } : o))
        );
        setDetails((prev) => {
          if (!prev[orderId]?.order) return prev;
          return {
            ...prev,
            [orderId]: {
              ...prev[orderId],
              order: {
                ...prev[orderId].order,
                status: data.order.status,
                items: data.items || prev[orderId].order.items,
              },
            },
          };
        });
      }
      setItemSel({});
    } catch (e) {
      toast.error(`네트워크 오류: ${e.message}`);
    } finally {
      setPartialProcessing(false);
    }
  };

  return (
    <div
      id="order-history-page"
      className="order-history-page"
      style={styles.page}
      data-testid="order-history-page"
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <main style={styles.container} className="order-history-container">
        {isLoading ? (
          <LoadingSpinner />
        ) : !isLoggedIn ? (
          <div
            id="orders-login-required"
            className="orders-login-required login-required-notice"
            style={styles.noticeBox}
            data-testid="orders-login-required"
            role="alert"
          >
            <p style={styles.noticeTitle}>로그인이 필요한 서비스입니다</p>
            <p style={styles.noticeText}>주문 내역은 로그인 후 확인할 수 있습니다.</p>
            <button
              type="button"
              id="orders-go-home"
              className="btn btn-primary orders-go-home-button"
              aria-label="홈으로 이동"
              onClick={onGoHome}
              style={styles.primaryBtn}
              data-testid="orders-go-home"
            >
              홈으로
            </button>
          </div>
        ) : loadError ? (
          <div
            id="orders-error"
            className="orders-error"
            style={styles.errorBox}
            data-testid="orders-error"
            role="alert"
          >
            {loadError}
          </div>
        ) : orders.length === 0 ? (
          <div
            id="orders-empty"
            className="orders-empty"
            style={styles.noticeBox}
            data-testid="orders-empty"
            role="status"
          >
            <p style={styles.noticeTitle}>주문 내역이 없습니다</p>
            <button
              type="button"
              id="orders-empty-go-home"
              className="btn btn-primary orders-empty-go-home-button"
              aria-label="쇼핑하러 가기"
              onClick={onGoHome}
              style={styles.primaryBtn}
              data-testid="orders-empty-go-home"
            >
              쇼핑하러 가기
            </button>
          </div>
        ) : (
          <>
            <p style={styles.countText} data-testid="orders-count" className="orders-count">
              총 <strong>{orders.length}</strong>건의 주문
            </p>

            {/* 취소 결과 메시지 */}
            {cancelMessage && (
              <div
                id="order-cancel-message"
                className={`order-cancel-message cancel-${cancelMessage.type}`}
                style={{
                  ...styles.messageBox,
                  ...(cancelMessage.type === "success"
                    ? styles.messageSuccess
                    : styles.messageError),
                }}
                data-testid="order-cancel-message"
                data-status={cancelMessage.type}
                role={cancelMessage.type === "success" ? "status" : "alert"}
                aria-live="polite"
              >
                {cancelMessage.text}
              </div>
            )}

            {/* 상태 진행 결과 메시지 */}
            {advanceMessage && (
              <div
                id="order-advance-message"
                className={`order-advance-message advance-${advanceMessage.type}`}
                style={{
                  ...styles.messageBox,
                  ...(advanceMessage.type === "success"
                    ? styles.messageSuccess
                    : styles.messageError),
                }}
                data-testid="order-advance-message"
                data-status={advanceMessage.type}
                role={advanceMessage.type === "success" ? "status" : "alert"}
                aria-live="polite"
              >
                {advanceMessage.text}
              </div>
            )}

            <div style={styles.orderList} className="order-list" data-testid="order-list" role="list">
              {orders.map((order) => {
                const isExpanded = expandedId === order.id;
                const detail = details[order.id];
                const detailOrder = detail?.order;
                const items = detailOrder?.items || order.items || [];
                const status = order.status;
                const meta = statusMeta(status);
                const trackNo = detailOrder?.trackingNumber ?? order.trackingNumber ?? null;
                const track = tracking[order.id];

                return (
                  <article
                    key={order.id}
                    id={`order-item-${order.id}`}
                    className="order-item"
                    style={styles.orderCard}
                    data-testid={`order-item-${order.id}`}
                    data-order-id={order.id}
                    data-order-status={order.status}
                    role="listitem"
                  >
                    {/* 요약 행 (클릭 시 상세 펼침) */}
                    <div
                      className="order-summary-row"
                      style={styles.orderSummaryRow}
                      onClick={() => handleToggleDetail(order.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleToggleDetail(order.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      aria-label={`주문 ${order.id} 상세 보기`}
                      data-testid={`order-summary-${order.id}`}
                    >
                      <div style={styles.orderMeta}>
                        <span
                          style={styles.orderDate}
                          className="order-date"
                          data-testid={`order-date-${order.id}`}
                        >
                          {formatDate(order.createdAt)}
                        </span>
                        <span
                          style={styles.orderId}
                          className="order-id"
                          data-testid={`order-id-${order.id}`}
                        >
                          {order.id}
                        </span>
                      </div>
                      <div style={styles.orderBody}>
                        <span
                          style={styles.orderItemsSummary}
                          className="order-items-summary"
                          data-testid={`order-items-summary-${order.id}`}
                        >
                          {itemSummary(order.items)}
                        </span>
                        <span
                          style={styles.orderPrice}
                          className="order-final-price"
                          data-testid={`order-final-price-${order.id}`}
                        >
                          {formatPrice(order.finalPrice)}원
                        </span>
                      </div>
                      <span
                        id={`order-status-${order.id}`}
                        className={`order-status-badge status-${(order.status || "").toLowerCase()}`}
                        style={{
                          ...styles.statusBadge,
                          ...(styles[meta.style] || styles.statusCanceled),
                        }}
                        data-testid={`order-status-${order.id}`}
                        data-status={order.status}
                      >
                        {meta.label}
                      </span>
                    </div>

                    {/* 상세 영역 */}
                    {isExpanded && (
                      <div
                        id={`order-detail-${order.id}`}
                        className="order-detail"
                        style={styles.orderDetail}
                        data-testid={`order-detail-${order.id}`}
                      >
                        {detail?.loading ? (
                          <p style={styles.detailLoading} className="order-detail-loading">
                            상세 정보를 불러오는 중...
                          </p>
                        ) : detail?.error ? (
                          <p style={styles.detailError} role="alert" className="order-detail-error">
                            {detail.error}
                          </p>
                        ) : (
                          <>
                            {/* 주문 상품 테이블 */}
                            <table
                              style={styles.itemsTable}
                              className="order-items-table"
                              data-testid={`order-items-table-${order.id}`}
                            >
                              <thead>
                                <tr>
                                  {isCancelable(status) && <th style={styles.th}>선택</th>}
                                  <th style={{ ...styles.th, textAlign: "left" }}>상품명</th>
                                  <th style={styles.th}>가격</th>
                                  <th style={styles.th}>수량</th>
                                  <th style={styles.th}>소계</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((it) => (
                                  <tr
                                    key={`${order.id}-${it.productId}`}
                                    className="order-detail-item"
                                    data-testid={`order-detail-item-${order.id}-${it.productId}`}
                                  >
                                    {isCancelable(status) && (
                                      <td style={styles.td}>
                                        {it.canceled ? (
                                          <span style={{ color: "#9ca3af" }}>-</span>
                                        ) : (
                                          <input
                                            type="checkbox"
                                            checked={!!itemSel[it.productId]}
                                            onChange={() => toggleItemSel(it.productId)}
                                            aria-label={`${it.name} 취소 선택`}
                                            data-testid={`order-item-select-${order.id}-${it.productId}`}
                                          />
                                        )}
                                      </td>
                                    )}
                                    <td style={{ ...styles.td, textAlign: "left" }}>
                                      {it.name}
                                      {it.options && (it.options.color || it.options.size) && (
                                        <span
                                          data-testid={`order-item-options-${order.id}-${it.productId}`}
                                          style={{ display: "block", fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}
                                        >
                                          옵션: {it.options.color || "-"} / {it.options.size || "-"}
                                        </span>
                                      )}
                                      {it.canceled && (
                                        <span
                                          data-testid={`order-item-canceled-${order.id}-${it.productId}`}
                                          style={{ display: "block", fontSize: "0.75rem", color: "#dc2626", fontWeight: 700, marginTop: 2 }}
                                        >
                                          취소됨
                                        </span>
                                      )}
                                    </td>
                                    <td style={styles.td}>{formatPrice(it.price)}원</td>
                                    <td style={styles.td}>{it.quantity}</td>
                                    <td style={styles.td}>
                                      {formatPrice((Number(it.price) || 0) * (Number(it.quantity) || 0))}원
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {/* 금액 요약 */}
                            <div style={styles.priceSummary} className="order-price-summary">
                              <div style={styles.priceRow}>
                                <span style={styles.priceLabel}>상품 금액</span>
                                <span style={styles.priceValue}>
                                  {formatPrice(order.totalPrice)}원
                                </span>
                              </div>
                              <div style={styles.priceRow}>
                                <span style={styles.priceLabel}>
                                  할인{order.couponCode ? ` (쿠폰: ${order.couponCode})` : ""}
                                </span>
                                <span
                                  style={{ ...styles.priceValue, color: "#dc2626" }}
                                  data-testid={`order-discount-${order.id}`}
                                >
                                  -{formatPrice(order.discount)}원
                                </span>
                              </div>
                              <div style={{ ...styles.priceRow, ...styles.priceTotalRow }}>
                                <span style={styles.priceTotalLabel}>최종 결제 금액</span>
                                <span style={styles.priceTotalValue}>
                                  {formatPrice(order.finalPrice)}원
                                </span>
                              </div>
                            </div>

                            {/* 배송 정보 */}
                            <div
                              style={styles.shippingBox}
                              className="order-shipping"
                              data-testid={`order-shipping-${order.id}`}
                            >
                              <p style={styles.shippingTitle}>배송 정보</p>
                              {detailOrder?.shipping ? (
                                <dl style={styles.shippingList}>
                                  <div style={styles.shippingRow}>
                                    <dt style={styles.shippingLabel}>받는 분</dt>
                                    <dd style={styles.shippingValue}>
                                      {detailOrder.shipping.name || "-"}
                                    </dd>
                                  </div>
                                  <div style={styles.shippingRow}>
                                    <dt style={styles.shippingLabel}>연락처</dt>
                                    <dd style={styles.shippingValue}>
                                      {detailOrder.shipping.phone || "-"}
                                    </dd>
                                  </div>
                                  <div style={styles.shippingRow}>
                                    <dt style={styles.shippingLabel}>주소</dt>
                                    <dd style={styles.shippingValue}>
                                      {detailOrder.shipping.address || "-"}
                                    </dd>
                                  </div>
                                  <div style={styles.shippingRow}>
                                    <dt style={styles.shippingLabel}>배송 메모</dt>
                                    <dd style={styles.shippingValue}>
                                      {detailOrder.shipping.memo || "-"}
                                    </dd>
                                  </div>
                                </dl>
                              ) : (
                                <p style={styles.shippingEmpty}>등록된 배송 정보가 없습니다</p>
                              )}
                            </div>

                            {/* 배송 추적 (SHIPPING/DELIVERED) — 외부 택배 API 목킹 연습 대상 */}
                            {hasTracking(status) && (
                              <div
                                style={styles.trackingBox}
                                className="order-tracking"
                                data-testid={`order-tracking-${order.id}`}
                              >
                                <div style={styles.trackingHeader}>
                                  <div>
                                    <p style={styles.shippingTitle}>배송 추적</p>
                                    <p style={styles.trackingNumberLine}>
                                      운송장 번호:{" "}
                                      <span
                                        style={styles.trackingNumberValue}
                                        className="order-tracking-number"
                                        data-testid={`order-tracking-number-${order.id}`}
                                        data-tracking-number={trackNo || ""}
                                      >
                                        {trackNo || "발급 대기중"}
                                      </span>
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    id={`order-track-btn-${order.id}`}
                                    className="btn btn-secondary order-track-button"
                                    aria-label={`주문 ${order.id} 배송조회`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTrack(order.id);
                                    }}
                                    disabled={track?.loading}
                                    style={{
                                      ...styles.trackBtn,
                                      ...(track?.loading ? styles.cancelBtnDisabled : {}),
                                    }}
                                    data-testid={`order-track-btn-${order.id}`}
                                  >
                                    {track?.loading ? "조회 중..." : "배송조회"}
                                  </button>
                                </div>

                                {track?.loading && (
                                  <div
                                    style={styles.trackingLoading}
                                    data-testid="loading-spinner"
                                    className="order-tracking-loading"
                                    role="status"
                                    aria-live="polite"
                                  >
                                    <div style={styles.spinnerSmall}></div>
                                    <span>배송 정보를 조회하는 중...</span>
                                  </div>
                                )}

                                {track?.error && (
                                  <p
                                    style={styles.detailError}
                                    className="order-tracking-error"
                                    role="alert"
                                    data-testid={`tracking-error-${order.id}`}
                                  >
                                    {track.error}
                                  </p>
                                )}

                                {track?.data && (
                                  <ol
                                    style={styles.timeline}
                                    className="order-tracking-timeline"
                                    data-testid={`tracking-timeline-${order.id}`}
                                    data-status={track.data.status}
                                  >
                                    {(track.data.events || []).length === 0 ? (
                                      <li
                                        style={styles.timelineEmpty}
                                        className="order-tracking-empty"
                                        data-testid={`tracking-empty-${order.id}`}
                                      >
                                        배송 이벤트가 없습니다
                                      </li>
                                    ) : (
                                      (track.data.events || []).map((ev, i) => (
                                        <li
                                          key={`${order.id}-track-${i}`}
                                          style={styles.timelineRow}
                                          className="order-tracking-event"
                                          data-testid={`tracking-event-${order.id}-${i}`}
                                          data-status={ev.status}
                                        >
                                          <span style={styles.timelineDot}></span>
                                          <div style={styles.timelineBody}>
                                            <span style={styles.timelineLabel}>{ev.label}</span>
                                            <span style={styles.timelineMeta}>
                                              {formatDate(ev.at)}
                                              {ev.location ? ` · ${ev.location}` : ""}
                                            </span>
                                          </div>
                                        </li>
                                      ))
                                    )}
                                  </ol>
                                )}
                              </div>
                            )}

                            {/* 액션 버튼 영역: 상태 진행 + 주문취소 */}
                            {(isAdvanceable(status) || isCancelable(status)) && (
                              <div style={styles.actionRow}>
                                {isAdvanceable(status) && (
                                  <>
                                    <button
                                      type="button"
                                      id={`order-advance-btn-${order.id}`}
                                      className="btn btn-primary order-advance-button"
                                      aria-label={`주문 ${order.id} 상태 진행`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAdvance(order.id);
                                      }}
                                      disabled={advancingId === order.id}
                                      style={{
                                        ...styles.advanceBtn,
                                        ...(advancingId === order.id ? styles.cancelBtnDisabled : {}),
                                      }}
                                      data-testid={`order-advance-btn-${order.id}`}
                                    >
                                      {advancingId === order.id ? "진행 중..." : "주문 상태 진행"}
                                    </button>
                                    <button
                                      type="button"
                                      id={`order-auto-advance-btn-${order.id}`}
                                      className="btn order-auto-advance-button"
                                      aria-pressed={autoAdvanceId === order.id}
                                      aria-label={`주문 ${order.id} 자동 진행 토글`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAutoAdvanceId((prev) => (prev === order.id ? null : order.id));
                                      }}
                                      style={{
                                        ...styles.advanceBtn,
                                        backgroundColor: autoAdvanceId === order.id ? "#dc2626" : "#059669",
                                      }}
                                      data-testid={`order-auto-advance-btn-${order.id}`}
                                    >
                                      {autoAdvanceId === order.id ? "⏹ 자동 진행 중지" : "▶ 자동 진행"}
                                    </button>
                                  </>
                                )}
                                {isCancelable(status) && (
                                  <button
                                    type="button"
                                    id={`order-cancel-${order.id}`}
                                    className="btn btn-danger order-cancel-button"
                                    aria-label={`주문 ${order.id} 취소`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCancelModal(order.id);
                                    }}
                                    disabled={cancelingId === order.id}
                                    style={{
                                      ...styles.cancelBtn,
                                      ...(cancelingId === order.id
                                        ? styles.cancelBtnDisabled
                                        : {}),
                                    }}
                                    data-testid={`order-cancel-${order.id}`}
                                  >
                                    {cancelingId === order.id ? "취소 처리 중..." : "주문취소"}
                                  </button>
                                )}
                                {isCancelable(status) && (
                                  <button
                                    type="button"
                                    id={`order-partial-cancel-${order.id}`}
                                    className="btn order-partial-cancel-button"
                                    aria-label={`주문 ${order.id} 선택 항목 취소/반품`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPartialCancel(order.id);
                                    }}
                                    disabled={partialProcessing}
                                    style={{
                                      ...styles.cancelBtn,
                                      backgroundColor: "#ffffff",
                                      color: "#b45309",
                                      border: "1px solid #fcd34d",
                                    }}
                                    data-testid={`order-partial-cancel-${order.id}`}
                                  >
                                    선택 항목 취소/반품
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* 커스텀 주문취소 확인 모달 (실제 커머스 취소 플로우: 사유 선택 → 확인) */}
      <Modal
        open={cancelTarget != null}
        onClose={() => setCancelTarget(null)}
        title="주문 취소"
        testid="cancel-modal"
      >
        <p style={{ margin: "0 0 14px", fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
          정말 이 주문을 취소하시겠어요?<br />
          취소 후에는 되돌릴 수 없습니다.
        </p>
        <label
          htmlFor="cancel-reason"
          style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}
        >
          취소 사유 <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <select
          id="cancel-reason"
          data-testid="cancel-reason-select"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: 14,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            marginBottom: 18,
            backgroundColor: "#fff",
          }}
        >
          <option value="">사유를 선택해주세요</option>
          {CANCEL_REASONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            data-testid="cancel-modal-dismiss"
            onClick={() => setCancelTarget(null)}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "#fff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            돌아가기
          </button>
          <button
            type="button"
            data-testid="cancel-modal-confirm"
            onClick={confirmCancel}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              border: "none",
              borderRadius: 8,
              background: "#dc2626",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            주문 취소하기
          </button>
        </div>
      </Modal>

      {/* 부분취소/반품 확인 모달 */}
      <Modal
        open={partialTarget != null}
        onClose={() => setPartialTarget(null)}
        title="선택 항목 취소/반품"
        testid="partial-cancel-modal"
      >
        <p style={{ margin: "0 0 14px", fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
          선택한 <strong>{Object.values(itemSel).filter(Boolean).length}개</strong> 상품을 취소/반품할까요?<br />
          해당 상품 재고가 복원되고 환불 내역이 기록됩니다. 모든 상품을 취소하면 주문 전체가 취소됩니다.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            data-testid="partial-cancel-dismiss"
            onClick={() => setPartialTarget(null)}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              border: "1px solid #d1d5db",
              borderRadius: 8,
              background: "#fff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            돌아가기
          </button>
          <button
            type="button"
            data-testid="partial-cancel-confirm"
            onClick={confirmPartialCancel}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              border: "none",
              borderRadius: 8,
              background: "#b45309",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            취소/반품 요청
          </button>
        </div>
      </Modal>
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
  orderList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  orderCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    overflow: "hidden",
  },
  orderSummaryRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 20px",
    cursor: "pointer",
    flexWrap: "wrap",
  },
  orderMeta: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: "160px",
  },
  orderDate: {
    fontSize: "13px",
    color: "#6b7280",
  },
  orderId: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    fontFamily: "monospace",
  },
  orderBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: "180px",
  },
  orderItemsSummary: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#1f2937",
  },
  orderPrice: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a1a1a",
  },
  statusBadge: {
    fontSize: "13px",
    fontWeight: "600",
    padding: "6px 12px",
    borderRadius: "16px",
    whiteSpace: "nowrap",
  },
  statusPaid: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
    border: "1px solid #bfdbfe",
  },
  statusPreparing: {
    backgroundColor: "#fffbeb",
    color: "#d97706",
    border: "1px solid #fde68a",
  },
  statusShipping: {
    backgroundColor: "#f5f3ff",
    color: "#7c3aed",
    border: "1px solid #ddd6fe",
  },
  statusDelivered: {
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    border: "1px solid #bbf7d0",
  },
  statusCanceled: {
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
    border: "1px solid #e5e7eb",
  },
  orderDetail: {
    borderTop: "1px solid #e5e7eb",
    padding: "20px",
    backgroundColor: "#f9fafb",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  detailLoading: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  detailError: {
    fontSize: "14px",
    color: "#dc2626",
    margin: 0,
  },
  itemsTable: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    overflow: "hidden",
    fontSize: "14px",
  },
  th: {
    padding: "10px 12px",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "right",
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "10px 12px",
    color: "#1f2937",
    textAlign: "right",
    borderBottom: "1px solid #f3f4f6",
  },
  priceSummary: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  priceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: "14px",
    color: "#6b7280",
  },
  priceValue: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1f2937",
  },
  priceTotalRow: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "10px",
    marginTop: "4px",
  },
  priceTotalLabel: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#1a1a1a",
  },
  priceTotalValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#e53e3e",
  },
  shippingBox: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "16px",
  },
  shippingTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    margin: "0 0 12px",
  },
  shippingList: {
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  shippingRow: {
    display: "flex",
    gap: "12px",
  },
  shippingLabel: {
    width: "80px",
    fontSize: "13px",
    color: "#9ca3af",
    flexShrink: 0,
  },
  shippingValue: {
    fontSize: "13px",
    color: "#1f2937",
    margin: 0,
  },
  shippingEmpty: {
    fontSize: "13px",
    color: "#9ca3af",
    margin: 0,
  },
  trackingBox: {
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  trackingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
  trackingNumberLine: {
    fontSize: "13px",
    color: "#6b7280",
    margin: 0,
  },
  trackingNumberValue: {
    fontWeight: "600",
    color: "#1f2937",
    fontFamily: "monospace",
  },
  trackBtn: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#7c3aed",
    backgroundColor: "#f5f3ff",
    border: "1px solid #ddd6fe",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  trackingLoading: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#6b7280",
  },
  spinnerSmall: {
    width: "18px",
    height: "18px",
    border: "3px solid #e5e7eb",
    borderTopColor: "#7c3aed",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    flexShrink: 0,
  },
  timeline: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  timelineRow: {
    display: "flex",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  timelineDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    backgroundColor: "#7c3aed",
    marginTop: "5px",
    flexShrink: 0,
  },
  timelineBody: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  timelineLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1f2937",
  },
  timelineMeta: {
    fontSize: "12px",
    color: "#9ca3af",
  },
  timelineEmpty: {
    fontSize: "13px",
    color: "#9ca3af",
    padding: "8px 0",
  },
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },
  advanceBtn: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  cancelRow: {
    display: "flex",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#dc2626",
    backgroundColor: "#ffffff",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  cancelBtnDisabled: {
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
