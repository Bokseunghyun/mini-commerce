
const PRODUCTS = [
  { id: 1, name: '무선 마우스', price: 25000, orderable: true },
  { id: 2, name: '기계식 키보드', price: 89000, orderable: true },
  { id: 3, name: '주문불가 상품', price: 30000, orderable: false },
  { id: 4, name: '주문불가 상품', price: 40000, orderable: false },
];

// 임시 서버 CART
let CART = {};

export default async function orderRoutes(req, res) {
  try {
    // 인증
    const user = req.user;
    const userKey = user.username;

    if (req.method !== 'POST') {
      return res.status(405).json({ message: '허용되지 않은 요청' });
    }

    // 프론트에서 보내온 cart items
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '장바구니가 비어 있습니다' });
    }

    // 서버에서 orderable 체크
    const hasUnorderable = items.some(item => {
      const prod = PRODUCTS.find(p => p.id === item.id);
      return prod && !prod.orderable;
    });

    if (hasUnorderable) {
      return res.status(500).json({ message: '주문불가 상품이 포함되어 있습니다' });
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

    // 서버 CART 초기화
    CART[userKey] = [];

    return res.status(201).json({
      message: '주문 완료',
      order,
      total: totalPrice,
    });
  } catch (err) {
    return res.status(401).json({ message: '인증 실패' });
  }
}
