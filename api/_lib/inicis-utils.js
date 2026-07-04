/**
 * api/_lib/inicis-utils.js - KG이니시스 표준결제(INIStdPay) 유틸
 *
 * 무료 통합테스트 상점(INIpayTest)을 기본값으로 사용한다. 가입/키 발급 불필요.
 * 실제 상점으로 바꾸려면 환경변수 INICIS_MID / INICIS_SIGN_KEY 를 설정.
 *
 * 서명 규칙(표준결제):
 *  - signature    = SHA256("oid={oid}&price={price}&timestamp={ts}")
 *  - verification = SHA256("oid={oid}&price={price}&signKey={signKey}&timestamp={ts}")
 *  - mKey         = SHA256(signKey)
 *  - (승인요청) signature    = SHA256("authToken={t}&timestamp={ts}")
 *  - (승인요청) verification = SHA256("authToken={t}&signKey={signKey}&timestamp={ts}")
 */
import crypto from 'node:crypto';

// 공개 통합테스트 상점 (KG이니시스 문서 제공, 실제 청구 없음)
export const INICIS_MID = process.env.INICIS_MID || 'INIpayTest';
export const INICIS_SIGN_KEY =
  process.env.INICIS_SIGN_KEY || 'SU5JTElURV9UUklQTEVERVNfS0VZU1RS';
// 테스트(staging) SDK — 실 상점 사용 시 https://stdpay.inicis.com/stdjs/INIStdPay.js
export const INICIS_SDK_URL =
  process.env.INICIS_SDK_URL || 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js';

export function sha256hex(text) {
  return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex');
}

// 결제 요청 파라미터 서명
export function buildRequestSign({ oid, price, timestamp }) {
  return {
    signature: sha256hex(`oid=${oid}&price=${price}&timestamp=${timestamp}`),
    verification: sha256hex(
      `oid=${oid}&price=${price}&signKey=${INICIS_SIGN_KEY}&timestamp=${timestamp}`
    ),
    mKey: sha256hex(INICIS_SIGN_KEY),
  };
}

// 승인 요청 서명 (returnUrl 콜백에서 authUrl 호출 시)
export function buildApprovalSign({ authToken, timestamp }) {
  return {
    signature: sha256hex(`authToken=${authToken}&timestamp=${timestamp}`),
    verification: sha256hex(
      `authToken=${authToken}&signKey=${INICIS_SIGN_KEY}&timestamp=${timestamp}`
    ),
  };
}

// 주문번호(oid) 생성 — mid 접두 + 시간/랜덤. Date/Math.random 은 핸들러에서 주입.
export function makeOid(rand) {
  return `${INICIS_MID}_${rand}`;
}

// 요청 도메인으로부터 절대 URL 생성 (returnUrl/closeUrl 용)
export function absoluteUrl(req, path) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${host}${path}`;
}
