import { useEffect, useState } from "react";

/**
 * 주문/결제 페이지
 * - 주문 소스: buyNowItem(바로구매)이 있으면 해당 상품 1건, 없으면 서버 장바구니(GET /api/user-actions?type=cart)
 * - 배송지 입력(이름/휴대폰/주소 필수, 메모 선택) + 필드별 in-DOM 에러
 * - 쿠폰 적용: POST /api/coupons { code, orderAmount } → 할인 반영 / 에러 메시지 그대로 표시
 * - 결제수단 라디오: 신용카드만 실제 결제 동작(무통장/카카오는 '준비중' 안내)
 * - 결제 플로우(카드): 약관 동의 + 배송지 유효 상태에서 '결제하기' 클릭 시
 *     (1) POST /api/payment { cardNumber, cardExpiry, cardCvc, amount, orderName }
 *         → 진행 중 payment-processing(스피너) 노출, 버튼 disabled
 *     (2) 402/504/500 등 실패 시 응답 message 를 payment-error(role=alert)에 노출하고 주문 미생성
 *         (재현: 테스트 카드 뒤 4자리 0001 거절 / 0002 한도초과 / 9999 게이트웨이 타임아웃)
 *     (3) 성공(201 DONE) 시 받은 paymentKey 로
 *         POST /api/user-actions { action:'order', ..., paymentKey } → 201 시 onOrderComplete(order)
 *         (주문 단계 실패는 기존 checkout-error 에 표시)
 * - 외부 PG 목킹 대비: payment fetch 자체가 throw 해도 payment-error 에
 *   '결제 요청 중 오류가 발생했습니다' 를 노출하고 멈춘다(무한 로딩 금지).
 * - 약관 미동의 시 '결제하기' 버튼 disabled 유지
 */

const PHONE_REGEX = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;

function formatPrice(price) {
  const n = Number(price) || 0;
  return n.toLocaleString("ko-KR");
}

