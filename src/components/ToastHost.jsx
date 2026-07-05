import { useEffect, useState } from "react";
import { subscribeToasts, dismiss } from "../lib/toast.js";

// ============================================
// 토스트 표시 호스트 (앱에 1회 마운트)
// - 우상단 스택(모바일은 상단 전체폭), 클릭/✕ 로 닫기, 자동 소멸은 스토어가 처리
// - QA 타깃: [data-testid="toast"], data-type, role=alert/status, aria-live
// ============================================
export default function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      className="toast-host"
      data-testid="toast-host"
      role="region"
      aria-label="알림"
      style={styles.host}
    >
      <style>{`
        @keyframes toast-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
        .toast-item:hover { filter: brightness(0.97); }
        @media (max-width: 640px) {
          .toast-host { left: 12px !important; right: 12px !important; top: 12px !important; align-items: stretch !important; }
          .toast-item { max-width: 100% !important; }
        }
      `}</style>
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast-item toast-${t.type}`}
          data-testid="toast"
          data-type={t.type}
          role={t.type === "error" ? "alert" : "status"}
          aria-live={t.type === "error" ? "assertive" : "polite"}
          onClick={() => dismiss(t.id)}
          style={{ ...styles.toast, ...(styles[t.type] || styles.info) }}
        >
          <span style={styles.icon} aria-hidden="true">
            {t.type === "success" ? "✓" : t.type === "error" ? "!" : "i"}
          </span>
          <span style={styles.msg}>{t.message}</span>
          <button
            type="button"
            aria-label="알림 닫기"
            data-testid="toast-close"
            onClick={(e) => {
              e.stopPropagation();
              dismiss(t.id);
            }}
            style={styles.close}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

const styles = {
  host: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 2000,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "flex-end",
    pointerEvents: "none",
  },
  toast: {
    pointerEvents: "auto",
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    minWidth: "240px",
    maxWidth: "360px",
    padding: "12px 14px",
    borderRadius: "10px",
    boxShadow: "0 8px 24px rgba(0,0,0,.18)",
    color: "#ffffff",
    fontSize: "14px",
    lineHeight: 1.45,
    cursor: "pointer",
    animation: "toast-in .18s ease-out",
    whiteSpace: "pre-line",
  },
  success: { backgroundColor: "#16a34a" },
  error: { backgroundColor: "#dc2626" },
  info: { backgroundColor: "#374151" },
  icon: {
    flexShrink: 0,
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,.25)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: "13px",
  },
  msg: { flex: 1, wordBreak: "break-word" },
  close: {
    flexShrink: 0,
    background: "none",
    border: "none",
    color: "rgba(255,255,255,.85)",
    fontSize: "13px",
    cursor: "pointer",
    padding: "0 2px",
    lineHeight: 1,
  },
};
