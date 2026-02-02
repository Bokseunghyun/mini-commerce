"use client";

import { useState } from "react";

/**
 * 개선된 로그인 페이지
 * - 실시간 validation
 * - data-testid 속성 추가
 * - 더 많은 validation 케이스
 * - 접근성 개선
 */
export default function LoginPage({ onLogin, onBack, isLoading = false, errorMessage = "" }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [touched, setTouched] = useState({ username: false, password: false });

  // 실시간 validation
  const validateUsername = (value) => {
    if (!value.trim()) {
      return "아이디를 입력하세요";
    }
    if (value.trim().length < 2) {
      return "아이디는 2자 이상이어야 합니다";
    }
    if (value.trim().length > 20) {
      return "아이디는 20자 이하여야 합니다";
    }
    // 특수문자 검사 (영문, 숫자만 허용)
    if (!/^[a-zA-Z0-9]+$/.test(value.trim())) {
      return "아이디는 영문, 숫자만 사용 가능합니다";
    }
    return "";
  };

  const validatePassword = (value) => {
    if (!value) {
      return "비밀번호를 입력하세요";
    }
    if (value.length < 4) {
      return "비밀번호는 4자 이상이어야 합니다";
    }
    if (value.length > 30) {
      return "비밀번호는 30자 이하여야 합니다";
    }
    return "";
  };

  const usernameError = touched.username ? validateUsername(username) : "";
  const passwordError = touched.password ? validatePassword(password) : "";

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    // 모든 필드를 touched로 설정
    setTouched({ username: true, password: true });

    const u = username.trim();
    const p = password;

    // Validation 체크
    const uError = validateUsername(u);
    const pError = validatePassword(p);

    if (uError) {
      setLocalError(uError);
      return;
    }

    if (pError) {
      setLocalError(pError);
      return;
    }

    // 추가 보안 검증 (SQL Injection 방지 등)
    if (u.includes("'") || u.includes('"') || u.includes(";")) {
      setLocalError("유효하지 않은 문자가 포함되어 있습니다");
      return;
    }

    if (typeof onLogin === "function") {
      onLogin({ username: u, password: p });
    }
  };

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    setLocalError(""); // 입력 시 에러 초기화
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setLocalError(""); // 입력 시 에러 초기화
  };

  const handleUsernameBlur = () => {
    setTouched(prev => ({ ...prev, username: true }));
  };

  const handlePasswordBlur = () => {
    setTouched(prev => ({ ...prev, password: true }));
  };

  // 우선순위: localError > usernameError > passwordError > errorMessage
  const showError = localError || usernameError || passwordError || errorMessage;

  // 버튼 비활성화 조건
  const isButtonDisabled =
    isLoading ||
    !username.trim() ||
    !password ||
    !!usernameError ||
    !!passwordError;

  return (
    <div className="login-page" style={styles.page} data-testid="login-page">
      <div className="login-card" style={styles.card} data-testid="login-card">
        <h1 className="login-title" style={styles.title} data-testid="login-title">
          로그인
        </h1>

        <form
          className="login-form"
          onSubmit={handleSubmit}
          style={styles.form}
          data-testid="login-form"
          noValidate
        >
          {/* Username 필드 */}
          <div className="form-group" style={styles.formGroup}>
            <label htmlFor="login-username" style={styles.label}>
              아이디 <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="login-username"
              name="username"
              className="login-input username-input"
              aria-label="아이디"
              aria-required="true"
              aria-invalid={!!usernameError}
              aria-describedby={usernameError ? "username-error" : undefined}
              value={username}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
              placeholder="아이디를 입력하세요 (예: test)"
              autoComplete="username"
              style={{
                ...styles.input,
                ...(usernameError ? styles.inputError : {}),
              }}
              data-testid="username-input"
              maxLength={20}
            />
            {usernameError && (
              <span
                id="username-error"
                style={styles.fieldError}
                data-testid="username-error"
                role="alert"
              >
                {usernameError}
              </span>
            )}
          </div>

          {/* Password 필드 */}
          <div className="form-group" style={styles.formGroup}>
            <label htmlFor="login-password" style={styles.label}>
              비밀번호 <span style={styles.required}>*</span>
            </label>
            <input
              type="password"
              id="login-password"
              name="password"
              className="login-input password-input"
              aria-label="비밀번호"
              aria-required="true"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "password-error" : undefined}
              value={password}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              style={{
                ...styles.input,
                ...(passwordError ? styles.inputError : {}),
              }}
              data-testid="password-input"
              maxLength={30}
            />
            {passwordError && (
              <span
                id="password-error"
                style={styles.fieldError}
                data-testid="password-error"
                role="alert"
              >
                {passwordError}
              </span>
            )}
          </div>

          {/* 서버 에러 또는 전체 에러 */}
          {(localError || errorMessage) && (
            <div
              id="login-error"
              className="form-error"
              role="alert"
              style={styles.error}
              data-testid="login-error"
            >
              {localError || errorMessage}
            </div>
          )}

          <button
            type="submit"
            id="login-submit"
            className="btn btn-primary login-submit-button"
            aria-label="로그인"
            disabled={isButtonDisabled}
            style={{
              ...styles.button,
              ...(isButtonDisabled ? styles.buttonDisabled : {}),
            }}
            data-testid="login-submit-button"
          >
            {isLoading ? (
              <>
                <span style={styles.spinner}></span>
                로그인 중...
              </>
            ) : (
              "로그인"
            )}
          </button>

          {/* 홈으로 돌아가기 버튼 */}
          {onBack && (
            <button
              type="button"
              id="back-to-home"
              className="btn btn-secondary back-to-home-button"
              aria-label="홈으로 돌아가기"
              onClick={onBack}
              style={styles.backButton}
              data-testid="back-to-home-button"
            >
              홈으로 돌아가기
            </button>
          )}
        </form>

        <div className="demo-info" style={styles.demoInfo} data-testid="demo-info">
          <p style={styles.demoHeading}>테스트 계정 안내</p>
          <div style={styles.accountList}>
            <div style={styles.accountItem}>
              <span style={styles.accountLabel}>일반 사용자:</span>
              <code style={styles.accountCode}>test / 1234</code>
            </div>
            <div style={styles.accountItem}>
              <span style={styles.accountLabel}>관리자:</span>
              <code style={styles.accountCode}>admin / 1234</code>
            </div>
            <div style={styles.accountItem}>
              <span style={styles.accountLabel}>차단 계정:</span>
              <code style={styles.accountCode}>test2 / 1234</code>
            </div>
          </div>
          <p style={styles.demoNote}>
            💡 차단 계정은 로그인 시 403 에러가 발생합니다
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "24px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    padding: "44px",
    width: "min(92vw, 640px)",
    maxWidth: "640px",
    minWidth: "320px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: "32px",
    marginTop: "0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  required: {
    color: "#dc2626",
    marginLeft: "2px",
  },
  input: {
    padding: "12px 16px",
    fontSize: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  inputError: {
    borderColor: "#dc2626",
    backgroundColor: "#fef2f2",
  },
  fieldError: {
    fontSize: "12px",
    color: "#dc2626",
    marginTop: "4px",
  },
  error: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "12px 16px",
    color: "#dc2626",
    fontSize: "14px",
  },
  button: {
    padding: "14px 24px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#2563eb",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  buttonDisabled: {
    backgroundColor: "#93c5fd",
    cursor: "not-allowed",
  },
  backButton: {
    padding: "12px 24px",
    fontSize: "15px",
    fontWeight: "500",
    color: "#6b7280",
    backgroundColor: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid #ffffff",
    borderTopColor: "transparent",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  demoInfo: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
  },
  demoHeading: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "12px",
    textAlign: "center",
  },
  accountList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "12px",
  },
  accountItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: "#f9fafb",
    borderRadius: "6px",
  },
  accountLabel: {
    fontSize: "13px",
    color: "#6b7280",
  },
  accountCode: {
    fontSize: "13px",
    fontFamily: "monospace",
    color: "#1a1a1a",
    backgroundColor: "#e5e7eb",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  demoNote: {
    fontSize: "12px",
    color: "#6b7280",
    textAlign: "center",
    marginTop: "8px",
  },
};

// 스타일에 애니메이션 추가를 위한 글로벌 스타일
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
