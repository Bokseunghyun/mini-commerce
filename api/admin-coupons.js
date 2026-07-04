/**
 * api/admin-coupons.js – 관리자 쿠폰 관리 (인증 필수, ADMIN 역할 필수)
 *
 * Endpoints (모두 /api/admin/coupons):
 *   GET  – 전체 쿠폰 목록 조회
 *   POST – 쿠폰 생성 (body: { code, type, amount, minOrder?, maxDiscount?, expiresAt? })
 *
 * 쿠폰 데이터는 Postgres coupons 테이블에 저장된다.
 * (초기 상태로 되돌리려면 POST /api/reset 또는 npm run db:init)
 *
 * QA 검증 포인트:
 *   - 비로그인 → 401
 *   - 일반 유저(test) 로그인 → 403
 *   - admin 로그인 후 생성/조회 정상 동작
 *   - 유효성 검사 실패(코드/타입/금액/만료일) → 400
 *   - 중복 코드 → 409
 */

import { applyCors, requireUser, requireAdmin } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { createCoupon, listCoupons } from './_lib/store.js';

const COUPON_CODE_RE = /^[A-Z0-9]{4,20}$/i;
const COUPON_TYPES = ['percent', 'fixed'];

// 양의 정수 여부 검증 (문자열 숫자도 허용, NaN/Infinity/소수/0/음수 거부)
function isPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

// 0 이상 정수 여부 검증
function isNonNegativeInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0;
}

// ============================================
// GET – 전체 쿠폰 목록
// ============================================
async function handleGet(req, res) {
  const coupons = await listCoupons();
  return res.status(200).json({ count: coupons.length, coupons });
}

// ============================================
// POST – 쿠폰 생성
// ============================================
async function handlePost(req, res) {
  const body = req.body || {};
  const { code, type, amount, minOrder, maxDiscount, expiresAt } = body;

  // 코드: 영숫자 4~20자
  if (typeof code !== 'string' || !COUPON_CODE_RE.test(code.trim())) {
    return res.status(400).json({
      message: '쿠폰 코드는 영문/숫자 4~20자여야 합니다',
      code: 'INVALID_COUPON_CODE',
    });
  }

  // 타입: percent / fixed
  if (!COUPON_TYPES.includes(type)) {
    return res.status(400).json({
      message: "쿠폰 타입은 'percent' 또는 'fixed' 여야 합니다",
      code: 'INVALID_COUPON_TYPE',
    });
  }

  // 금액: 양의 정수, percent 는 1~100
  if (!isPositiveInt(amount) || (type === 'percent' && Number(amount) > 100)) {
    return res.status(400).json({
      message:
        type === 'percent'
          ? '정률 쿠폰의 할인율은 1~100 사이 정수여야 합니다'
          : '할인 금액은 1 이상의 정수여야 합니다',
      code: 'INVALID_COUPON_AMOUNT',
    });
  }

  // 최소주문금액: 생략 가능, 오면 0 이상 정수
  if (minOrder !== undefined && minOrder !== null && !isNonNegativeInt(minOrder)) {
    return res.status(400).json({
      message: '최소주문금액은 0 이상의 정수여야 합니다',
      code: 'INVALID_COUPON_AMOUNT',
    });
  }

  // 최대할인금액: null/생략 가능, 오면 양의 정수
  if (
    maxDiscount !== undefined &&
    maxDiscount !== null &&
    !isPositiveInt(maxDiscount)
  ) {
    return res.status(400).json({
      message: '최대할인금액은 1 이상의 정수여야 합니다',
      code: 'INVALID_COUPON_AMOUNT',
    });
  }

  // 만료일: null/생략 가능, 오면 유효한 날짜여야 함
  let expiresAtValue = null;
  if (expiresAt !== undefined && expiresAt !== null && String(expiresAt).trim() !== '') {
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({
        message: '만료일 형식이 올바르지 않습니다',
        code: 'INVALID_COUPON_EXPIRY',
      });
    }
    expiresAtValue = parsed.toISOString();
  }

  try {
    const coupon = await createCoupon({
      code: code.trim(),
      type,
      amount: Number(amount),
      minOrder:
        minOrder === undefined || minOrder === null ? 0 : Number(minOrder),
      maxDiscount:
        maxDiscount === undefined || maxDiscount === null
          ? null
          : Number(maxDiscount),
      expiresAt: expiresAtValue,
      active: true,
    });

    return res.status(201).json({
      message: '쿠폰이 생성되었습니다',
      coupon,
    });
  } catch (err) {
    // 중복 코드 -> 409
    if (err.code === 'COUPON_EXISTS') {
      return res.status(409).json({
        message: '이미 존재하는 쿠폰 코드입니다',
        code: 'COUPON_EXISTS',
      });
    }
    throw err;
  }
}

// ============================================
// 메인 핸들러 – HTTP 메서드로 분기
// ============================================
export default async function adminCouponsHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (인메모리 폴백 없음 — 단일 코드 경로)
  if (!isConfigured()) return respondDbNotConfigured(res);

  // 인증 검증 (토큰 필수)
  const user = requireUser(req, res);
  if (!user) return; // 401 이미 응답됨

  // 관리자 권한 검증 (role === 'ADMIN')
  if (!requireAdmin(user, res)) return; // 403 이미 응답됨

  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        return res.status(405).json({
          message: '허용되지 않은 메서드',
          code: 'METHOD_NOT_ALLOWED',
        });
    }
  } catch (error) {
    console.error('Admin Coupons API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