// 카드번호: 숫자만 남기고 최대 16자리, 4자리마다 하이픈
function formatCardNumber(raw) {
  const digits = String(raw).replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

// 유효기간: 숫자만 남기고 MM/YY 형태로 자동 변환 (최대 4자리)
function formatCardExpiry(raw) {
  const digits = String(raw).replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

// CVC: 숫자만, 최대 4자리
function formatCardCvc(raw) {
  return String(raw).replace(/\D/g, "").slice(0, 4);
}

function ArrowLeftIcon() {
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
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export default function CheckoutPage({ apiBase, buyNowItem, onOrderComplete, onBack }) {
  const API_BASE = apiBase || "";

  // 주문 상품 목록 (공통 shape: { productId, name, price, imageUrl, quantity })
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 배송지 입력
  const [shipName, setShipName] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipMemo, setShipMemo] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // 쿠폰
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount }
  const [couponMessage, setCouponMessage] = useState(null); // { type: 'success' | 'error', text }
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // 결제수단 / 약관
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [agreed, setAgreed] = useState(false);

  // 카드 입력 (신용카드 선택 시에만 노출)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // 결제 진행 상태 / 결제 에러(외부 PG 실패 표면화)
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // 테스트 카드 안내 박스 접힘/펼침
  const [showTestCardGuide, setShowTestCardGuide] = useState(false);

  // 제출(주문 생성)
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 주문 소스 로드: 바로구매 상품 또는 서버 장바구니
  useEffect(() => {
    if (buyNowItem) {
      setItems([
        {
          productId: Number(buyNowItem.id),
          name: buyNowItem.name || "",
          price: Number(buyNowItem.price) || 0,
          imageUrl: buyNowItem.imageUrl || "",
          quantity: Math.max(1, Number(buyNowItem.quantity) || 1),
        },
      ]);
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/api/user-actions?type=cart`, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "장바구니 조회 실패");
        return data;
      })
      .then((data) => {
        setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
    // 마운트 시 1회만 로드
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );
  const discount = appliedCoupon ? Math.min(Number(appliedCoupon.discount) || 0, subtotal) : 0;
  const finalAmount = subtotal - discount;

  // 쿠폰 적용
  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    setCouponMessage(null);

    if (!code) {
      setCouponMessage({ type: "error", text: "쿠폰 코드를 입력하세요" });
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/coupons`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ code, orderAmount: subtotal }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAppliedCoupon(null);
        setCouponMessage({ type: "error", text: data.message || "쿠폰 적용에 실패했습니다" });
        return;
      }

      const applied = { code: data.code || code, discount: Number(data.discount) || 0 };
      setAppliedCoupon(applied);
      setCouponMessage({
        type: "success",
        text: `쿠폰이 적용되었습니다: -${formatPrice(applied.discount)}원`,
      });
    } catch {
      setAppliedCoupon(null);
      setCouponMessage({ type: "error", text: "쿠폰 적용 중 오류가 발생했습니다" });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // 쿠폰 제거
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponMessage(null);
  };

  // 배송지 검증 (제출 시)
  const validateShipping = () => {
    const errors = {};
    if (!shipName.trim()) {
      errors.name = "받는 분 이름을 입력하세요";
    }
    if (!shipPhone.trim()) {
      errors.phone = "휴대폰 번호를 입력하세요";
    } else if (!PHONE_REGEX.test(shipPhone.trim())) {
      errors.phone = "올바른 휴대폰 번호 형식이 아닙니다 (예: 010-1234-5678)";
    }
    if (!shipAddress.trim()) {
      errors.address = "배송지 주소를 입력하세요";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 주문 생성 호출(결제 성공 후, 또는 결제 없는 수단 예외 처리에서 재사용)
  // paymentKey 가 주어지면 서버가 결제를 검증 후 주문에 연결한다.
  const submitOrder = async (paymentKey) => {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const body = {
        action: "order",
        shipping: {
          name: shipName.trim(),
          phone: shipPhone.trim(),
          address: shipAddress.trim(),
          memo: shipMemo.trim(),
        },
      };
      // 바로구매면 해당 상품만 주문, 아니면 서버 장바구니 전체 주문(items 생략)
      if (buyNowItem) {
        body.items = [
          {
            id: Number(buyNowItem.id),
            quantity: Math.max(1, Number(buyNowItem.quantity) || 1),
          },
        ];
      }
      if (appliedCoupon) {
        body.couponCode = appliedCoupon.code;
      }
      if (paymentKey) {
        body.paymentKey = paymentKey;
      }

      const res = await fetch(`${API_BASE}/api/user-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status !== 201) {
        // 결제 검증 실패(PAYMENT_REQUIRED/PAYMENT_INVALID) 포함 — 기존 checkout-error 에 표시
        setSubmitError(data.message || `주문에 실패했습니다 (status=${res.status})`);
        return;
      }

      onOrderComplete?.(data.order);
    } catch {
      setSubmitError("주문 처리 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  // '결제하기' 클릭 — 카드 결제(실제 동작) → 성공 시 주문 생성
  const handlePlaceOrder = async () => {
    setSubmitError("");
    setPaymentError("");

    if (!validateShipping()) return;
    if (items.length === 0) return;

    // 무통장입금/카카오페이는 연출용 — 실제 결제는 카드만 동작(준비중 안내)
    if (paymentMethod !== "card") {
      setPaymentError("선택하신 결제수단은 준비 중입니다. 신용카드로 결제해 주세요.");
      return;
    }

    // 카드 입력 클라이언트 검증(형식만; 승인 여부는 서버가 결정론적으로 판정)
    const normalizedCard = cardNumber.replace(/\D/g, "");
    if (normalizedCard.length < 12) {
      setPaymentError("카드번호를 정확히 입력해 주세요");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      setPaymentError("유효기간을 MM/YY 형식으로 입력해 주세요");
      return;
    }
    if (cardCvc.length < 3) {
      setPaymentError("CVC를 정확히 입력해 주세요");
      return;
    }

    // (a) 결제 요청 — 금액은 최종 결제 금액(finalAmount). 서버는 결제금액==주문금액을 검증한다.
    //     테스트 카드 뒤 4자리로 결과 재현 가능:
    //       0000 승인 / 0001 카드거절(402) / 0002 한도초과(402) / 9999 게이트웨이 타임아웃(504)
    let paymentKey = "";
    setIsPaying(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          cardNumber,
          cardExpiry,
          cardCvc,
          amount: finalAmount,
          orderName: items[0]?.name
            ? `${items[0].name}${items.length > 1 ? ` 외 ${items.length - 1}건` : ""}`
            : "미니커머스 주문",
        }),
      });
      const data = await res.json().catch(() => ({}));

      // (b) 결제 실패(402/504/500 등) — 응답 message 를 그대로 payment-error 에 노출, 주문 미생성
      if (res.status !== 201 || data.status !== "DONE" || !data.paymentKey) {
        setPaymentError(data.message || `결제에 실패했습니다 (status=${res.status})`);
        return;
      }
      paymentKey = data.paymentKey;
    } catch {
      // 외부 PG 목킹 대비: 네트워크 자체가 실패해도 멈춘다(무한 로딩 금지)
      setPaymentError("결제 요청 중 오류가 발생했습니다");
      return;
    } finally {
      setIsPaying(false);
    }

    // (c) 결제 승인(DONE) — 받은 paymentKey 로 주문 생성
    await submitOrder(paymentKey);
  };

  const styleBlock = (
    <style>{`
      .checkout-page {
        min-height: 100vh;
        background-color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #1a1a1a;
        line-height: 1.5;
      }
      .checkout-header {
        background-color: #ffffff;
        border-bottom: 1px solid #e5e5e5;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .checkout-header-content {
        max-width: 1024px;
        margin: 0 auto;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .checkout-back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        border: none;
        background: none;
        color: #1a1a1a;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      .checkout-back-btn:hover { background-color: #f5f5f5; }
      .checkout-title { font-size: 1.25rem; font-weight: 700; margin: 0; }
      .checkout-container {
        max-width: 1024px;
        margin: 0 auto;
        padding: 24px 16px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      @media (min-width: 768px) {
        .checkout-container {
          flex-direction: row;
          align-items: flex-start;
          gap: 24px;
        }
      }
      .checkout-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
        min-width: 0;
      }
      .checkout-card {
        background-color: #ffffff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      .checkout-card-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0 0 16px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e5e5e5;
      }
      .checkout-item-row {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      .checkout-item-row:last-child { border-bottom: none; }
      .checkout-item-image {
        width: 64px;
        height: 64px;
        border-radius: 8px;
        object-fit: cover;
        background-color: #f5f5f5;
        flex-shrink: 0;
      }
      .checkout-item-info { flex: 1; min-width: 0; }
      .checkout-item-name {
        font-size: 0.9375rem;
        font-weight: 500;
        margin: 0 0 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .checkout-item-meta { font-size: 0.8125rem; color: #666666; margin: 0; }
      .checkout-item-price {
        font-size: 0.9375rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .checkout-field { margin-bottom: 14px; }
      .checkout-field:last-child { margin-bottom: 0; }
      .checkout-label {
        display: block;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #374151;
        margin-bottom: 6px;
      }
      .checkout-label .optional { font-weight: 400; color: #9ca3af; }
      .checkout-input {
        width: 100%;
        padding: 11px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.9375rem;
        box-sizing: border-box;
        background-color: #ffffff;
        color: #1a1a1a;
      }
      .checkout-input:focus {
        outline: none;
        border-color: #1a1a1a;
        box-shadow: 0 0 0 2px rgba(26, 26, 26, 0.08);
      }
      .checkout-input.has-error { border-color: #e53e3e; }
      .checkout-field-error {
        margin: 6px 0 0;
        font-size: 0.8125rem;
        color: #e53e3e;
      }
      .coupon-row { display: flex; gap: 8px; }
      .coupon-row .checkout-input { flex: 1; }
      .coupon-apply-btn {
        padding: 0 18px;
        border: 1px solid #1a1a1a;
        border-radius: 8px;
        background-color: #ffffff;
        color: #1a1a1a;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
      }
      .coupon-apply-btn:hover:not(:disabled) { background-color: #1a1a1a; color: #ffffff; }
      .coupon-apply-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .coupon-message { margin: 10px 0 0; font-size: 0.875rem; }
      .coupon-message.success { color: #16a34a; }
      .coupon-message.error { color: #e53e3e; }
      .coupon-applied-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 10px;
        padding: 10px 12px;
        background-color: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        font-size: 0.875rem;
      }
      .coupon-remove-btn {
        border: none;
        background: none;
        color: #6b7280;
        font-size: 0.8125rem;
        cursor: pointer;
        text-decoration: underline;
        padding: 2px 4px;
      }
      .coupon-remove-btn:hover { color: #e53e3e; }
      .payment-options { display: flex; flex-direction: column; gap: 10px; }
      .payment-option {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        cursor: pointer;
        transition: border-color 0.2s ease, background-color 0.2s ease;
        font-size: 0.9375rem;
      }
      .payment-option.selected {
        border-color: #1a1a1a;
        background-color: #f8fafc;
        font-weight: 600;
      }
      .payment-option input { width: 18px; height: 18px; cursor: pointer; accent-color: #1a1a1a; }
      .card-form {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px dashed #e5e5e5;
      }
      .card-form-row { display: flex; gap: 10px; }
      .card-form-row .checkout-field { flex: 1; margin-bottom: 0; }
      .payment-method-notice {
        margin-top: 14px;
        padding: 12px 14px;
        background-color: #f8fafc;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        color: #6b7280;
        font-size: 0.875rem;
      }
      .payment-processing-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 14px;
        padding: 12px 14px;
        background-color: #f8fafc;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        color: #374151;
        font-size: 0.875rem;
      }
      .payment-processing-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid #d1d5db;
        border-top-color: #1a1a1a;
        border-radius: 50%;
        animation: checkout-spin 0.8s linear infinite;
        flex-shrink: 0;
      }
      .payment-error-box {
        margin-top: 14px;
        padding: 12px 14px;
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #dc2626;
        font-size: 0.875rem;
      }
      .test-card-guide {
        margin-top: 16px;
        border: 1px solid #e5e5e5;
        border-radius: 8px;
        overflow: hidden;
      }
      .test-card-guide-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border: none;
        background-color: #f8fafc;
        color: #374151;
        font-size: 0.8125rem;
        font-weight: 600;
        cursor: pointer;
        text-align: left;
      }
      .test-card-guide-toggle:hover { background-color: #f1f5f9; }
      .test-card-guide-caret { color: #9ca3af; font-size: 0.75rem; }
      .test-card-guide-body { padding: 14px; }
      .test-card-guide-desc { margin: 0 0 10px; font-size: 0.8125rem; color: #6b7280; }
      .test-card-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
      .test-card-table th,
      .test-card-table td {
        text-align: left;
        padding: 8px 10px;
        border-bottom: 1px solid #f1f5f9;
      }
      .test-card-table th { color: #374151; font-weight: 600; background-color: #f8fafc; }
      .test-card-table td:first-child { font-family: monospace; color: #1a1a1a; }
      .agree-terms-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        font-size: 0.875rem;
        color: #374151;
        cursor: pointer;
      }
      .agree-terms-row input {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: #1a1a1a;
        margin-top: 1px;
        flex-shrink: 0;
      }
      .checkout-summary {
        width: 100%;
        flex-shrink: 0;
        background-color: #ffffff;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        box-sizing: border-box;
      }
      @media (min-width: 768px) {
        .checkout-summary { width: 320px; position: sticky; top: 88px; }
      }
      .summary-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin: 0 0 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e5e5e5;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 0.9375rem;
      }
      .summary-row .label { color: #666666; }
      .summary-row .value { font-weight: 500; }
      .summary-row .value.discount { color: #e53e3e; }
      .summary-divider { height: 1px; background-color: #e5e5e5; margin: 16px 0; }
      .summary-final-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .summary-final-label { font-size: 1rem; font-weight: 600; }
      .summary-final-value { font-size: 1.5rem; font-weight: 700; color: #e53e3e; }
      .place-order-btn {
        width: 100%;
        padding: 16px;
        background-color: #1a1a1a;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      .place-order-btn:hover:not(:disabled) { background-color: #333333; }
      .place-order-btn:disabled { background-color: #cccccc; cursor: not-allowed; }
      .checkout-error-box {
        margin-top: 14px;
        padding: 12px 14px;
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #dc2626;
        font-size: 0.875rem;
      }
      .checkout-empty-card {
        background-color: #ffffff;
        border-radius: 12px;
        padding: 60px 24px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        max-width: 520px;
        margin: 40px auto;
      }
      .checkout-empty-text { font-size: 1rem; color: #666666; margin: 0; }
      .checkout-go-home-btn {
        display: inline-flex;
        align-items: center;
        padding: 12px 28px;
        background-color: #1a1a1a;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      .checkout-go-home-btn:hover { background-color: #333333; }
      @keyframes checkout-spin { to { transform: rotate(360deg); } }
    `}</style>
  );

  const header = (
    <header className="checkout-header">
      <div className="checkout-header-content">
        <button
          type="button"
          id="checkout-back-btn"
          className="checkout-back-btn"
          data-testid="checkout-back-btn"
          aria-label="이전 페이지로 돌아가기"
          onClick={onBack}
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="checkout-title">주문/결제</h1>
      </div>
    </header>
  );

  // 로딩 중
  if (isLoading) {
    return (
      <>
        {styleBlock}
        <main id="checkout-page" className="checkout-page">
          {header}
          <div
            data-testid="loading-spinner"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "50vh",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                border: "4px solid #e5e7eb",
                borderTopColor: "#1a1a1a",
                borderRadius: "50%",
                animation: "checkout-spin 1s linear infinite",
              }}
            />
            <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>주문 정보를 불러오는 중...</p>
          </div>
        </main>
      </>
    );
  }

  // 주문할 상품이 없는 경우
  if (items.length === 0) {
    return (
      <>
        {styleBlock}
        <main id="checkout-page" className="checkout-page">
          {header}
          <div className="checkout-empty-card" data-testid="checkout-empty">
            <p className="checkout-empty-text">주문할 상품이 없습니다</p>
            <button
              type="button"
              id="checkout-go-home-btn"
              className="checkout-go-home-btn"
              data-testid="checkout-go-home-btn"
              onClick={onBack}
            >
              홈으로
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {styleBlock}
      <main id="checkout-page" className="checkout-page">
        {header}

        <div className="checkout-container">
          <div className="checkout-main">
            {/* (a) 주문 상품 목록 */}
            <section
              id="checkout-items-section"
              className="checkout-card"
              aria-label="주문 상품 목록"
              data-testid="checkout-items-section"
            >
              <h2 className="checkout-card-title">
                주문 상품 ({items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0)}개)
              </h2>
              {items.map((item) => (
                <article
                  key={item.productId}
                  className="checkout-item-row"
                  data-testid={`checkout-item-${item.productId}`}
                >
                  <img
                    src={item.imageUrl || "/placeholder.svg"}
                    alt={item.name}
                    className="checkout-item-image"
                  />
                  <div className="checkout-item-info">
                    <p className="checkout-item-name">{item.name}</p>
                    <p className="checkout-item-meta">
                      {formatPrice(item.price)}원 · {Number(item.quantity) || 1}개
                    </p>
                  </div>
                  <span className="checkout-item-price">
                    {formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}원
                  </span>
                </article>
              ))}
            </section>

            {/* (b) 배송지 입력 */}
            <section
              id="checkout-shipping-section"
              className="checkout-card"
              aria-label="배송지 입력"
              data-testid="checkout-shipping-section"
            >
              <h2 className="checkout-card-title">배송지 정보</h2>

              <div className="checkout-field">
                <label className="checkout-label" htmlFor="checkout-name">
                  받는 분
                </label>
                <input
                  type="text"
                  id="checkout-name"
                  data-testid="checkout-name"
                  className={`checkout-input${fieldErrors.name ? " has-error" : ""}`}
                  placeholder="이름을 입력하세요"
                  value={shipName}
                  onChange={(e) => setShipName(e.target.value)}
                  aria-invalid={!!fieldErrors.name}
                  aria-required="true"
                />
                {fieldErrors.name && (
                  <p className="checkout-field-error" data-testid="checkout-name-error" role="alert">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              <div className="checkout-field">
                <label className="checkout-label" htmlFor="checkout-phone">
                  휴대폰 번호
                </label>
                <input
                  type="tel"
                  id="checkout-phone"
                  data-testid="checkout-phone"
                  className={`checkout-input${fieldErrors.phone ? " has-error" : ""}`}
                  placeholder="010-1234-5678"
                  value={shipPhone}
                  onChange={(e) => setShipPhone(e.target.value)}
                  aria-invalid={!!fieldErrors.phone}
                  aria-required="true"
                />
                {fieldErrors.phone && (
                  <p className="checkout-field-error" data-testid="checkout-phone-error" role="alert">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              <div className="checkout-field">
                <label className="checkout-label" htmlFor="checkout-address">
                  배송지 주소
                </label>
                <input
                  type="text"
                  id="checkout-address"
                  data-testid="checkout-address"
                  className={`checkout-input${fieldErrors.address ? " has-error" : ""}`}
                  placeholder="주소를 입력하세요"
                  value={shipAddress}
                  onChange={(e) => setShipAddress(e.target.value)}
                  aria-invalid={!!fieldErrors.address}
                  aria-required="true"
                />
                {fieldErrors.address && (
                  <p className="checkout-field-error" data-testid="checkout-address-error" role="alert">
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              <div className="checkout-field">
                <label className="checkout-label" htmlFor="checkout-memo">
                  배송 메모 <span className="optional">(선택)</span>
                </label>
                <input
                  type="text"
                  id="checkout-memo"
                  data-testid="checkout-memo"
                  className="checkout-input"
                  placeholder="예: 문 앞에 놓아주세요"
                  value={shipMemo}
                  onChange={(e) => setShipMemo(e.target.value)}
                />
              </div>
            </section>

            {/* (c) 쿠폰 */}
            <section
              id="checkout-coupon-section"
              className="checkout-card"
              aria-label="쿠폰 적용"
              data-testid="checkout-coupon-section"
            >
              <h2 className="checkout-card-title">쿠폰</h2>
              <div className="coupon-row">
                <input
                  type="text"
                  id="coupon-code"
                  data-testid="coupon-code"
                  className="checkout-input"
                  placeholder="쿠폰 코드를 입력하세요"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  disabled={!!appliedCoupon}
                  aria-label="쿠폰 코드"
                />
                <button
                  type="button"
                  id="coupon-apply-btn"
                  className="coupon-apply-btn"
                  data-testid="coupon-apply-btn"
                  onClick={handleApplyCoupon}
                  disabled={isApplyingCoupon || !!appliedCoupon}
                  aria-label="쿠폰 적용"
                >
                  {isApplyingCoupon ? "확인 중..." : "적용"}
                </button>
              </div>

              {couponMessage && (
                <p
                  id="coupon-message"
                  className={`coupon-message ${couponMessage.type}`}
                  data-testid="coupon-message"
                  role={couponMessage.type === "success" ? "status" : "alert"}
                >
                  {couponMessage.text}
                </p>
              )}

              {appliedCoupon && (
                <div className="coupon-applied-row" data-testid="coupon-applied">
                  <span>
                    적용된 쿠폰: <strong>{appliedCoupon.code}</strong> (-{formatPrice(discount)}원)
                  </span>
                  <button
                    type="button"
                    id="coupon-remove-btn"
                    className="coupon-remove-btn"
                    data-testid="coupon-remove-btn"
                    onClick={handleRemoveCoupon}
                    aria-label="쿠폰 적용 취소"
                  >
                    쿠폰 취소
                  </button>
                </div>
              )}
            </section>

            {/* (d) 결제수단 */}
            <section
              id="checkout-payment-section"
              className="checkout-card"
              aria-label="결제수단 선택"
              data-testid="checkout-payment-section"
            >
              <h2 className="checkout-card-title">결제수단</h2>
              <div className="payment-options" role="radiogroup" aria-label="결제수단">
                <label
                  className={`payment-option${paymentMethod === "card" ? " selected" : ""}`}
                  htmlFor="payment-card"
                >
                  <input
                    type="radio"
                    id="payment-card"
                    data-testid="payment-card"
                    name="payment-method"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                  />
                  신용카드
                </label>
                <label
                  className={`payment-option${paymentMethod === "bank" ? " selected" : ""}`}
                  htmlFor="payment-bank"
                >
                  <input
                    type="radio"
                    id="payment-bank"
                    data-testid="payment-bank"
                    name="payment-method"
                    value="bank"
                    checked={paymentMethod === "bank"}
                    onChange={() => setPaymentMethod("bank")}
                  />
                  무통장입금
                </label>
                <label
                  className={`payment-option${paymentMethod === "kakao" ? " selected" : ""}`}
                  htmlFor="payment-kakao"
                >
                  <input
                    type="radio"
                    id="payment-kakao"
                    data-testid="payment-kakao"
                    name="payment-method"
                    value="kakao"
                    checked={paymentMethod === "kakao"}
                    onChange={() => setPaymentMethod("kakao")}
                  />
                  카카오페이
                </label>
              </div>

              {/* 신용카드 선택 시 카드 입력 폼 노출 (무통장/카카오는 준비중 안내) */}
              {paymentMethod === "card" ? (
                <div id="card-form" className="card-form" data-testid="card-form">
                  <div className="checkout-field">
                    <label className="checkout-label" htmlFor="card-number">
                      카드번호
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      id="card-number"
                      data-testid="card-number-input"
                      className="checkout-input"
                      placeholder="0000-0000-0000-0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      autoComplete="cc-number"
                      aria-label="카드번호"
                    />
                  </div>
                  <div className="card-form-row">
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="card-expiry">
                        유효기간
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        id="card-expiry"
                        data-testid="card-expiry-input"
                        className="checkout-input"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatCardExpiry(e.target.value))}
                        autoComplete="cc-exp"
                        aria-label="카드 유효기간"
                      />
                    </div>
                    <div className="checkout-field">
                      <label className="checkout-label" htmlFor="card-cvc">
                        CVC
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        id="card-cvc"
                        data-testid="card-cvc-input"
                        className="checkout-input"
                        placeholder="000"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(formatCardCvc(e.target.value))}
                        autoComplete="cc-csc"
                        aria-label="카드 CVC"
                      />
                    </div>
                  </div>

                  {/* 접을 수 있는 테스트 카드 안내 (연습용 힌트) */}
                  <div id="test-card-guide" className="test-card-guide" data-testid="test-card-guide">
                    <button
                      type="button"
                      id="test-card-guide-toggle"
                      className="test-card-guide-toggle"
                      data-testid="test-card-guide-toggle"
                      onClick={() => setShowTestCardGuide((v) => !v)}
                      aria-expanded={showTestCardGuide}
                      aria-controls="test-card-guide-body"
                    >
                      <span>테스트 카드 안내 (QA 연습용)</span>
                      <span className="test-card-guide-caret" aria-hidden="true">
                        {showTestCardGuide ? "▲" : "▼"}
                      </span>
                    </button>
                    {showTestCardGuide && (
                      <div
                        id="test-card-guide-body"
                        className="test-card-guide-body"
                        data-testid="test-card-guide-body"
                      >
                        <p className="test-card-guide-desc">
                          카드번호 <strong>끝 4자리</strong>로 결제 결과가 결정됩니다. 앞자리는 임의의 숫자로
                          채우세요 (예: 4111-1111-1111-0001).
                        </p>
                        <table className="test-card-table">
                          <thead>
                            <tr>
                              <th>끝 4자리</th>
                              <th>결과</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr data-testid="test-card-row-0000">
                              <td>0000</td>
                              <td>승인 (결제 성공)</td>
                            </tr>
                            <tr data-testid="test-card-row-0001">
                              <td>0001</td>
                              <td>카드 거절 (402)</td>
                            </tr>
                            <tr data-testid="test-card-row-0002">
                              <td>0002</td>
                              <td>한도 초과 (402)</td>
                            </tr>
                            <tr data-testid="test-card-row-9999">
                              <td>9999</td>
                              <td>게이트웨이 타임아웃 (504)</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  id="payment-method-notice"
                  className="payment-method-notice"
                  data-testid="payment-method-notice"
                  role="status"
                >
                  {paymentMethod === "bank"
                    ? "무통장입금은 준비 중입니다. 현재는 신용카드 결제만 이용할 수 있습니다."
                    : "카카오페이는 준비 중입니다. 현재는 신용카드 결제만 이용할 수 있습니다."}
                </div>
              )}
            </section>

            {/* (e) 약관 동의 */}
            <section
              id="checkout-terms-section"
              className="checkout-card"
              aria-label="약관 동의"
              data-testid="checkout-terms-section"
            >
              <label className="agree-terms-row" htmlFor="agree-terms">
                <input
                  type="checkbox"
                  id="agree-terms"
                  data-testid="agree-terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  aria-label="구매 조건 및 결제 진행 동의"
                />
                <span>주문 내용을 확인하였으며, 구매 조건 및 결제 진행에 동의합니다. (필수)</span>
              </label>
            </section>
          </div>

          {/* (f) 결제 요약 */}
          <aside className="checkout-summary" aria-label="결제 요약" data-testid="checkout-summary">
            <h2 className="summary-title">결제 금액</h2>

            <div className="summary-row">
              <span className="label">상품 금액</span>
              <span className="value" data-testid="checkout-subtotal">
                {formatPrice(subtotal)}원
              </span>
            </div>

            <div className="summary-row">
              <span className="label">쿠폰 할인</span>
              <span className="value discount" data-testid="checkout-discount">
                -{formatPrice(discount)}원
              </span>
            </div>

            <div className="summary-row">
              <span className="label">배송비</span>
              <span className="value">무료</span>
            </div>

            <div className="summary-divider" />

            <div className="summary-final-row">
              <span className="summary-final-label">최종 결제 금액</span>
              <span className="summary-final-value" data-testid="checkout-final">
                {formatPrice(finalAmount)}원
              </span>
            </div>

            <button
              type="button"
              id="place-order-btn"
              className="place-order-btn"
              data-testid="place-order-btn"
              onClick={handlePlaceOrder}
              disabled={!agreed || isPaying || isSubmitting}
              aria-label="결제하기"
              aria-busy={isPaying || isSubmitting}
              aria-disabled={!agreed || isPaying || isSubmitting}
            >
              {isPaying
                ? "결제 승인 중..."
                : isSubmitting
                  ? "주문 처리 중..."
                  : `${formatPrice(finalAmount)}원 결제하기`}
            </button>

            {/* (a) 결제 진행 중 표시 (스피너 포함) */}
            {isPaying && (
              <div
                id="payment-processing"
                className="payment-processing-row"
                data-testid="payment-processing"
                role="status"
                aria-live="polite"
              >
                <span
                  className="payment-processing-spinner"
                  data-testid="loading-spinner"
                  aria-hidden="true"
                />
                <span>결제를 진행하고 있습니다...</span>
              </div>
            )}

            {/* (b)(5) 결제 실패 / 네트워크 오류 표면화 (주문은 생성되지 않음) */}
            {paymentError && (
              <div
                id="payment-error"
                className="payment-error-box"
                data-testid="payment-error"
                role="alert"
              >
                {paymentError}
              </div>
            )}

            {/* 주문 생성 단계 실패 (결제 검증 실패 포함) */}
            {submitError && (
              <div id="checkout-error" className="checkout-error-box" data-testid="checkout-error" role="alert">
                {submitError}
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
