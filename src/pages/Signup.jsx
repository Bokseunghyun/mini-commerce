"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 회원가입 페이지
 * - 아이디 중복확인 (GET /api/signup?username=)
 * - API 규칙을 미러링한 클라이언트 validation
 *   - 아이디: 영문 소문자 + 숫자 4~12자
 *   - 비밀번호: 8자 이상, 영문 + 숫자 포함
 *   - 이메일: 선택 입력, 형식 검사
 * - 성공 시 in-DOM 메시지 표시 후 약 1초 뒤 onSignupSuccess() 호출
 */

const USERNAME_REGEX = /^[a-z0-9]{4,12}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateUsername(value) {
  if (!value.trim()) return "아이디를 입력하세요";
  if (!USERNAME_REGEX.test(value.trim())) {
    return "아이디는 영문 소문자와 숫자 4~12자여야 합니다";
  }
  return "";
}

function validatePassword(value) {
  if (!value) return "비밀번호를 입력하세요";
  if (value.length < 8 || !/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return "비밀번호는 8자 이상, 영문과 숫자를 포함해야 합니다";
  }
  return "";
}

function validateEmail(value) {
  if (!value.trim()) return ""; // 선택 입력
  if (!EMAIL_REGEX.test(value.trim())) {
    return "올바른 이메일 형식이 아닙니다";
  }
  return "";
}

