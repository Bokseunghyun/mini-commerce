/**
 * api/coupons.js - 쿠폰 검증 API
 *
 * POST /api/coupons - { code, orderAmount } 쿠폰 유효성 검증 + 할인액 계산
 *
 * QA 검증 포인트:
 * - 존재하지 않는/비활성 쿠폰 404
 * - 만료된 쿠폰 400 (의도적 픽스처: EXPIRED10)
 * - 최소주문금액 미달 400 (SAVE5000, VIP20)
 * - 정률 쿠폰의 최대 할인 한도(max_discount) 적용 (WELCOME10, VIP20)
 *
 * 할인 계산 규칙은 주문(api/user-actions.js action=order)과
 * 동일해야 하므로 _lib/coupon-utils.js의 computeCoupon을 공유한다.
 */

import { applyCors } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { getCoupon } from './_lib/store.js';
import { computeCoupon } from './_lib/coupon-utils.js';

export default async function couponsHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (단일 코드 경로 — 인메모리 폴백 없음)
  if (!isConfigured()) return respondDbNotConfigured(res);

  if (req.method !== 'POST') {
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['POST'],
    });
  }

  try {
    const body = req.body || {};
    const code = String(body.code ?? '').trim();
    const orderAmount = Number(body.orderAmount);

    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      return res.status(400).json({
        message: '주문 금액은 0보다 큰 숫자여야 합니다',
        code: 'INVALID_AMOUNT',
      });
    }

    const coupon = await getCoupon(code);
    const { error, result } = computeCoupon(coupon, orderAmount);
    if (error) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Coupons API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
