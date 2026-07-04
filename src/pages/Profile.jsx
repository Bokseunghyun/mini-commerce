"use client";

import { useCallback, useEffect, useState } from "react";
import ImageUpload from "../components/ImageUpload";
import AddressSearch from "../components/AddressSearch";

/**
 * 프로필 페이지
 * - 토큰 확인 (data-testid='profile-login-required')
 * - 현재 아바타 표시 (data-testid='profile-avatar', 없으면 이니셜 폴백)
 * - ImageUpload(kind='avatar') 로 업로드 → POST /api/user-actions {action:'set_avatar'}
 *   → in-DOM 성공 메시지 (data-testid='profile-avatar-message')
 * - 배송지 관리 데모: AddressSearch 로 읽기 전용 표시 필드 채우기
 *   (#profile-zonecode, #profile-address)
 * - GET /api/user-actions?type=profile 로 현재 아바타/프로필 로드
 *
 * props:
 * - apiBase: API 베이스 URL
 * - onBack(): 뒤로 가기
 */

// 토큰에서 username 추출 (실패해도 크래시 X) — 아바타 폴백 이니셜용
function getCurrentUsername() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1])).username || null;
  } catch {
    return null;
  }
}

function LoadingSpinner() {
  return (
    <div style={styles.loadingContainer} data-testid="loading-spinner">
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>프로필을 불러오는 중...</p>
    </div>
  );
}