export default function SignupPage({ apiBase, onSignupSuccess, onBack }) {
  const API_BASE = apiBase || "";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState({
    username: false,
    password: false,
    passwordConfirm: false,
    email: false,
  });

  // 중복확인 상태: { status: 'available' | 'taken' | 'invalid' | 'error', message }
  const [checkResult, setCheckResult] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const successTimerRef = useRef(null);

  // 언마운트 시 성공 타이머 정리
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const usernameError = touched.username ? validateUsername(username) : "";
  const passwordError = touched.password ? validatePassword(password) : "";
  const passwordConfirmError =
    touched.passwordConfirm && passwordConfirm && password !== passwordConfirm
      ? "비밀번호가 일치하지 않습니다"
      : "";
  const emailError = touched.email ? validateEmail(email) : "";

  const handleUsernameChange = (e) => {
    setUsername(e.target.value);
    setCheckResult(null); // 아이디가 바뀌면 중복확인 결과 초기화
    setApiError("");
  };

  // 아이디 중복확인
  const handleUsernameCheck = async () => {
    const u = username.trim();
    setTouched((prev) => ({ ...prev, username: true }));

    if (!u) {
      setCheckResult({ status: "invalid", message: "아이디를 입력하세요" });
      return;
    }

    setIsChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/signup?username=${encodeURIComponent(u)}`
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 400 INVALID_USERNAME 등 → 형식 오류
        setCheckResult({
          status: "invalid",
          message: `형식 오류: ${data.message || "사용할 수 없는 아이디입니다"}`,
        });
        return;
      }

      if (data.available) {
        setCheckResult({ status: "available", message: "사용 가능한 아이디입니다" });
      } else {
        setCheckResult({ status: "taken", message: "이미 사용 중인 아이디입니다" });
      }
    } catch (e) {
      setCheckResult({ status: "error", message: `네트워크 오류: ${e.message}` });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setTouched({ username: true, password: true, passwordConfirm: true, email: true });

    const u = username.trim();
    const uError = validateUsername(u);
    const pError = validatePassword(password);
    const eError = validateEmail(email);
    const confirmMismatch = password !== passwordConfirm;

    if (uError || pError || eError || confirmMismatch) {
      if (confirmMismatch && !passwordConfirm) {
        setApiError("비밀번호 확인을 입력하세요");
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const body = { username: u, password };
      if (email.trim()) body.email = email.trim();

      const res = await fetch(`${API_BASE}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code = data.code ? ` (${data.code})` : "";
        setApiError(`${data.message || "회원가입에 실패했습니다"}${code}`);
        return;
      }

      setSuccessMessage(data.message || "회원가입이 완료되었습니다");
      successTimerRef.current = setTimeout(() => {
        onSignupSuccess?.();
      }, 1000);
    } catch (err) {
      setApiError(`네트워크 오류: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkResultStyle =
    checkResult?.status === "available"
      ? styles.checkResultOk
      : styles.checkResultBad;

  return (
    <div id="signup-page" className="signup-page" style={styles.page} data-testid="signup-page">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div className="signup-card" style={styles.card} data-testid="signup-card">
        <h1 id="signup-title" className="signup-title" style={styles.title} data-testid="signup-title">
          회원가입
        </h1>
        <p style={styles.subtitle} className="signup-subtitle">
          ShopDemo 회원이 되어 다양한 혜택을 만나보세요
        </p>

        <form
          id="signup-form"
          className="signup-form"
          onSubmit={handleSubmit}
          style={styles.form}
          data-testid="signup-form"
          noValidate
        >
          {/* 아이디 + 중복확인 */}
          <div className="form-group signup-username-group" style={styles.formGroup}>
            <label htmlFor="signup-username" style={styles.label}>
              아이디 <span style={styles.required}>*</span>
            </label>
            <div style={styles.inlineRow}>
              <input
                type="text"
                id="signup-username"
                name="username"
                className="signup-input signup-username-input"
                aria-label="아이디"
                aria-required="true"
                aria-invalid={!!usernameError}
                aria-describedby={usernameError ? "signup-username-error" : undefined}
                value={username}
                onChange={handleUsernameChange}
                onBlur={() => setTouched((prev) => ({ ...prev, username: true }))}
                placeholder="영문 소문자, 숫자 4~12자"
                autoComplete="username"
                maxLength={12}
                style={{
                  ...styles.input,
                  flex: 1,
                  ...(usernameError ? styles.inputError : {}),
                }}
                data-testid="signup-username-input"
              />
              <button
                type="button"
                id="username-check-btn"
                name="usernameCheckButton"
                className="btn btn-secondary username-check-button"
                aria-label="아이디 중복확인"
                onClick={handleUsernameCheck}
                disabled={isChecking}
                style={{
                  ...styles.checkButton,
                  ...(isChecking ? styles.buttonDisabled : {}),
                }}
                data-testid="username-check-btn"
              >
                {isChecking ? "확인 중..." : "중복확인"}
              </button>
            </div>
            {usernameError && (
              <span
                id="signup-username-error"
                className="field-error signup-username-error"
                style={styles.fieldError}
                data-testid="signup-username-error"
                role="alert"
              >
                {usernameError}
              </span>
            )}
            {checkResult && (
              <span
                id="username-check-result"
                className={`username-check-result check-${checkResult.status}`}
                style={{ ...styles.checkResult, ...checkResultStyle }}
                data-testid="username-check-result"
                data-status={checkResult.status}
                role="status"
                aria-live="polite"
              >
                {checkResult.message}
              </span>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="form-group signup-password-group" style={styles.formGroup}>
            <label htmlFor="signup-password" style={styles.label}>
              비밀번호 <span style={styles.required}>*</span>
            </label>
            <input
              type="password"
              id="signup-password"
              name="password"
              className="signup-input signup-password-input"
              aria-label="비밀번호"
              aria-required="true"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "signup-password-error" : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              placeholder="8자 이상, 영문 + 숫자 포함"
              autoComplete="new-password"
              maxLength={30}
              style={{
                ...styles.input,
                ...(passwordError ? styles.inputError : {}),
              }}
              data-testid="signup-password-input"
            />
            {passwordError && (
              <span
                id="signup-password-error"
                className="field-error signup-password-error"
                style={styles.fieldError}
                data-testid="signup-password-error"
                role="alert"
              >
                {passwordError}
              </span>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div className="form-group signup-password-confirm-group" style={styles.formGroup}>
            <label htmlFor="signup-password-confirm" style={styles.label}>
              비밀번호 확인 <span style={styles.required}>*</span>
            </label>
            <input
              type="password"
              id="signup-password-confirm"
              name="passwordConfirm"
              className="signup-input signup-password-confirm-input"
              aria-label="비밀번호 확인"
              aria-required="true"
              aria-invalid={!!passwordConfirmError}
              aria-describedby={passwordConfirmError ? "password-confirm-error" : undefined}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, passwordConfirm: true }))}
              placeholder="비밀번호를 한 번 더 입력하세요"
              autoComplete="new-password"
              maxLength={30}
              style={{
                ...styles.input,
                ...(passwordConfirmError ? styles.inputError : {}),
              }}
              data-testid="signup-password-confirm-input"
            />
            {passwordConfirmError && (
              <span
                id="password-confirm-error"
                className="field-error password-confirm-error"
                style={styles.fieldError}
                data-testid="password-confirm-error"
                role="alert"
              >
                {passwordConfirmError}
              </span>
            )}
          </div>

          {/* 이메일 (선택) */}
          <div className="form-group signup-email-group" style={styles.formGroup}>
            <label htmlFor="signup-email" style={styles.label}>
              이메일 <span style={styles.optional}>(선택)</span>
            </label>
            <input
              type="email"
              id="signup-email"
              name="email"
              className="signup-input signup-email-input"
              aria-label="이메일"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "signup-email-error" : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
              placeholder="example@shopdemo.com"
              autoComplete="email"
              style={{
                ...styles.input,
                ...(emailError ? styles.inputError : {}),
              }}
              data-testid="signup-email-input"
            />
            {emailError && (
              <span
                id="signup-email-error"
                className="field-error signup-email-error"
                style={styles.fieldError}
                data-testid="signup-email-error"
                role="alert"
              >
                {emailError}
              </span>
            )}
          </div>

          {/* API 에러 */}
          {apiError && (
            <div
              id="signup-error"
              className="form-error signup-error"
              role="alert"
              style={styles.error}
              data-testid="signup-error"
            >
              {apiError}
            </div>
          )}

          {/* 성공 메시지 */}
          {successMessage && (
            <div
              id="signup-success"
              className="form-success signup-success"
              role="status"
              aria-live="polite"
              style={styles.success}
              data-testid="signup-success"
            >
              {successMessage} 잠시 후 이동합니다...
            </div>
          )}

          <button
            type="submit"
            id="signup-submit"
            className="btn btn-primary signup-submit-button"
            aria-label="회원가입"
            disabled={isSubmitting || !!successMessage}
            style={{
              ...styles.submitButton,
              ...(isSubmitting || successMessage ? styles.buttonDisabled : {}),
            }}
            data-testid="signup-submit-button"
          >
            {isSubmitting ? (
              <>
                <span style={styles.spinnerSmall} data-testid="loading-spinner"></span>
                가입 처리 중...
              </>
            ) : (
              "회원가입"
            )}
          </button>

          <button
            type="button"
            id="signup-back"
            className="btn btn-secondary signup-back-button"
            aria-label="뒤로 가기"
            onClick={onBack}
            style={styles.backButton}
            data-testid="signup-back"
          >
            뒤로
          </button>
        </form>
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
    backgroundColor: "#f8fafc",
    padding: "24px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    padding: "44px",
    width: "min(92vw, 560px)",
    maxWidth: "560px",
    minWidth: "320px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: "8px",
    marginTop: "0",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    textAlign: "center",
    marginTop: 0,
    marginBottom: "28px",
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
  inlineRow: {
    display: "flex",
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
  optional: {
    color: "#9ca3af",
    fontSize: "12px",
    fontWeight: "400",
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
  checkButton: {
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#374151",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  checkResult: {
    fontSize: "13px",
    marginTop: "4px",
    fontWeight: "500",
  },
  checkResultOk: {
    color: "#16a34a",
  },
  checkResultBad: {
    color: "#dc2626",
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
  success: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    padding: "12px 16px",
    color: "#16a34a",
    fontSize: "14px",
    fontWeight: "500",
  },
  submitButton: {
    padding: "14px 24px",
    fontSize: "16px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
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
    backgroundColor: "#9ca3af",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerSmall: {
    width: "16px",
    height: "16px",
    border: "2px solid #ffffff",
    borderTopColor: "transparent",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
};
