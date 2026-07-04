/**
 * api/_lib/payment-utils.js - 결제(Mock PG, 이니시스 스타일) 순수 유틸
 *
 * 결제 결과는 카드번호 뒤 4자리로 "결정론적"으로 정해진다 (랜덤 아님).
 * 테스트가 단언하는 값은 전부 이 순수 함수로 계산되며, paymentKey 같은
 * 비결정 값(crypto.randomUUID)은 테스트가 단언하지 않는다.
 *
 * 카드 뒤 4자리별 시나리오 (의도적 QA 픽스처):
 *   ...0000  -> 승인 (DONE)
 *   ...0001  -> 거절 (DECLINED, fault=DECLINED)         402
 *   ...0002  -> 한도초과 (DECLINED, fault=LIMIT)          402
 *   ...9999  -> 게이트웨이 타임아웃 (FAILED, fault=TIMEOUT) 504
 *   그 외      -> 승인 (DONE) — 기본 해피패스
 *
 * ?simulate= 쿼리로 카드와 무관하게 결과를 강제할 수 있다 (API 모킹 연습용):
 *   decline -> DECLINED, limit -> LIMIT, timeout -> TIMEOUT, error -> ERROR(500)
 */

// 카드번호에서 공백/하이픈을 제거한 숫자 문자열을 반환 (검증/뒤4자리 추출용)
export function normalizeCardNumber(cardNumber) {
  return String(cardNumber ?? '').replace(/[\s-]/g, '');
}

// 정규화된 카드번호가 숫자만 & 12~19자리인지 검증
export function isValidCardNumber(normalized) {
  return /^\d{12,19}$/.test(normalized);
}

// 결과 상수 (핸들러가 상태코드/응답으로 매핑)
export const PAYMENT_OUTCOMES = {
  DONE: { outcome: 'DONE', status: 'DONE', fault: null },
  DECLINED: {
    outcome: 'DECLINED',
    status: 'DECLINED',
    fault: 'DECLINED',
    httpStatus: 402,
    code: 'PAYMENT_DECLINED',
    message: '카드 승인이 거절되었습니다',
  },
  LIMIT: {
    outcome: 'LIMIT',
    status: 'DECLINED',
    fault: 'LIMIT',
    httpStatus: 402,
    code: 'PAYMENT_LIMIT_EXCEEDED',
    message: '카드 한도를 초과했습니다',
  },
  TIMEOUT: {
    outcome: 'TIMEOUT',
    status: 'FAILED',
    fault: 'TIMEOUT',
    httpStatus: 504,
    code: 'PAYMENT_GATEWAY_TIMEOUT',
    message: '결제 서버가 응답하지 않습니다',
  },
  ERROR: {
    outcome: 'ERROR',
    status: 'FAILED',
    fault: 'ERROR',
    httpStatus: 500,
    code: 'PAYMENT_ERROR',
    message: '결제 처리 중 오류가 발생했습니다',
  },
};

// ?simulate= 값 -> 결과 오버라이드 매핑
const SIMULATE_MAP = {
  decline: PAYMENT_OUTCOMES.DECLINED,
  limit: PAYMENT_OUTCOMES.LIMIT,
  timeout: PAYMENT_OUTCOMES.TIMEOUT,
  error: PAYMENT_OUTCOMES.ERROR,
};

/**
 * 결제 결과를 결정한다.
 *  - simulate 오버라이드가 있으면 카드와 무관하게 그 결과를 우선한다.
 *  - 아니면 정규화된 카드번호 뒤 4자리로 결정론적으로 판정한다.
 * 반환: PAYMENT_OUTCOMES 중 하나 (DONE 은 http/code/message 없음 — 승인)
 */
export function resolveOutcome(normalizedCard, simulate) {
  if (simulate) {
    const sim = SIMULATE_MAP[String(simulate).toLowerCase()];
    if (sim) return sim;
  }

  const last4 = normalizedCard.slice(-4);
  switch (last4) {
    case '0000':
      return PAYMENT_OUTCOMES.DONE;
    case '0001':
      return PAYMENT_OUTCOMES.DECLINED;
    case '0002':
      return PAYMENT_OUTCOMES.LIMIT;
    case '9999':
      return PAYMENT_OUTCOMES.TIMEOUT;
    default:
      return PAYMENT_OUTCOMES.DONE; // 기본 해피패스
  }
}