export default function ProfilePage({ apiBase, onBack }) {
  const API_BASE = apiBase || "";

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [username, setUsername] = useState(getCurrentUsername());
  const [avatarUrl, setAvatarUrl] = useState(null);
  // 아바타 업로드/저장 결과: { type: 'success' | 'error', text }
  const [avatarMessage, setAvatarMessage] = useState(null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // 배송지 데모 표시 필드
  const [zonecode, setZonecode] = useState("");
  const [address, setAddress] = useState("");

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsLoggedIn(false);
      setIsLoading(false);
      return;
    }
    setIsLoggedIn(true);
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`${API_BASE}/api/user-actions?type=profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setIsLoggedIn(false);
        return;
      }
      if (!res.ok) {
        // 프로필 조회 실패해도 페이지는 사용 가능 (아바타만 비어있음)
        setLoadError(data.message || `프로필 조회 실패 (status=${res.status})`);
        return;
      }
      if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
      if (data.username) setUsername(data.username);
    } catch (e) {
      setLoadError(`네트워크 오류: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ImageUpload 성공 → set_avatar 로 서버에 프로필 아바타 반영
  const handleAvatarUploaded = async (url) => {
    setAvatarMessage(null);
    setSavingAvatar(true);
    // 업로드된 이미지는 즉시 미리 반영
    setAvatarUrl(url);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/user-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ action: "set_avatar", image: url }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAvatarMessage({
          type: "error",
          text: data.message || data.code || `프로필 사진 저장 실패 (status=${res.status})`,
        });
        return;
      }

      if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
      setAvatarMessage({ type: "success", text: "프로필 사진이 변경되었습니다" });
    } catch (e) {
      setAvatarMessage({ type: "error", text: `프로필 사진 저장 중 오류가 발생했습니다: ${e.message}` });
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleAddressComplete = ({ zonecode: zc, address: addr }) => {
    setZonecode(zc || "");
    setAddress(addr || "");
  };

  const initial = (username || "?").charAt(0).toUpperCase();

  return (
    <div id="profile-page" className="profile-page" style={styles.page} data-testid="profile-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <header
        id="profile-header"
        className="profile-header"
        style={styles.header}
        role="banner"
        data-testid="profile-header"
      >
        <div style={styles.headerInner}>
          <button
            type="button"
            id="profile-back"
            className="btn btn-ghost profile-back-button"
            aria-label="뒤로 가기"
            onClick={onBack}
            style={styles.backBtn}
            data-testid="profile-back"
          >
            ← 뒤로
          </button>
          <h1 style={styles.headerTitle} className="page-title profile-title">
            내 프로필
          </h1>
        </div>
      </header>

      <main style={styles.container} className="profile-container">
        {isLoading ? (
          <LoadingSpinner />
        ) : !isLoggedIn ? (
          <div
            id="profile-login-required"
            className="profile-login-required login-required-notice"
            style={styles.noticeBox}
            data-testid="profile-login-required"
            role="alert"
          >
            <p style={styles.noticeTitle}>로그인이 필요한 서비스입니다</p>
            <p style={styles.noticeText}>프로필은 로그인 후 확인할 수 있습니다.</p>
            <button
              type="button"
              id="profile-go-home"
              className="btn btn-primary profile-go-home-button"
              aria-label="홈으로 이동"
              onClick={onBack}
              style={styles.primaryBtn}
              data-testid="profile-go-home"
            >
              홈으로
            </button>
          </div>
        ) : (
          <>
            {loadError && (
              <div
                id="profile-error"
                className="profile-error"
                style={styles.errorBox}
                data-testid="profile-error"
                role="alert"
              >
                {loadError}
              </div>
            )}

            {/* ===== 프로필 사진 ===== */}
            <section
              className="profile-section"
              style={styles.section}
              data-testid="profile-avatar-section"
              aria-label="프로필 사진"
            >
              <h2 style={styles.sectionTitle}>프로필 사진</h2>

              <div style={styles.avatarRow}>
                {avatarUrl ? (
                  <img
                    id="profile-avatar"
                    data-testid="profile-avatar"
                    className="profile-avatar"
                    src={avatarUrl}
                    alt={`${username || "사용자"} 프로필 사진`}
                    style={styles.avatarImg}
                  />
                ) : (
                  <div
                    id="profile-avatar"
                    data-testid="profile-avatar"
                    className="profile-avatar profile-avatar-fallback"
                    style={styles.avatarFallback}
                    role="img"
                    aria-label={`${username || "사용자"} 프로필 사진 없음`}
                  >
                    {initial}
                  </div>
                )}

                <div style={styles.avatarUploadCol}>
                  <p style={styles.usernameText} data-testid="profile-username">
                    {username || "사용자"}
                  </p>
                  <ImageUpload
                    kind="avatar"
                    apiBase={API_BASE}
                    maxLabel="JPG/PNG, 최대 2MB"
                    onUploaded={handleAvatarUploaded}
                    disabled={savingAvatar}
                  />
                </div>
              </div>

              {avatarMessage && (
                <p
                  id="profile-avatar-message"
                  data-testid="profile-avatar-message"
                  className={`profile-avatar-message profile-avatar-message-${avatarMessage.type}`}
                  role={avatarMessage.type === "success" ? "status" : "alert"}
                  aria-live="polite"
                  style={{
                    ...styles.messageBox,
                    ...(avatarMessage.type === "success" ? styles.messageSuccess : styles.messageError),
                  }}
                >
                  {avatarMessage.text}
                </p>
              )}
            </section>

            {/* ===== 배송지 관리 (주소 검색 위젯 데모) ===== */}
            <section
              className="profile-section"
              style={styles.section}
              data-testid="profile-address-section"
              aria-label="배송지 관리"
            >
              <h2 style={styles.sectionTitle}>배송지 관리</h2>
              <p style={styles.sectionDesc}>
                주소 검색으로 우편번호와 주소를 불러올 수 있습니다.
              </p>

              <AddressSearch onComplete={handleAddressComplete} buttonLabel="주소 검색" />

              <div style={styles.addressFields}>
                <div style={styles.fieldRow}>
                  <label htmlFor="profile-zonecode" style={styles.fieldLabel}>
                    우편번호
                  </label>
                  <input
                    type="text"
                    id="profile-zonecode"
                    data-testid="profile-zonecode"
                    className="profile-zonecode"
                    value={zonecode}
                    readOnly
                    placeholder="우편번호"
                    style={styles.readonlyInput}
                    aria-label="선택된 우편번호"
                  />
                </div>
                <div style={styles.fieldRow}>
                  <label htmlFor="profile-address" style={styles.fieldLabel}>
                    주소
                  </label>
                  <input
                    type="text"
                    id="profile-address"
                    data-testid="profile-address"
                    className="profile-address"
                    value={address}
                    readOnly
                    placeholder="주소"
                    style={styles.readonlyInput}
                    aria-label="선택된 주소"
                  />
                </div>
              </div>
            </section>
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
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a1a1a",
    margin: 0,
  },
  sectionDesc: {
    fontSize: "13px",
    color: "#6b7280",
    margin: "-8px 0 0",
  },
  avatarRow: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  avatarImg: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "1px solid #e5e7eb",
    flexShrink: 0,
  },
  avatarFallback: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "34px",
    fontWeight: "700",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    flexShrink: 0,
  },
  avatarUploadCol: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  usernameText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
    margin: 0,
  },
  messageBox: {
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: "500",
    margin: 0,
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
  addressFields: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  fieldRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  fieldLabel: {
    width: "72px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#525252",
    flexShrink: 0,
  },
  readonlyInput: {
    flex: 1,
    minWidth: "160px",
    padding: "10px 12px",
    fontSize: "14px",
    color: "#1a1a1a",
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
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
