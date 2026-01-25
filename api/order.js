// 기존 PRODUCTS와 CART 그대로 사용
export default async function orderRoutes(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: '인증 실패: req.user 없음' });
    }

    const userKey = user.username;

    if (req.method !== 'POST') {
      return res.status(405).json({ message: '허용되지 않은 요청' });
    }

    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '장바구니가 비어 있습니다', body: req.body });
    }

    const hasUnorderable = items.some(item => {
      const prod = PRODUCTS.find(p => p.id === item.id);
      return prod && !prod.orderable;
    });

    if (hasUnorderable) {
      return res.status(400).json({ message: '주문불가 상품이 포함되어 있습니다', items });
    }

    const totalPrice = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

    const order = {
      orderId: `ORDER-${Date.now()}`,
      user: user.username,
      items,
      totalPrice,
      orderedAt: new Date().toISOString(),
    };

    // 테스트용 CART 초기화
    CART[userKey] = [];

    return res.status(201).json({
      message: '주문 완료',
      order,
      total: totalPrice,
    });
  } catch (err) {
    console.error('Order API 에러:', err.message);
    return res.status(500).json({ message: '서버 에러', error: err.message });
  }
}
