"use client";

import { useState } from "react";

/**
 * Daum(카카오) 우편번호 위젯 래퍼 (재사용 컴포넌트)
 *
 * === 외부 API 목킹 연습 대상 ===
 * 이 컴포넌트는 외부 스크립트
 *   https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js
 * 를 필요 시점에 동적으로 로드한다. 테스터는 이 스크립트를 차단/목킹하여
 * "외부 의존성 실패 시 graceful degradation"을 검증할 수 있다.
 *
 * GRACEFUL FALLBACK:
 * - 스크립트가 ~5초 내에 로드되지 않거나 로드에 실패하면
 *   data-testid='address-search-fallback' (role=alert) 안내를 노출하고
 *   직접 입력(수동 모드) UI를 제공한다.
 *
 * props:
 * - onComplete({ zonecode, address }): 주소 선택(또는 수동 저장) 시 호출
 * - buttonLabel: 검색 버튼 라벨 (기본 '주소 검색')
 */
const SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const SCRIPT_ID = "daum-postcode-script";
const LOAD_TIMEOUT_MS = 5000;

// 스크립트를 한 번만 로드하고 Promise를 캐싱 (여러 인스턴스 공유)
let scriptPromise = null;

function loadPostcodeScript() {
  if (typeof window !== "undefined" && window.daum && window.daum.Postcode) {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    // 이미 삽입된 스크립트가 있으면 재사용
    let el = document.getElementById(SCRIPT_ID);
    let timeoutId;

    const onLoaded = () => {
      clearTimeout(timeoutId);
      if (window.daum && window.daum.Postcode) resolve();
      else reject(new Error("SCRIPT_LOADED_BUT_API_MISSING"));
    };
    const onError = () => {
      clearTimeout(timeoutId);
      scriptPromise = null; // 실패 시 재시도 가능하도록 캐시 해제
      reject(new Error("SCRIPT_LOAD_ERROR"));
    };

    timeoutId = setTimeout(() => {
      scriptPromise = null;
      reject(new Error("SCRIPT_LOAD_TIMEOUT"));
    }, LOAD_TIMEOUT_MS);

    if (!el) {
      el = document.createElement("script");
      el.id = SCRIPT_ID;
      el.src = SCRIPT_SRC;
      el.async = true;
      el.addEventListener("load", onLoaded);
      el.addEventListener("error", onError);
      document.head.appendChild(el);
    } else {
      el.addEventListener("load", onLoaded);
      el.addEventListener("error", onError);
    }
  });

  return scriptPromise;
}

export default function AddressSearch({ onComplete, buttonLabel = "주소 검색" }) {
  const [status, setStatus] = useState("idle"); // idle | loading | open | failed
  const [manualZonecode, setManualZonecode] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  const handleOpen = async () => {
    if (status === "loading") return;
    setStatus("loading");
    try {
      await loadPostcodeScript();
      const daum = window.daum;
      if (!daum || !daum.Postcode) throw new Error("SCRIPT_LOADED_BUT_API_MISSING");

      // 팝업(별도 창)으로 우편번호 검색 열기 — 팝업 핸들링 자동화 연습용
      new daum.Postcode({
        oncomplete: (data) => {
          const zonecode = data.zonecode || "";
          const address = data.roadAddress || data.address || data.jibunAddress || "";
          onComplete?.({ zonecode, address });
          setStatus("idle");
        },
        onclose: () => {
          setStatus("idle");
        },
      }).open();
      // 팝업은 별도 창이므로 버튼은 바로 다시 활성화
      setStatus("idle");
    } catch {
      // 스크립트 차단/실패/타임아웃 → 수동 입력 모드로 전환
      setStatus("failed");
    }
  };

  const handleManualSubmit = () => {
    onComplete?.({
      zonecode: manualZonecode.trim(),
      address: manualAddress.trim(),
    });
  };

  return (
    <div className="address-search" data-testid="address-search" style={styles.wrap}>
      <button
        type="button"
        id="address-search-btn"
        data-testid="address-search-btn"
        className="address-search-btn"
        onClick={handleOpen}
        disabled={status === "loading"}
        style={styles.button}
      >
        {status === "loading" ? "불러오는 중..." : buttonLabel}
      </button>

      {/* 외부 스크립트 로드 실패 시 fallback (수동 입력) */}
      {status === "failed" && (
        <div className="address-search-fallback-wrap" style={styles.fallbackWrap}>
          <p
            id="address-search-fallback"
            data-testid="address-search-fallback"
            className="address-search-fallback"
            role="alert"
            style={styles.fallbackNotice}
          >
            주소 검색 서비스를 불러오지 못했습니다. 직접 입력해주세요.
          </p>

          <div style={styles.manualRow}>
            <input
              type="text"
              id="address-search-manual-zonecode"
              data-testid="address-search-manual-zonecode"
              className="address-search-manual-zonecode"
              placeholder="우편번호"
              value={manualZonecode}
              onChange={(e) => setManualZonecode(e.target.value)}
              style={styles.manualZonecode}
              aria-label="우편번호 직접 입력"
            />
            <input
              type="text"
              id="address-search-manual-address"
              data-testid="address-search-manual-address"
              className="address-search-manual-address"
              placeholder="주소를 직접 입력하세요"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              style={styles.manualAddress}
              aria-label="주소 직접 입력"
            />
            <button
              type="button"
              id="address-search-manual-submit"
              data-testid="address-search-manual-submit"
              className="address-search-manual-submit"
              onClick={handleManualSubmit}
              style={styles.manualSubmit}
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "flex-start",
    width: "100%",
  },
  button: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "#1a1a1a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  layer: {
    width: "100%",
    maxWidth: "400px",
    height: "420px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    overflow: "hidden",
  },
  fallbackWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
  },
  fallbackNotice: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 500,
    color: "#ea580c",
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "8px",
    padding: "10px 12px",
  },
  manualRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    width: "100%",
  },
  manualZonecode: {
    width: "110px",
    padding: "8px 10px",
    fontSize: "13px",
    border: "1px solid #d4d4d4",
    borderRadius: "8px",
  },
  manualAddress: {
    flex: 1,
    minWidth: "160px",
    padding: "8px 10px",
    fontSize: "13px",
    border: "1px solid #d4d4d4",
    borderRadius: "8px",
  },
  manualSubmit: {
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
    border: "1px solid #d4d4d4",
    borderRadius: "8px",
    cursor: "pointer",
  },
};
