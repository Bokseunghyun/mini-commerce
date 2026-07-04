"use client";

import React from "react";

function formatPrice(price) {
  return (Number(price) || 0).toLocaleString("ko-KR");
}

export default function OrderCompletePage({ order, onGoOrders, onRestart }) {
  const discount = Number(order?.discount) || 0;

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .order-complete-card {
            padding: 24px 20px !important;
            max-width: 90vw !important;
          }
          .order-complete-title {
            font-size: 24px !important;
          }
          .order-complete-desc {
            font-size: 14px !important;
          }
        }
        @media (max-width: 480px) {
          .order-complete-card {
            padding: 20px 16px !important;
          }
          .order-complete-title {
            font-size: 20px !important;
          }
        }
      `}</style>
      <div style={styles.page}>
        <div style={styles.card} className="order-complete-card" data-testid="order-complete-card">
          <h1 style={styles.title} className="order-complete-title">주문 완료</h1>
          <p style={styles.desc} className="order-complete-desc">주문이 정상적으로 완료되었습니다.</p>

          {order && (
            <div
              style={styles.infoBox}
              className="order-complete-info"
              data-testid="order-complete-info"
              role="status"
            >
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>주문번호</span>
                <span
                  style={styles.infoValue}
                  id="order-complete-id"
                  className="order-complete-id"
                  data-testid="order-complete-id"
                >
                  {order.id}
                </span>
              </div>

              {discount > 0 && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>할인 금액</span>
                  <span
                    style={{ ...styles.infoValue, color: "#e53e3e" }}
                    id="order-complete-discount"
                    className="order-complete-discount"
                    data-testid="order-complete-discount"
                  >
                    -{formatPrice(discount)}원
                  </span>
                </div>
              )}

              <div style={{ ...styles.infoRow, borderBottom: "none", marginBottom: 0 }}>
                <span style={styles.infoLabel}>결제금액</span>
                <span
                  style={{ ...styles.infoValue, fontSize: 18, fontWeight: 800 }}
                  id="order-complete-amount"
                  className="order-complete-amount"
                  data-testid="order-complete-amount"
                >
                  {formatPrice(order.finalPrice)}원
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            id="go-orders-btn"
            className="go-orders-btn"
            style={styles.btn}
            onClick={onGoOrders}
            aria-label="주문내역 보기"
            data-testid="go-orders-btn"
          >
            주문내역 보기
          </button>

          <button
            type="button"
            id="restart-btn"
            className="restart-btn"
            style={styles.btnSecondary}
            onClick={onRestart}
            aria-label="다시 시작"
            data-testid="restart-btn"
          >
            다시 시작
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f5",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 14,
    padding: "36px 28px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
    textAlign: "center",
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
  },
  desc: {
    marginTop: 12,
    marginBottom: 24,
    color: "#6b7280",
    fontSize: 15,
    lineHeight: 1.6,
  },
  infoBox: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "16px 18px",
    marginBottom: 24,
    textAlign: "left",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid #e5e7eb",
  },
  infoLabel: {
    color: "#6b7280",
    fontSize: 14,
  },
  infoValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: 600,
  },
  btn: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: "#111827",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
  },
  btnSecondary: {
    width: "100%",
    marginTop: 10,
    padding: "14px 18px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    cursor: "pointer",
    background: "#fff",
    color: "#111827",
    fontSize: 16,
    fontWeight: 700,
  },
};
