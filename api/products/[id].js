// api/products/[id].js — 상품 상세 조회
// 상품 데이터는 Postgres에서 조회하므로 admin CRUD 결과가 상세에도 반영된다.
import { applyCors } from '../_lib/common.js';
import { isConfigured, respondDbNotConfigured } from '../_lib/db.js';
import { getProduct } from '../_lib/store.js';

// 기존 상세 응답의 정적 안내 문구 (실제 description과 함께 유지)
const STATIC_DETAILS = [
  '정품 보증',
  '빠른 배송',
  '안전 포장',
  '교환/환불 가능',
  '상세 스펙은 상품 정보 참고',
];

export default async function productDetail(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ message: '허용되지 않은 요청', code: 'METHOD_NOT_ALLOWED' });
  }

  //  Vercel 동적 라우트는 req.query.id 로 들어옴
  const { id } = req.query || {};
  const productId = Number(id);

  if (!id || !Number.isFinite(productId) || productId <= 0) {
    return res
      .status(400)
      .json({ message: 'id 파라미터 오류', code: 'INVALID_ID' });
  }

  // 의도적 테스트 시나리오 (요구사항 1): id 3, 4번은 조회 전에 무조건 500 반환
  if (productId === 3 || productId === 4) {
    return res
      .status(500)
      .json({ message: '서버 내부 오류', code: 'INTERNAL_SERVER_ERROR' });
  }

  // 의도적 테스트 시나리오: id 16번은 저장소 조회 전에 무조건 404 반환
  if (productId === 16) {
    return res
      .status(404)
      .json({ message: '상품 없음', code: 'PRODUCT_NOT_FOUND' });
  }

  // DB 미설정 시 503 (의도적 픽스처는 위에서 이미 처리되므로 DB 없이도 동작)
  if (!isConfigured()) return respondDbNotConfigured(res);

  try {
    // Postgres에서 조회 (admin 추가/수정/삭제 반영)
    const product = await getProduct(productId);
    if (!product) {
      return res
        .status(404)
        .json({ message: '상품 없음', code: 'PRODUCT_NOT_FOUND' });
    }

    // 기존 top-level 필드 유지 + DB의 description/specs/images/tags/stock 포함
    return res.status(200).json({
      ...product,
      details: STATIC_DETAILS,
    });
  } catch (error) {
    console.error('Product detail API error:', error);
    return res
      .status(500)
      .json({ message: '서버 내부 오류', code: 'INTERNAL_SERVER_ERROR' });
  }
}
