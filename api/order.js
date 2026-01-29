// api/order.js
import { applyCors, requireUser } from './_lib/common.js';

export default async function orderRoutes(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 요청', code: 'METHOD_NOT_ALLOWED' });
  }

  const user = requireUser(req, res);
  if (!user) return;

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: '장바구니가 비어 있습니다', code: 'ORDER_EMPTY' });
  }

  // 의도적 장애 유지(3/4 포함 시 실패)
  const hasFail = items.some((it) => Number(it?.id) === 3 || Number(it?.id) === 4);
  if (hasFail) {
    return res.status(500).json({ message: '주문 실패 (의도적 장애)', code: 'ORDER_INTENTIONAL_FAIL' });
  }

  const totalPrice = items.reduce(
    (sum, it) => sum + (Number(it?.price) || 0) * (Number(it?.quantity) || 1),
    0
  );

  return res.status(201).json({
    message: '주문 완료',
    order: {
      orderId: `ORDER-${Date.now()}`,
      user: { username: user.username, role: user.role },
      totalPrice,
      items,
    },
  });
}
