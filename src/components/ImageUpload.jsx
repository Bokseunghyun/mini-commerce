"use client";

import { useRef, useState } from "react";

/**
 * 재사용 가능한 이미지 업로드 컴포넌트
 *
 * 서버 검증(외부 검증) 연습 대상:
 * - 클라이언트에서 1차 검증(이미지 타입 / 2MB 이하) 후
 * - POST /api/upload {kind, image(dataURL)} 로 서버에 업로드한다.
 * - 서버가 413 FILE_TOO_LARGE / 400 INVALID_FILE_TYPE 등을 반환하면
 *   같은 에러 엘리먼트(data-testid='image-upload-error')에 서버 메시지를 노출한다.
 *
 * props:
 * - kind: 'review' | 'avatar' (input id/testid 접미사 및 업로드 kind)
 * - onUploaded(url): 업로드 성공 시 서버가 반환한 url 콜백
 * - maxLabel: 인풋 옆에 표시할 보조 안내 텍스트 (선택)
 * - apiBase: API 베이스 URL (선택, 기본 '')
 * - disabled: 인풋 비활성화 (선택)
 */
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export default function ImageUpload({ kind = "review", onUploaded, maxLabel, apiBase = "", disabled = false }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleChange = async (e) => {
    setError(null);
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // --- 클라이언트 1차 검증 ---
    if (!file.type || !file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다");
      resetInput();
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("파일이 너무 큽니다 (최대 2MB)");
      resetInput();
      return;
    }

    // FileReader -> dataURL
    let dataUrl;
    try {
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다"));
        reader.readAsDataURL(file);
      });
    } catch (err) {
      setError(err.message || "파일을 읽는 중 오류가 발생했습니다");
      resetInput();
      return;
    }

    // 로컬 미리보기 즉시 표시
    setPreview(dataUrl);
    setUploading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ kind, image: dataUrl }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // 413 FILE_TOO_LARGE / 400 INVALID_FILE_TYPE / 400 INVALID_KIND 등
        // 서버 메시지를 동일 에러 엘리먼트에 그대로 노출 (외부 검증 실패 연습)
        setError(data.message || data.code || `업로드에 실패했습니다 (status=${res.status})`);
        setPreview(null);
        resetInput();
        return;
      }

      const url = data.url || dataUrl;
      setPreview(url);
      onUploaded?.(url);
    } catch (err) {
      setError(`업로드 중 오류가 발생했습니다: ${err.message}`);
      setPreview(null);
      resetInput();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload" data-testid={`image-upload-${kind}`} style={styles.wrap}>
      <style>{`@keyframes imgUploadSpin { to { transform: rotate(360deg); } }`}</style>
      <label
        htmlFor={`image-upload-input-${kind}`}
        className="image-upload-label"
        style={{ ...styles.label, ...(disabled || uploading ? styles.labelDisabled : {}) }}
      >
        이미지 선택
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          id={`image-upload-input-${kind}`}
          data-testid={`image-upload-input-${kind}`}
          className="image-upload-input"
          onChange={handleChange}
          disabled={disabled || uploading}
          style={styles.input}
        />
      </label>

      {maxLabel && (
        <span className="image-upload-hint" style={styles.hint}>
          {maxLabel}
        </span>
      )}

      {uploading && (
        <span
          className="image-upload-loading"
          data-testid="image-upload-loading"
          role="status"
          aria-live="polite"
          style={styles.loading}
        >
          <span className="image-upload-spinner" style={styles.spinner} aria-hidden="true" />
          업로드 중...
        </span>
      )}

      {error && (
        <p
          className="image-upload-error"
          data-testid="image-upload-error"
          role="alert"
          style={styles.error}
        >
          {error}
        </p>
      )}

      {preview && !error && (
        <img
          src={preview}
          alt="업로드 미리보기"
          className="image-upload-preview"
          data-testid="image-upload-preview"
          style={styles.preview}
        />
      )}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "flex-start",
  },
  label: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    border: "1px solid #d4d4d4",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  labelDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  input: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clip: "rect(0 0 0 0)",
    whiteSpace: "nowrap",
    border: 0,
  },
  hint: {
    fontSize: "12px",
    color: "#6b7280",
  },
  loading: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    color: "#6b7280",
  },
  spinner: {
    width: "16px",
    height: "16px",
    border: "2px solid #e5e7eb",
    borderTopColor: "#1a1a1a",
    borderRadius: "50%",
    animation: "imgUploadSpin 0.8s linear infinite",
    display: "inline-block",
  },
  error: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 500,
    color: "#dc2626",
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    padding: "8px 12px",
  },
  preview: {
    width: "96px",
    height: "96px",
    objectFit: "cover",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
  },
};
