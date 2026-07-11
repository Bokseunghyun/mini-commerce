"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 이니시스 리다이렉트 복귀 완료 페이지 (/payment-inicis-complete)
 *
 * 이니시스가 전체 페이지를 리다이렉트하면 체크아웃의 React 상태가 사라진다.
 * → 결제 전에 sessionStorage('mc_inicis_ctx')에 보존해 둔 주문 컨텍스트
 *   (items/couponCode/shipping)와 URL의 paymentKey로 여기서 주문을 생성한다.
 *
 * props:
 * - apiBase
 * - onOrderComplete(order): 주문 생성 성공
 * - onCancel(): 취소/실패 → 체크아웃으로 복귀
 */
export default function InicisCompletePage({ apiBase, onOrderComplete, onCancel }) {
  const API_BASE = apiBase || "";
  const [message, setMessage] = useState("결제 결과를 확인하고 있습니다...");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return; // StrictMode 중복 실행 방지
    done.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("status");
      const paymentKey = params.get("paymentKey");

      let ctx = null;
      try {
        ctx = JSON.parse(sessionStorage.getItem("mc_inicis_ctx") || "null");
      } catch {
        ctx = null;
      }
      sessionStorage.removeItem("mc_inicis_ctx");

      if (status !== "success" || !paymentKey) {
        setMessage("결제가 취소되었습니다. 주문 페이지로 돌아갑니다...");
        setTimeout(() => onCancel?.(), 1200);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const body = { action: "order", paymentKey };
        if (ctx?.shipping) body.shipping = ctx.shipping;
        if (ctx?.couponCode) body.couponCode = ctx.couponCode;
        if (Array.isArray(ctx?.items) && ctx.items.length) body.items = ctx.items;
        // ctx.items 가 null 이면 items 생략 → 서버 장바구니 전체 주문

        const res = await fetch(`${API_BASE}/api/user-actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status !== 201) {
          setMessage(data.message || `주문 생성 실패 (${res.status}). 주문 페이지로 돌아갑니다...`);
          setTimeout(() => onCancel?.(), 1600);
          return;
        }

        // 선택 항목만 주문한 경우 장바구니에서 제거 (best-effort)
        if (Array.isArray(ctx?.items) && ctx.items.length) {
          for (const it of ctx.items) {
            try {
              await fetch(`${API_BASE}/api/user-actions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
                body: JSON.stringify({ action: "cart_remove", productId: it.id }),
              });
            } catch {
              /* 무시 */
            }
          }
        }

        setMessage("결제가 완료되었습니다. 주문 완료 페이지로 이동합니다...");
        onOrderComplete?.(data.order);
      } catch {
        setMessage("주문 처리 중 오류가 발생했습니다. 주문 페이지로 돌아갑니다...");
        setTimeout(() => onCancel?.(), 1600);
      }
    })();
  }, [API_BASE, onOrderComplete, onCancel]);

  return (
    <main
      id="inicis-complete-page"
      data-testid="inicis-complete"
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`@keyframes inicis-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        data-testid="loading-spinner"
        style={{
          width: "48px",
          height: "48px",
          border: "4px solid #e5e7eb",
          borderTopColor: "#1a1a1a",
          borderRadius: "50%",
          animation: "inicis-spin 1s linear infinite",
        }}
      />
      <p style={{ color: "#374151", fontSize: "14px", margin: 0 }} data-testid="inicis-complete-message">
        {message}
      </p>
    </main>
  );
}
