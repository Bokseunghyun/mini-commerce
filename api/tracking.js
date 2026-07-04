/**
 * api/tracking.js - 배송 추적 (모의 택배 API)
 *
 * GET /api/tracking?trackingNumber=MC0000000000
 * GET /api/tracking?orderId=ORD-YYYYMMDD-XXXX   (인증 필요)
 *
 * 외부 택배사 API 를 흉내낸 엔드포인트 — 자동화의 "외부 API 모킹" 연습 대상.
 *   - trackingNumber 로 조회하는 경로는 공개 (외부 택배 조회 느낌).
 *     단, 해당 송장번호의 주문이 존재해야 한다 (없으면 404 TRACKING_NOT_FOUND).
 *   - orderId 로 조회하는 경로는 인증 필요 + 본인 주문만 (관리자는 전체).
 *
 * 응답: 200 { trackingNumber, status, events: [{ status, label, at, location }] }
 *   events 는 order.status/createdAt 기반으로 결정론적 파생 (getTrackingEvents).
 *
 * QA 검증 포인트:
 *   - 없는 송장번호/주문 → 404 TRACKING_NOT_FOUND
 *   - orderId 경로는 인증 필요 (401), 타인 주문은 404 (존재 여부 비노출)
 *   - status 에 맞는 이벤트 타임라인이 반환되는지
 *   - GET 외 메서드 → 405
 */

import { applyCors, requireUser } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import {
  getOrder,
  getOrderByTrackingNumber,
  getTrackingEvents,
} from './_lib/store.js';

function respondTrackingNotFound(res) {
  return res.status(404).json({
    message: '배송 추적 정보를 찾을 수 없습니다',
    code: 'TRACKING_NOT_FOUND',
  });
}

function trackingResponse(res, order) {
  return res.status(200).json({
    trackingNumber: order.trackingNumber ?? null,
    status: order.status,
    events: getTrackingEvents(order),
  });
}

async function handleGet(req, res) {
  const { trackingNumber, orderId } = req.query || {};

  // 1) 송장번호 경로 (공개) — 주문이 존재해야 함
  if (trackingNumber !== undefined && String(trackingNumber).trim() !== '') {
    const order = await getOrderByTrackingNumber(trackingNumber);
    if (!order) {
      return respondTrackingNotFound(res);
    }
    return trackingResponse(res, order);
  }

  // 2) orderId 경로 (인증 필요, 본인 주문만 / 관리자는 전체)
  if (orderId !== undefined && String(orderId).trim() !== '') {
    const user = requireUser(req, res);
    if (!user) return; // 401 이미 응답됨

    const found = await getOrder(String(orderId).trim());
    const isAdmin = user.role === 'ADMIN';

    // 없는 주문/타인 주문은 동일하게 404 (존재 여부 비노출)
    if (!found || (!isAdmin && found.order.username !== user.username)) {
      return respondTrackingNotFound(res);
    }
    return trackingResponse(res, found.order);
  }

  return res.status(400).json({
    message: 'trackingNumber 또는 orderId 파라미터가 필요합니다',
    code: 'TRACKING_QUERY_REQUIRED',
  });
}

export default async function trackingHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (단일 코드 경로 — 인메모리 폴백 없음)
  if (!isConfigured()) return respondDbNotConfigured(res);

  try {
    if (req.method === 'GET') {
      return await handleGet(req, res);
    }
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['GET'],
    });
  } catch (error) {
    console.error('Tracking API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
