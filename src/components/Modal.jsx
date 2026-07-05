import { useEffect, useRef } from "react";

// ============================================
// 재사용 모달 (다이얼로그)
// - 백드롭 클릭 / ESC 로 닫힘, 열려 있는 동안 body 스크롤 잠금
// - role="dialog" aria-modal, 열릴 때 포커스 이동 + Tab 포커스 트랩
// - 반응형: 데스크톱은 중앙 카드(max 480px), 모바일은 거의 전체폭 + 세로 스크롤
//   (QA 자동화 타깃: data-testid, aria 속성, 백드롭/ESC 닫힘, 포커스 트랩)
// ============================================
export default function Modal({
  open,
  onClose,
  title,
  children,
  testid = "modal",
  labelId = "modal-title",
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement;

    // body 스크롤 잠금
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 열릴 때 첫 포커스: 패널 내 첫 입력요소 → 없으면 패널
    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelector(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      (focusable || panel).focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      // 포커스 트랩
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = panel.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      // 닫힐 때 원래 포커스 복원
      if (previouslyFocused.current && previouslyFocused.current.focus) {
        try { previouslyFocused.current.focus(); } catch { /* noop */ }
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      data-testid={`${testid}-backdrop`}
      onMouseDown={(e) => {
        // 백드롭(패널 바깥) 클릭 시에만 닫는다
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={styles.backdrop}
    >
      <div
        className="modal-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? labelId : undefined}
        data-testid={testid}
        tabIndex={-1}
        style={styles.panel}
      >
        <div style={styles.header} className="modal-header">
          {title ? (
            <h2 id={labelId} style={styles.title} className="modal-title">{title}</h2>
          ) : <span />}
          <button
            type="button"
            className="modal-close"
            data-testid={`${testid}-close`}
            aria-label="닫기"
            onClick={onClose}
            style={styles.closeBtn}
          >
            ✕
          </button>
        </div>
        <div style={styles.body} className="modal-body">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-pop-in { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
        .modal-close:hover { background: #f3f4f6 !important; color: #111827 !important; }
        .modal-close:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
        @media (max-width: 640px) {
          .modal-backdrop { align-items: flex-end !important; padding: 0 !important; }
          .modal-panel {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 92vh !important;
            border-radius: 16px 16px 0 0 !important;
            animation: modal-sheet-in .2s ease-out !important;
          }
        }
        @keyframes modal-sheet-in { from { transform: translateY(100%); } to { transform: none; } }
      `}</style>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    zIndex: 1000,
    animation: "modal-fade-in .15s ease-out",
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 20px 60px rgba(0,0,0,.25)",
    width: "min(94vw, 480px)",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    outline: "none",
    animation: "modal-pop-in .18s ease-out",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 8px 20px",
    flexShrink: 0,
  },
  title: {
    fontSize: "18px",
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  closeBtn: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    background: "transparent",
    color: "#6b7280",
    fontSize: "16px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color .15s, color .15s",
    flexShrink: 0,
  },
  body: {
    padding: "4px 20px 20px 20px",
    overflowY: "auto",
  },
};
