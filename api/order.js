// api/order.js
const BLOCKED_ORDER_IDS = new Set([3, 4]);

export default async function orderRoutes(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 405, message: '허용되지 않은 요청' });
  }

  // 프론트에서 다양한 형태로 보낼 수 있어서 유연하게 받음
  // 1) { items: [...] }
  // 2) { cart: [...] }
  // 3) { orderItems: [...] }
  // 4) 그냥 배열 [...]
  const body = req.body || {};
  const items =
    Array.isArray(body) ? body :
    Array.isArray(body.items) ? body.items :
    Array.isArray(body.cart) ? body.cart :
    Array.isArray(body.orderItems) ? body.orderItems :
    [];

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: 400,
      message: '주문 상품이 없습니다',
    });
  }

  // 주문불가 상품 포함 여부 체크
  const blockedIds = [];
  for (const it of items) {
    const id = Number(it?.id);
    if (Number.isFinite(id) && BLOCKED_ORDER_IDS.has(id)) blockedIds.push(id);
  }

  if (blockedIds.length > 0) {
    return res.status(422).json({
      status: 422,
      message: '주문 불가 상품이 포함되어 주문할 수 없습니다(의도적 오류)',
      blockedIds: Array.from(new Set(blockedIds)),
    });
  }

  // 정상 주문 처리(데모)
  const orderId = `ORD-${Date.now()}`;

  return res.status(200).json({
    status: 200,
    message: '주문 완료',
    orderId,
    items,
    orderedBy: req.user?.username || null, // verifyToken에서 넣어주는 값
  });
}
