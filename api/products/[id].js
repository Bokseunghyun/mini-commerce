// api/products/[id].js

const PRODUCTS = [
  { id: 1, name: '무선 마우스', price: 25000, description: '정상 상품' },
  { id: 2, name: '기계식 키보드', price: 89000, description: '정상 상품' },
  { id: 3, name: '주문불가 상품', price: 30000 },
  { id: 4, name: '주문불가 상품', price: 40000 },
];

export default function handler(req, res) {
  // path 기반으로 id 추출
  // 예: /api/products/1 → ['','api','products','1']
  const parts = req.url.split('/');
  const id = Number(parts[parts.length - 1]);

  if (isNaN(id)) {
    return res.status(400).json({ message: '잘못된 상품 ID' });
  }

  // 3,4번 상품은 진입 차단
  if (id === 3 || id === 4) {
    return res.status(403).json({ message: '상세조회 불가 (의도적 차단)' });
  }

  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ message: '상품 없음' });
  }

  return res.status(200).json(product);
}
