"use client";

import React from "react";

export default function OrderCompletePage({ onRestart }) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>주문 완료</h1>
        <p style={styles.desc}>주문이 정상적으로 완료되었습니다.</p>

        <button
          type="button"
          id="restart-btn"
          style={styles.btn}
          onClick={onRestart}
          aria-label="다시 시작"
        >
          다시 시작
        </button>
      </div>
    </div>
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
};
