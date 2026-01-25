// api/order.js
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
let CART = {}; // 테스트용

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: '허용되지 않은 요청' });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: '토큰 없음' });

  const token = authHeader.replace('Bearer ', '');
  let user;
  try {
    user = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ message: '토큰 유효하지 않음' });
  }

  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: '장바구니가 비어 있습니다' });

  const PRODUCTS = [
    { id: 1, name: '무선 마우스', price: 25000, orderable: true },
    { id: 2, name: '기계식 키보드', price: 89000, orderable: true },
    { id: 3, name: '주문불가 상품', price: 30000, orderable: false },
    { id: 4, name: '주문불가 상품', price: 40000, orderable: false },
  ];

  const hasUnorderable = items.some(item => {
    const prod = PRODUCTS.find(p => p.id === item.id);
    return prod && !prod.orderable;
  });
  if (hasUnorderable) return res.status(500).json({ message: '주문불가 상품 포함' });

  const totalPrice = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const order = {
    orderId: `ORDER-${Date.now()}`,
    user: user.username,
    items,
    totalPrice,
    orderedAt: new Date().toISOString(),
  };

  CART[user.username] = []; // 테스트용

  res.status(201).json({ message: '주문 완료', order, total: totalPrice });
}
