export default function handler(req, res) {
  const PRODUCTS = [
    { id: 1, name: '무선 마우스', price: 25000, description: '정상 상품' },
    { id: 2, name: '기계식 키보드', price: 89000, description: '정상 상품' },
    { id: 3, name: '주문불가 상품', price: 30000 },
    { id: 4, name: '주문불가 상품', price: 40000 },
  ];

  // URL segment에서 id 추출
  let id = Number(req.url.split('/').pop());

  //  query id fallback
  if (!id || isNaN(id)) {
    id = Number(req.query.id);
  }

  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return res.status(404).json({ message: '상품 없음' });
  if (id === 3 || id === 4)
    return res.status(500).json({ message: '상품 조회 실패 (의도적 장애)' });

  return res.status(200).json(product);
}
