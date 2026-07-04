/**
 * api/_lib/coupon-utils.js - 쿠폰 검증/할인 계산 공용 헬퍼
 *
 * api/coupons.js(쿠폰 검증 API)와 api/user-actions.js(주문 시 쿠폰 적용)가
 * 동일한 규칙과 에러 코드를 공유하도록 한 곳에서 관리한다.
 */

/**
 * 쿠폰 검증 + 할인액 계산
 *
 * @param {object|null} coupon 스토어(getCoupon)에서 조회한 쿠폰 (없으면 null)
 * @param {number} orderAmount 주문 금액 (양수 검증은 호출부에서 완료된 상태)
 * @returns {{ error: { status, message, code } } | { result: { valid, code, type, amount, discount, finalAmount } }}
 */
export function computeCoupon(coupon, orderAmount) {
  // 없거나 비활성 쿠폰은 존재 여부를 숨기고 동일하게 404
  if (!coupon || !coupon.active) {
    return {
      error: { status: 404, message: '존재하지 않는 쿠폰입니다', code: 'COUPON_NOT_FOUND' },
    };
  }

  // 의도적 테스트 시나리오: 만료된 쿠폰 (EXPIRED10 픽스처) -> 400
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return {
      error: { status: 400, message: '만료된 쿠폰입니다', code: 'COUPON_EXPIRED' },
    };
  }

  const minOrder = coupon.minOrder ?? 0;
  if (orderAmount < minOrder) {
    return {
      error: {
        status: 400,
        message: `최소주문금액 ${minOrder.toLocaleString('ko-KR')}원 이상부터 사용할 수 있는 쿠폰입니다`,
        code: 'MIN_ORDER_NOT_MET',
      },
    };
  }

  let discount;
  if (coupon.type === 'percent') {
    // 정률 할인: 최대 할인 한도(max_discount)까지만
    discount = Math.floor((orderAmount * coupon.amount) / 100);
    if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    // 정액 할인: 주문 금액을 초과할 수 없다
    discount = Math.min(coupon.amount, orderAmount);
  }

  return {
    result: {
      valid: true,
      code: coupon.code,
      type: coupon.type,
      amount: coupon.amount,
      discount,
      finalAmount: orderAmount - discount,
    },
  };
}
