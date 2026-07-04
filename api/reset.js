/**
 * api/reset.js - 테스트 상태 초기화 API
 *
 * POST /api/reset - 모든 데이터를 시드 상태로 되돌린다 (Postgres TRUNCATE + 재시드)
 *
 * QA 자동화 테스트의 사전조건(clean state) 세팅용:
 *   - products  : admin CRUD/주문으로 변경된 상품·재고 초기화 (의도적 픽스처 재고 포함)
 *   - users     : 시드 계정(test/admin/test2)만 남기고 가입 계정 삭제
 *   - reviews   : 작성/수정/삭제된 리뷰 초기화
 *   - wishlists : 사용자별 위시리스트 전체 비우기
 *   - carts     : 사용자별 장바구니 전체 비우기
 *   - orders    : 주문/주문 항목 전체 삭제
 *   - coupons   : 쿠폰 초기화 (의도적 만료 픽스처 EXPIRED10 포함)
 *
 * 모든 상태가 Postgres에 있으므로 Vercel 서버리스 인스턴스가 여러 개여도
 * 리셋 결과가 전체 사용자에게 일관되게 반영된다.
 */

import { applyCors } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { ensureSchema, resetAll } from './_lib/store.js';

export default async function resetHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (단일 코드 경로 — 인메모리 폴백 없음)
  if (!isConfigured()) return respondDbNotConfigured(res);

  // POST만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    await ensureSchema();
    const reset = await resetAll();

    return res.status(200).json({
      message: '모든 데이터가 초기화되었습니다',
      reset,
    });
  } catch (error) {
    console.error('Reset API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
