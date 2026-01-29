"use client";

import { useState } from "react";

/**
 * /src/pages/Login.jsx
 * - App.jsx가 <LoginPage onLogin={} isLoading={} errorMessage={}/> 로 호출하는 구조에 맞춤
 * - onLogin({ username, password }) 그대로 넘김
 * - 입력값 비어있으면 바로 에러 노출(프론트 단에서만)
 */
export default function LoginPage({ onLogin, isLoading = false, errorMessage = "" }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError("");

    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setLocalError("아이디와 비밀번호를 입력하세요");
      return;
    }

    if (typeof onLogin === "function") {
      onLogin({ username: u, password: p });
    }
  };

  const showError = localError || errorMessage;

  return (
    <div className="login-page" style={styles.page}>
      <div className="login-card" style={styles.card}>
        <h1 className="login-title" style={styles.title}>
          로그인
        </h1>

        <form className="login-form" onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group" style={styles.formGroup}>
            <label htmlFor="login-username" style={styles.label}>
              아이디
            </label>
            <input
              type="text"
              id="login-username"
              name="username"
              className="login-input username-input"
              aria-label="아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              style={styles.input}
            />
          </div>

          <div className="form-group" style={styles.formGroup}>
            <label htmlFor="login-password" style={styles.label}>
              비밀번호
            </label>
            <input
              type="password"
              id="login-password"
              name="password"
              className="login-input password-input"
              aria-label="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              style={styles.input}
            />
          </div>

          {showError ? (
            <div id="login-error" className="form-error" role="alert" style={styles.error}>
              {showError}
            </div>
          ) : null}

          <button
            type="submit"
            id="login-submit"
            className="btn btn-primary"
            aria-label="로그인"
            disabled={isLoading}
            style={{
              ...styles.button,
              ...(isLoading ? styles.buttonDisabled : {}),
            }}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="demo-info" style={styles.demoInfo}>
          <p style={styles.demoText}>
            데모 계정: <strong>test</strong> / <strong>1234</strong>
          </p>
          <p style={styles.demoText}>
            관리자: <strong>admin</strong> / <strong>1234</strong>
          </p>
          <p style={styles.demoText}>
            차단계정: <strong>test2</strong> / <strong>1234</strong>
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
    minWidth: "520px",
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
  input: {
    padding: "12px 16px",
    fontSize: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
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
  },
  buttonDisabled: {
    backgroundColor: "#93c5fd",
    cursor: "not-allowed",
  },
  demoInfo: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
    textAlign: "center",
  },
  demoText: {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0",
  },
};
