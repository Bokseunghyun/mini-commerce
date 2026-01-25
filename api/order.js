export default async function orderRoutes(req, res) {
  try {
    // 인증
    const user = req.user;
    if (!user) {
      // req.user 없으면 인증 문제
      return res.status(401).json({ message: '인증 실패: req.user 없음' });
    }

    const userKey = user.username;

    if (req.method !== 'POST') {
      return res.status(405).json({ message: '허용되지 않은 요청' });
    }

    // 프론트에서 보내온 cart items
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '장바구니가 비어 있습니다', body: req.body });
    }

    // 서버에서 orderable 체크
    const hasUnorderable = items.some(item => {
      const prod = PRODUCTS.find(p => p.id === item.id);
      return prod && !prod.orderable;
    });

    if (hasUnorderable) {
      return res.status(400).json({ message: '주문불가 상품이 포함되어 있습니다', items });
    }

    // 총 금액 계산
    const totalPrice = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

    // 주문 객체 생성
    const order = {
      orderId: `ORDER-${Date.now()}`,
      user: user.username,
      items,
      totalPrice,
      orderedAt: new Date().toISOString(),
    };

    // 서버 CART 초기화 (테스트용)
    CART[userKey] = [];

    return res.status(201).json({
      message: '주문 완료',
      order,
      total: totalPrice,
    });
  } catch (err) {
    console.error('Order API 에러:', err);
    // 인증 외 오류는 500으로 구분
    return res.status(500).json({ message: '서버 에러', error: err.message });
  }
}
