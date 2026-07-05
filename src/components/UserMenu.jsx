import { useEffect, useRef, useState } from "react";

// ============================================
// 계정 메뉴 (아바타/아이콘 → 호버 시 열리는 드롭다운 패널)
// - 로그인/회원가입(비로그인) 또는 내정보/위시리스트/주문내역/로그아웃(로그인)을
//   버튼 나열 대신 하나의 아이콘 아래로 모아 헤더를 정리한다.
// - 마우스 호버로 열리고, 벗어나거나 ESC/바깥 클릭 시 닫힌다.
//   (클릭 열기도 유지 — 터치/키보드 대응)
// - QA 자동화 연습용 타깃: 열림/닫힘 상태, data-testid, aria 속성, 호버/키보드
// ============================================

// 라인 스타일 SVG 아이콘 (이모지 대신 이미지 아이콘 사용)
function Icon({ name }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case "logout":
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case "login":
      return (
        <svg {...common}>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
      );
    case "userplus":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      );
    default:
      return null;
  }
}

// 트리거의 사람 아이콘 (비로그인/이니셜 없음 상태)
function PersonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// 트리거의 아래 방향 셰브런
function Chevron() {
  return (
    <svg
      className="user-menu-caret"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function UserMenu({
  isLoggedIn = false,
  role = "",
  username = "",
  onGoLogin,
  onGoSignup,
  onGoProfile,
  onGoWishlist,
  onGoOrders,
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);

  // 호버가 되는 기기에서만 호버로 연다. 모바일/터치는 호버가 없으므로 탭(클릭)으로 연다.
  const [canHover] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
      : false
  );

  const clearTimers = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  };

  // 약간의 지연을 둬 스쳐 지나가는 호버로 깜빡이는 것을 막는다 (열기 120ms / 닫기 220ms)
  const handleMouseEnter = () => {
    if (!canHover) return;
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), 120);
  };
  const handleMouseLeave = () => {
    if (!canHover) return;
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 220);
  };

  // 언마운트 시 타이머 정리
  useEffect(() => () => clearTimers(), []);

  // 바깥 클릭 / ESC 로 닫기 (호버로 열렸든 클릭으로 열렸든 공통)
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const name = (username || "").trim();
  const initial = name ? name.charAt(0).toUpperCase() : "";

  const run = (fn) => () => {
    clearTimers();
    setOpen(false);
    fn?.();
  };

  const items = isLoggedIn
    ? [
        { key: "profile", label: "내정보", icon: "user", onClick: onGoProfile, testid: "usermenu-profile" },
        { key: "wishlist", label: "위시리스트", icon: "heart", onClick: onGoWishlist, testid: "usermenu-wishlist" },
        { key: "orders", label: "주문내역", icon: "box", onClick: onGoOrders, testid: "usermenu-orders" },
        { key: "logout", label: "로그아웃", icon: "logout", onClick: onLogout, testid: "usermenu-logout", danger: true },
      ]
    : [
        { key: "login", label: "로그인", icon: "login", onClick: onGoLogin, testid: "usermenu-login" },
        { key: "signup", label: "회원가입", icon: "userplus", onClick: onGoSignup, testid: "usermenu-signup" },
      ];

  return (
    <div
      className="user-menu"
      ref={rootRef}
      style={{ position: "relative", flexShrink: 0 }}
      data-testid="user-menu"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <style>{`
        .user-menu-trigger {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 10px 5px 5px;
          background: #ffffff; border: 1px solid #d1d5db; border-radius: 999px;
          cursor: pointer; transition: border-color .2s, box-shadow .2s;
          color: #374151;
        }
        .user-menu-trigger:hover { border-color: #9ca3af; box-shadow: 0 1px 4px rgba(0,0,0,.10); }
        .user-menu-trigger:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
        .user-menu-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: #1a1a1a; color: #fff; font-weight: 700; font-size: 13px;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .user-menu-icon {
          width: 28px; height: 28px; border-radius: 50%; background: #f3f4f6;
          display: inline-flex; align-items: center; justify-content: center; color: #374151;
        }
        .user-menu-caret { color: #6b7280; }
        .user-menu-panel {
          position: absolute; top: calc(100% + 8px); right: 0;
          min-width: 210px; background: #fff; border: 1px solid #e5e7eb;
          border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.14);
          padding: 6px; z-index: 300;
          animation: user-menu-in .12s ease-out;
        }
        /* 트리거와 패널 사이 8px 간격에서 호버가 끊기지 않도록 투명 브릿지 */
        .user-menu-panel::before {
          content: ""; position: absolute; left: 0; right: 0; top: -10px; height: 10px;
        }
        @keyframes user-menu-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: none; }
        }
        .user-menu-head {
          padding: 10px 12px; border-bottom: 1px solid #f1f5f9; margin-bottom: 4px;
        }
        .user-menu-head-name { font-weight: 700; color: #111827; font-size: 14px; word-break: break-all; }
        .user-menu-head-role { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .user-menu-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 10px 12px; background: transparent; border: none; border-radius: 8px;
          font-size: 14px; color: #374151; cursor: pointer; text-align: left;
          transition: background-color .15s;
        }
        .user-menu-item:hover, .user-menu-item:focus-visible { background: #f3f4f6; outline: none; }
        .user-menu-item.danger { color: #dc2626; }
        .user-menu-item.danger:hover, .user-menu-item.danger:focus-visible { background: #fef2f2; }
        .user-menu-item-icon { display: inline-flex; align-items: center; justify-content: center; width: 18px; }
      `}</style>

      <button
        ref={btnRef}
        type="button"
        id="user-menu-trigger"
        className="user-menu-trigger"
        data-testid="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={isLoggedIn ? "계정 메뉴" : "로그인 메뉴"}
        onClick={() => {
          clearTimers();
          setOpen((v) => !v);
        }}
      >
        {isLoggedIn && initial ? (
          <span className="user-menu-avatar" aria-hidden="true">{initial}</span>
        ) : (
          <span className="user-menu-icon"><PersonIcon /></span>
        )}
        <Chevron />
      </button>

      {open && (
        <div
          className="user-menu-panel"
          role="menu"
          aria-label="계정 메뉴"
          data-testid="user-menu-panel"
        >
          {isLoggedIn && (
            <div className="user-menu-head">
              <div className="user-menu-head-name" data-testid="user-menu-username">
                {name || "사용자"}
              </div>
              <div className="user-menu-head-role">
                {role === "ADMIN" ? "관리자 계정" : "일반 회원"}
              </div>
            </div>
          )}
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              className={`user-menu-item${it.danger ? " danger" : ""}`}
              data-testid={it.testid}
              onClick={run(it.onClick)}
            >
              <span className="user-menu-item-icon" aria-hidden="true">
                <Icon name={it.icon} />
              </span>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
