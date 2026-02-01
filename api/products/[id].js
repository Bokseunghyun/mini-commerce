// api/products/[id].js
import { applyCors } from '../_lib/common.js';
import { PRODUCTS } from '../_data/products.js';

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

  const safeProducts = PRODUCTS.map((p) => ({
    ...p,
    description: p.description || `${p.name} 상품입니다.`,
    details: p.details || [
      '정품 보증',
      '빠른 배송',
      '안전 포장',
      '교환/환불 가능',
      '상세 스펙은 상품 정보 참고',
    ],
  }));

  const product = safeProducts.find((p) => p.id === productId);
  if (!product) {
    return res
      .status(404)
      .json({ message: '상품 없음', code: 'PRODUCT_NOT_FOUND' });
  }

  // 의도적 장애 유지 (3,4번 상세 진입 시 500)
  if (product.id === 3 || product.id === 4) {
    return res.status(500).json({
      message: '상품 조회 실패 (의도적 장애)',
      code: 'PRODUCT_INTENTIONAL_FAIL',
    });
  }

  return res.status(200).json(product);
}
