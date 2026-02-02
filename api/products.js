import { applyCors } from './_lib/common.js';
import { PRODUCTS } from './_data/products.js';

export default async function productsRoutes(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  const user = req.user;

  const safeProducts = PRODUCTS.map((p) => ({
    ...p,
    description: `${p.name} 상품입니다.`,
    details: [
      "정품 보증",
      "빠른 배송",
      "안전 포장",
      "교환/환불 가능",
      "상세 스펙은 상품 정보 참고",
    ],
  }));

  return res.status(200).json({
    user,
    products: safeProducts,
  });
}
