export default async function orderRoutes(req, res) {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: '인증 실패: req.user 없음' });

    const userKey = user.username;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: '장바구니가 비어 있습니다' });

    const hasUnorderable = items.some(i => PRODUCTS.find(p => p.id === i.id)?.orderable === false);
    if (hasUnorderable) return res.status(400).json({ message: '주문불가 상품 포함' });

    const totalPrice = items.reduce((sum, i) => sum + i.price * (i.quantity || 1), 0);

    const order = {
      orderId: `ORDER-${Date.now()}`,
      user: user.username,
      items,
      totalPrice,
      orderedAt: new Date().toISOString(),
    };

    CART[userKey] = [];

    return res.status(201).json({ message: '주문 완료', order, total: totalPrice });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '서버 에러', error: err.message });
  }
}
