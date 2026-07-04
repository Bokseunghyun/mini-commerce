"use client";

import { useState } from "react";

/**
 * 배송조회 (독립 페이지)
 * - 운송장 번호 입력 → GET /api/tracking?trackingNumber= (공개) 로 배송 타임라인 조회
 * - 실제 커머스의 "배송조회" 화면을 흉내낸 페이지.
 *
 * 이 페이지는 외부 택배 API 목킹 연습의 핵심 대상이다:
 *   - 정상: 200 { trackingNumber, status, events:[{status,label,at,location}] }
 *   - 404 TRACKING_NOT_FOUND → '운송장 번호를 찾을 수 없습니다'
 *   - 네트워크/기타 오류 → 인DOM 에러 표시
 */

function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 배송 상태 5종: 한글 라벨 + 색상
const STATUS_META = {
  PAID: { label: "결제완료", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  PREPARING: { label: "상품준비중", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  SHIPPING: { label: "배송중", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  DELIVERED: { label: "배송완료", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  CANCELED: { label: "취소됨", color: "#9ca3af", bg: "#f3f4f6", border: "#e5e7eb" },
};

function statusMeta(status) {
  return STATUS_META[status] || { label: status || "-", color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" };
}

export default function TrackingPage({ apiBase, onBack }) {
  const API_BASE = apiBase || "";

  const [trackingNumber, setTrackingNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // 조회 결과: { trackingNumber, status, events }
  const [result, setResult] = useState(null);
  // 오류 종류: 'notFound' | 'error' | null
  const [errorKind, setErrorKind] = useState(null);
  const [errorText, setErrorText] = useState("");

  const handleSearch = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();

    const tn = trackingNumber.trim();
    if (!tn) {
      setResult(null);
      setErrorKind("error");
      setErrorText("운송장 번호를 입력해주세요");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setErrorKind(null);
    setErrorText("");

    try {
      const res = await fetch(
        `${API_BASE}/api/tracking?trackingNumber=${encodeURIComponent(tn)}`
      );
      const data = await res.json().catch(() => ({}));

      if (res.status === 404) {
        setErrorKind("notFound");
        return;
      }
      if (!res.ok) {
        setErrorKind("error");
        setErrorText(data.message || `배송 조회 실패 (status=${res.status})`);
        return;
      }

      setResult(data);
    } catch (err) {
      setErrorKind("error");
      setErrorText(`네트워크 오류: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const meta = result ? statusMeta(result.status) : null;
  const events = result?.events || [];

  return (
    <div
      id="tracking-page"
      className="tracking-page"
      style={styles.page}
      data-testid="tracking-page"
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <header
        id="tracking-header"
        className="tracking-header"
        style={styles.header}
        role="banner"
        data-testid="tracking-header"
      >
        <div style={styles.headerInner}>
          <button
            type="button"
            id="tracking-back"
            className="btn btn-ghost tracking-back-button"
            aria-label="뒤로 가기"
            onClick={onBack}
            style={styles.backBtn}
            data-testid="tracking-back"
          >
            ← 뒤로
          </button>
          <h1 style={styles.headerTitle} className="page-title tracking-title">
            배송조회
          </h1>
        </div>
      </header>

      <main style={styles.container} className="tracking-container">
        <p style={styles.intro} className="tracking-intro">
          운송장 번호를 입력하시면 배송 진행 상황을 조회할 수 있습니다.
        </p>

        {/* 검색 폼 */}
        <form
          style={styles.searchForm}
          className="tracking-search-form"
          onSubmit={handleSearch}
          data-testid="tracking-search-form"
        >
          <label htmlFor="tracking-number-input" style={styles.srOnly}>
            운송장 번호
          </label>
          <input
            id="tracking-number-input"
            className="tracking-number-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            placeholder="운송장 번호를 입력하세요 (예: MC0000000001)"
            value={trackingNumber}
            onChange={(ev) => setTrackingNumber(ev.target.value)}
            style={styles.input}
            data-testid="tracking-number-input"
            aria-invalid={errorKind ? true : undefined}
          />
          <button
            type="submit"
            id="tracking-search-btn"
            className="btn btn-primary tracking-search-button"
            aria-label="배송 조회"
            disabled={isLoading}
            style={{
              ...styles.searchBtn,
              ...(isLoading ? styles.searchBtnDisabled : {}),
            }}
            data-testid="tracking-search-btn"
          >
            {isLoading ? "조회 중..." : "조회"}
          </button>
        </form>

        {/* 로딩 */}
        {isLoading && (
          <div
            style={styles.loadingContainer}
            className="tracking-loading"
            data-testid="loading-spinner"
            role="status"
            aria-live="polite"
          >
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>배송 정보를 조회하는 중...</p>
          </div>
        )}

        {/* 404 - 운송장 번호 없음 */}
        {!isLoading && errorKind === "notFound" && (
          <div
            id="tracking-not-found"
            className="tracking-not-found"
            style={styles.notFoundBox}
            data-testid="tracking-not-found"
            role="alert"
          >
            <p style={styles.notFoundTitle}>운송장 번호를 찾을 수 없습니다</p>
            <p style={styles.notFoundText}>
              입력하신 운송장 번호를 다시 확인해주세요.
            </p>
          </div>
        )}

        {/* 네트워크/기타 오류 */}
        {!isLoading && errorKind === "error" && (
          <div
            id="tracking-error"
            className="tracking-error"
            style={styles.errorBox}
            data-testid="tracking-error"
            role="alert"
          >
            {errorText || "배송 조회 중 오류가 발생했습니다"}
          </div>
        )}

        {/* 조회 결과 */}
        {!isLoading && result && (
          <div
            id="tracking-result"
            className="tracking-result"
            style={styles.resultBox}
            data-testid="tracking-result"
          >
            <div style={styles.resultHeader}>
              <div>
                <p style={styles.resultLabel}>운송장 번호</p>
                <p
                  style={styles.resultTrackingNumber}
                  className="tracking-result-number"
                  data-testid="tracking-result-number"
                >
                  {result.trackingNumber || "-"}
                </p>
              </div>
              <span
                id="tracking-status"
                className={`tracking-status status-${(result.status || "").toLowerCase()}`}
                style={{
                  ...styles.statusBadge,
                  color: meta.color,
                  backgroundColor: meta.bg,
                  border: `1px solid ${meta.border}`,
                }}
                data-testid="tracking-status"
                data-status={result.status}
              >
                {meta.label}
              </span>
            </div>

            {events.length === 0 ? (
              <p
                style={styles.timelineEmpty}
                className="tracking-timeline-empty"
                data-testid="tracking-timeline-empty"
                role="status"
              >
                아직 배송 이벤트가 없습니다.
              </p>
            ) : (
              <ol
                style={styles.timeline}
                className="tracking-timeline"
                data-testid="tracking-timeline"
              >
                {events.map((ev, i) => {
                  const isLatest = i === events.length - 1;
                  return (
                    <li
                      key={`track-${i}`}
                      style={styles.timelineRow}
                      className="tracking-event"
                      data-testid={`tracking-event-${i}`}
                      data-status={ev.status}
                    >
                      <span
                        style={{
                          ...styles.timelineDot,
                          ...(isLatest ? styles.timelineDotActive : {}),
                        }}
                      ></span>
                      <div style={styles.timelineBody}>
                        <span
                          style={{
                            ...styles.timelineLabel,
                            ...(isLatest ? styles.timelineLabelActive : {}),
                          }}
                          className="tracking-event-label"
                        >
                          {ev.label}
                        </span>
                        <span style={styles.timelineMeta} className="tracking-event-meta">
                          {formatDate(ev.at)}
                          {ev.location ? ` · ${ev.location}` : ""}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
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
  intro: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0 0 16px",
  },
  searchForm: {
    display: "flex",
    gap: "8px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
    border: 0,
  },
  input: {
    flex: 1,
    minWidth: "200px",
    padding: "12px 16px",
    fontSize: "15px",
    color: "#1f2937",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    boxSizing: "border-box",
  },
  searchBtn: {
    padding: "12px 24px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    whiteSpace: "nowrap",
  },
  searchBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "200px",
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
  notFoundBox: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    padding: "48px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  notFoundTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
  },
  notFoundText: {
    fontSize: "14px",
    color: "#6b7280",
    margin: 0,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "16px",
    color: "#dc2626",
    fontSize: "14px",
  },
  resultBox: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: "16px",
  },
  resultLabel: {
    fontSize: "13px",
    color: "#9ca3af",
    margin: "0 0 4px",
  },
  resultTrackingNumber: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1a1a1a",
    margin: 0,
    fontFamily: "monospace",
  },
  statusBadge: {
    fontSize: "13px",
    fontWeight: "600",
    padding: "6px 12px",
    borderRadius: "16px",
    whiteSpace: "nowrap",
  },
  timeline: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
  },
  timelineRow: {
    display: "flex",
    gap: "12px",
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  timelineDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    backgroundColor: "#d1d5db",
    marginTop: "4px",
    flexShrink: 0,
  },
  timelineDotActive: {
    backgroundColor: "#7c3aed",
    boxShadow: "0 0 0 4px #f5f3ff",
  },
  timelineBody: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  timelineLabel: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#6b7280",
  },
  timelineLabelActive: {
    fontWeight: "700",
    color: "#1f2937",
  },
  timelineMeta: {
    fontSize: "12px",
    color: "#9ca3af",
  },
  timelineEmpty: {
    fontSize: "14px",
    color: "#9ca3af",
    margin: 0,
    textAlign: "center",
    padding: "24px 0",
  },
};
