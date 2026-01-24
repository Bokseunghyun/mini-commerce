// api/order.js
export async function orderRoutes(req, res) {
  const { items } = req.body;

  if (!items || items.length === 0) return res.status(400).json({ message: '장바구니가 비어 있습니다' });

  const hasErrorProduct = items.some(p => p.id === 3 || p.id === 4);
  if (hasErrorProduct) return res.status(500).json({ message: '주문불가 상품이 포함되어 있습니다' });

  const total = items.reduce((sum, p) => sum + p.price, 0);
  return res.status(200).json({ message: '주문 성공', total, orderId: Math.floor(Math.random() * 1000000) });
}
