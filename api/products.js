/**
 * api/products.js - 상품 목록 API
 *
 * GET /api/products?category=카테고리
 * - 상품 데이터는 Postgres에서 조회 (시드: api/_lib/seedData.js)
 * - 토큰은 선택 사항: 있으면 user에 사용자 정보, 없거나 유효하지 않으면 null (인증 필수 아님)
 * - 기존 응답 형태 유지: { user, products } + 각 상품에 정적 details 배열
 *   (이제 DB의 실제 description/specs/images/tags/stock 필드와 함께 제공)
 */

import jwt from 'jsonwebtoken';
import { applyCors, getToken, SECRET } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { listProducts } from './_lib/store.js';

// 기존 목록 응답의 정적 안내 문구 (실제 description과 함께 유지)
const STATIC_DETAILS = [
  '정품 보증',
  '빠른 배송',
  '안전 포장',
  '교환/환불 가능',
  '상세 스펙은 상품 정보 참고',
];

export default async function productsRoutes(req, res) {
  // CORS 처리 (OPTIONS 프리플라이트 포함)
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ message: '허용되지 않은 요청', code: 'METHOD_NOT_ALLOWED' });
  }

  // DB 미설정 시 503 (인메모리 폴백 없음 — 단일 코드 경로)
  if (!isConfigured()) return respondDbNotConfigured(res);

  // 토큰은 선택: 있으면 사용자 정보 포함, 없거나 유효하지 않으면 null (목록 조회는 인증 불필요)
  let user = null;
  const token = getToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      user = { username: decoded.username, role: decoded.role };
    } catch {
      user = null;
    }
  }

  try {
    const { category } = req.query || {};
    const products = await listProducts({ category });

    const safeProducts = products.map((p) => ({
      ...p,
      details: STATIC_DETAILS,
    }));

    return res.status(200).json({
      user,
      products: safeProducts,
    });
  } catch (error) {
    console.error('Products API error:', error);
    return res
      .status(500)
      .json({ message: '서버 내부 오류', code: 'INTERNAL_SERVER_ERROR' });
  }
}
