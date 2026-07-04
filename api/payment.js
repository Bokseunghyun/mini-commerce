/**
 * api/payment.js - Mock 결제 게이트웨이 (이니시스 스타일, QA 연습용)
 *
 * POST /api/payment (인증 필수)
 *   body: { cardNumber, cardExpiry?, cardCvc?, amount, orderName? }
 *   - cardNumber: 공백/하이픈 제거 후 숫자 12~19자리 (아니면 400 INVALID_CARD)
 *   - amount: 양의 정수 (아니면 400 INVALID_AMOUNT)
 *
 *   결과는 카드번호 뒤 4자리로 결정론적으로 정해진다 (랜덤 아님):
 *     ...0000 -> 201 승인 (payment status=DONE)
 *     ...0001 -> 402 PAYMENT_DECLINED         (status=DECLINED, fault=DECLINED)
 *     ...0002 -> 402 PAYMENT_LIMIT_EXCEEDED    (status=DECLINED, fault=LIMIT)
 *     ...9999 -> 504 PAYMENT_GATEWAY_TIMEOUT   (status=FAILED,   fault=TIMEOUT) — 외부 PG 무응답 시뮬레이션(짧은 지연 후 응답)
 *     그 외    -> 201 승인 (기본 해피패스)
 *
 *   ?simulate=decline|limit|timeout|error 쿼리로 카드와 무관하게 결과 강제 (API 모킹 연습용).
 *     error -> 500 PAYMENT_ERROR
 *   (paymentKey 는 crypto.randomUUID 기반 — 테스트가 단언하는 값이 아니다.
 *    결정론적 결과는 오직 카드번호/simulate 로만 정해진다.)
 *
 * GET /api/payment?paymentKey=... (인증 필수)
 *   -> 200 결제 레코드 | 404 PAYMENT_NOT_FOUND (검증 연습용)
 *
 * 그 외 메서드 -> 405
 */

import { randomUUID } from 'crypto';
import { applyCors, requireUser } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { createPayment, getPayment } from './_lib/store.js';
import {
  normalizeCardNumber,
  isValidCardNumber,
  resolveOutcome,
} from './_lib/payment-utils.js';

// 외부 PG 무응답을 흉내내는 지연 (짧게 — 테스트 지연 최소화)
const TIMEOUT_DELAY_MS = 500;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 'PAY-' + UUID 로 결제키 생성 (Date.now()/Math.random 사용 금지)
function generatePaymentKey() {
  return `PAY-${randomUUID()}`;
}

// GET /api/payment?paymentKey= -> 결제 레코드 조회
async function handleGet(req, res) {
  const paymentKey = req.query?.paymentKey;
  if (!paymentKey) {
    return res.status(400).json({
      message: 'paymentKey 파라미터가 필요합니다',
      code: 'PAYMENT_KEY_REQUIRED',
    });
  }

  const payment = await getPayment(String(paymentKey));
  if (!payment) {
    return res.status(404).json({
      message: '결제 정보를 찾을 수 없습니다',
      code: 'PAYMENT_NOT_FOUND',
    });
  }

  return res.status(200).json(payment);
}

// POST /api/payment -> 카드 결제 처리 (결정론적)
async function handlePost(req, res, user) {
  const body = req.body || {};

  // 카드번호 검증 (공백/하이픈 제거 후 숫자 12~19자리)
  const normalized = normalizeCardNumber(body.cardNumber);
  if (!isValidCardNumber(normalized)) {
    return res.status(400).json({
      message: '유효하지 않은 카드번호입니다',
      code: 'INVALID_CARD',
    });
  }

  // 금액 검증 (양의 정수)
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({
      message: '결제 금액은 0보다 큰 정수여야 합니다',
      code: 'INVALID_AMOUNT',
    });
  }

  const cardLast4 = normalized.slice(-4);
  const simulate = req.query?.simulate;
  const outcome = resolveOutcome(normalized, simulate);

  // 승인(DONE) — 결제 레코드 생성 후 201
  if (outcome.outcome === 'DONE') {
    const paymentKey = generatePaymentKey();
    const payment = await createPayment({
      id: paymentKey,
      orderId: null, // 주문 연결은 주문 생성 시 markPaymentUsed 로 갱신
      username: user.username,
      method: 'CARD',
      cardLast4,
      amount,
      status: 'DONE',
      fault: null,
    });

    return res.status(201).json({
      paymentKey: payment.id,
      status: payment.status,
      method: payment.method,
      cardLast4: payment.cardLast4,
      amount: payment.amount,
    });
  }

  // 타임아웃(외부 PG 무응답) — 짧은 지연 후 FAILED 기록하고 504
  if (outcome.outcome === 'TIMEOUT') {
    await delay(TIMEOUT_DELAY_MS);
    await createPayment({
      id: generatePaymentKey(),
      orderId: null,
      username: user.username,
      method: 'CARD',
      cardLast4,
      amount,
      status: outcome.status, // FAILED
      fault: outcome.fault, // TIMEOUT
    });
    return res.status(outcome.httpStatus).json({
      message: outcome.message,
      code: outcome.code,
    });
  }

  // 강제 에러(?simulate=error) — FAILED 기록하고 500
  if (outcome.outcome === 'ERROR') {
    await createPayment({
      id: generatePaymentKey(),
      orderId: null,
      username: user.username,
      method: 'CARD',
      cardLast4,
      amount,
      status: outcome.status, // FAILED
      fault: outcome.fault, // ERROR
    });
    return res.status(outcome.httpStatus).json({
      message: outcome.message,
      code: outcome.code,
    });
  }

  // 거절 / 한도초과 — DECLINED 기록하고 402
  await createPayment({
    id: generatePaymentKey(),
    orderId: null,
    username: user.username,
    method: 'CARD',
    cardLast4,
    amount,
    status: outcome.status, // DECLINED
    fault: outcome.fault, // DECLINED | LIMIT
  });
  return res.status(outcome.httpStatus).json({
    message: outcome.message,
    code: outcome.code,
  });
}

export default async function paymentHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (단일 코드 경로 — 인메모리 폴백 없음)
  if (!isConfigured()) return respondDbNotConfigured(res);

  try {
    // 인증 필수
    const user = requireUser(req, res);
    if (!user) return; // 401 이미 응답됨

    if (req.method === 'GET') {
      return await handleGet(req, res);
    }
    if (req.method === 'POST') {
      return await handlePost(req, res, user);
    }

    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['GET', 'POST'],
    });
  } catch (error) {
    console.error('Payment API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
