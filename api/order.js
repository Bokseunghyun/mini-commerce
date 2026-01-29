export default async function orderRoutes(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 요청', code: 'METHOD_NOT_ALLOWED' });
  }

  const { items } = req.body || {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ message: 'items 배열이 필요합니다', code: 'BAD_REQUEST' });
  }

  //  의도적 장애: 3,4 포함 주문 시 실패
  const hasBlocked = items.some((p) => [3, 4].includes(Number(p.id)));
  if (hasBlocked) {
    return res.status(500).json({
      message: '주문 실패 (의도적 장애)',
      code: 'ORDER_BLOCKED_ITEMS',
    });
  }

  // 합계 계산 (quantity 없으면 1로)
  const totalPrice = items.reduce((sum, p) => {
    const price = Number(p.price ?? p.discountedPrice ?? 0) || 0;
    const qty = Number(p.quantity ?? 1) || 1;
    return sum + price * qty;
  }, 0);

  return res.status(200).json({
    order: {
      totalPrice,
      itemsCount: items.length,
    },
  });
}
