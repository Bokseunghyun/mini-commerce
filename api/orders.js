/**
 * api/orders.js - 주문 목록 API
 *
 * GET /api/orders - 내 주문 목록 (최신순, items 포함)
 *   - 관리자는 전체 주문을 조회하며 각 주문에 username이 포함된다
 *
 * QA 검증 포인트:
 * - 인증 필수 (401 AUTH_NO_TOKEN / AUTH_INVALID_TOKEN)
 * - 일반 사용자는 본인 주문만 보인다
 * - 주문 취소 후 status가 CANCELED로 바뀌는지
 */

import { applyCors, requireUser } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { listOrders } from './_lib/store.js';

// 응답용 주문 형태 (관리자 조회일 때만 username 노출)
function toOrderResponse(order, { withUsername = false } = {}) {
  return {
    id: order.id,
    ...(withUsername ? { username: order.username } : {}),
    status: order.status,
    totalPrice: order.totalPrice,
    discount: order.discount,
    finalPrice: order.finalPrice,
    couponCode: order.couponCode,
    createdAt: order.createdAt,
    items: order.items ?? [],
  };
}

export default async function ordersHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (단일 코드 경로 — 인메모리 폴백 없음)
  if (!isConfigured()) return respondDbNotConfigured(res);

  if (req.method !== 'GET') {
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['GET'],
    });
  }

  // 인증 필수
  const user = requireUser(req, res);
  if (!user) return; // 401 이미 응답됨

  try {
    const isAdmin = user.role === 'ADMIN';
    const orders = await listOrders(user.username, { all: isAdmin });

    return res.status(200).json({
      count: orders.length,
      orders: orders.map((o) => toOrderResponse(o, { withUsername: isAdmin })),
    });
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
