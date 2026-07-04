/**
 * api/orders/[id].js - 주문 상세/취소 API (Vercel 동적 라우트)
 *
 * GET   /api/orders/:id - 주문 상세 조회 (본인 주문만, 관리자는 전체)
 * PATCH /api/orders/:id - action 기반 상태 변경
 *   - { action: 'cancel' }             주문 취소 (PAID -> CANCELED + 재고 원복)
 *   - { action: 'advance' }            다음 단계로 전진 (본인/관리자)
 *                                      PAID -> PREPARING -> SHIPPING -> DELIVERED
 *                                      (SHIPPING 진입 시 송장번호 부여)
 *   - { action: 'set_status', status } 상태 명시 지정 (관리자 전용)
 *
 * QA 검증 포인트:
 * - 타인 주문 조회는 존재 여부를 숨기기 위해 403이 아닌 404를 반환한다
 * - 이미 취소된 주문 재취소 시 409 ALREADY_CANCELED
 * - 취소 시 주문 상품 재고가 원복되는지 (/api/inventory로 확인)
 * - 종료 상태(DELIVERED/CANCELED)에서 advance 시 409 INVALID_TRANSITION
 * - set_status 는 관리자만 (비관리자 403), 허용되지 않은 상태 400 INVALID_STATUS
 */

import { applyCors, requireUser } from '../_lib/common.js';
import { isConfigured, respondDbNotConfigured } from '../_lib/db.js';
import {
  getOrder,
  cancelOrder,
  advanceOrderStatus,
  setOrderStatus,
} from '../_lib/store.js';

const AVAILABLE_ACTIONS = ['cancel', 'advance', 'set_status'];

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

// PATCH { action: 'cancel' } - 주문 취소 (PAID -> CANCELED + 재고 원복)
async function handleCancel(req, res, user, orderId, isAdmin) {
  try {
    const canceled = await cancelOrder(orderId, user.username, { isAdmin });
    // 없는 주문/타인 주문은 동일하게 404 (존재 여부 비노출)
    if (!canceled) {
      return respondNotFound(res);
    }
    // 결제가 함께 취소되었으면 안내 문구에 반영 (이니시스/카드 공통)
    const paymentNote = canceled.paymentCanceled
      ? canceled.paymentMethod === 'INICIS'
        ? ' 이니시스 결제도 함께 취소되었습니다.'
        : ' 결제도 함께 취소되었습니다.'
      : '';
    return res.status(200).json({
      message: `주문이 취소되었습니다.${paymentNote}`,
      order: canceled,
      paymentCanceled: !!canceled.paymentCanceled,
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

// PATCH { action: 'advance' } - 다음 배송 단계로 전진 (본인/관리자)
async function handleAdvance(req, res, user, orderId, isAdmin) {
  try {
    const advanced = await advanceOrderStatus(orderId, user.username, { isAdmin });
    // 없는 주문/타인 주문은 동일하게 404 (존재 여부 비노출)
    if (!advanced) {
      return respondNotFound(res);
    }
    return res.status(200).json({
      message: `주문 상태가 변경되었습니다: ${advanced.status}`,
      order: advanced,
    });
  } catch (err) {
    if (err.code === 'INVALID_TRANSITION') {
      return res.status(409).json({
        message: '더 이상 진행할 수 없는 주문 상태입니다',
        code: 'INVALID_TRANSITION',
        currentStatus: err.currentStatus,
      });
    }
    throw err;
  }
}

// PATCH { action: 'set_status', status } - 상태 명시 지정 (관리자 전용)
async function handleSetStatus(req, res, user, orderId, isAdmin) {
  // 관리자 전용
  if (!isAdmin) {
    return res.status(403).json({
      message: '관리자 권한이 필요합니다',
      code: 'AUTH_FORBIDDEN',
    });
  }

  const { status } = req.body || {};

  try {
    const updated = await setOrderStatus(orderId, status, {
      isAdmin,
      username: user.username,
    });
    // 없는 주문은 404
    if (!updated) {
      return respondNotFound(res);
    }
    return res.status(200).json({
      message: `주문 상태가 변경되었습니다: ${updated.status}`,
      order: updated,
    });
  } catch (err) {
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({
        message: '허용되지 않은 주문 상태입니다',
        code: 'INVALID_STATUS',
      });
    }
    throw err;
  }
}

// PATCH 디스패처 - action 별 분기
async function handlePatch(req, res, user, orderId, isAdmin) {
  const { action } = req.body || {};

  switch (action) {
    case 'cancel':
      return handleCancel(req, res, user, orderId, isAdmin);
    case 'advance':
      return handleAdvance(req, res, user, orderId, isAdmin);
    case 'set_status':
      return handleSetStatus(req, res, user, orderId, isAdmin);
    default:
      return res.status(400).json({
        message: `지원하지 않는 action: ${action ?? '(없음)'}`,
        code: 'UNSUPPORTED_ACTION',
        availableActions: AVAILABLE_ACTIONS,
      });
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
