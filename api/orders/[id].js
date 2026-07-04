/**
 * api/orders/[id].js - 주문 상세/취소 API (Vercel 동적 라우트)
 *
 * GET   /api/orders/:id - 주문 상세 조회 (본인 주문만, 관리자는 전체)
 * PATCH /api/orders/:id - { action: 'cancel' } 주문 취소 (PAID -> CANCELED + 재고 원복)
 *
 * QA 검증 포인트:
 * - 타인 주문 조회는 존재 여부를 숨기기 위해 403이 아닌 404를 반환한다
 * - 이미 취소된 주문 재취소 시 409 ALREADY_CANCELED
 * - 취소 시 주문 상품 재고가 원복되는지 (/api/inventory로 확인)
 */

import { applyCors, requireUser } from '../_lib/common.js';
import { isConfigured, respondDbNotConfigured } from '../_lib/db.js';
import { getOrder, cancelOrder } from '../_lib/store.js';

function respondNotFound(res) {
  return res.status(404).json({
    message: '주문을 찾을 수 없습니다',
    code: 'ORDER_NOT_FOUND',
  });
}

// GET - 주문 상세 (items 포함)
async function handleGet(req, res, user, orderId, isAdmin) {
  const found = await getOrder(orderId);

  // 없는 주문과 타인 주문은 동일하게 404 (존재 여부 비노출)
  if (!found || (!isAdmin && found.order.username !== user.username)) {
    return respondNotFound(res);
  }

  return res.status(200).json({
    order: { ...found.order, items: found.items },
  });
}

// PATCH - 주문 취소 { action: 'cancel' }
async function handlePatch(req, res, user, orderId, isAdmin) {
  const { action } = req.body || {};

  if (action !== 'cancel') {
    return res.status(400).json({
      message: `지원하지 않는 action: ${action ?? '(없음)'}`,
      code: 'UNSUPPORTED_ACTION',
      availableActions: ['cancel'],
    });
  }

  try {
    const canceled = await cancelOrder(orderId, user.username, { isAdmin });
    // 없는 주문/타인 주문은 동일하게 404 (존재 여부 비노출)
    if (!canceled) {
      return respondNotFound(res);
    }
    return res.status(200).json({
      message: '주문이 취소되었습니다',
      order: canceled,
    });
  } catch (err) {
    if (err.code === 'ALREADY_CANCELED') {
      return res.status(409).json({
        message: '이미 취소된 주문입니다',
        code: 'ALREADY_CANCELED',
      });
    }
    if (err.code === 'CANCEL_NOT_ALLOWED') {
      return res.status(409).json({
        message: '취소할 수 없는 주문 상태입니다',
        code: 'CANCEL_NOT_ALLOWED',
      });
    }
    throw err;
  }
}

export default async function orderDetailHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (단일 코드 경로 — 인메모리 폴백 없음)
  if (!isConfigured()) return respondDbNotConfigured(res);

  // 인증 필수
  const user = requireUser(req, res);
  if (!user) return; // 401 이미 응답됨

  const orderId = String(req.query.id ?? '').trim();
  const isAdmin = user.role === 'ADMIN';

  try {
    if (req.method === 'GET') {
      return await handleGet(req, res, user, orderId, isAdmin);
    }
    if (req.method === 'PATCH') {
      return await handlePatch(req, res, user, orderId, isAdmin);
    }
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['GET', 'PATCH'],
    });
  } catch (error) {
    console.error('Order detail API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
