const BLOCKED_ORDER_IDS = new Set([3, 4]);

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItem(raw) {
  const id = toNumber(raw?.id, 0);
  const name = String(raw?.name || "").trim();

  //  price 우선, 없으면 discountedPrice로 보정
  let price = toNumber(raw?.price, NaN);
  if (!Number.isFinite(price)) price = toNumber(raw?.discountedPrice, NaN);

  const quantity = Math.max(1, toNumber(raw?.quantity, 1));

  return { id, name, price, quantity };
}

export default async function orderRoutes(req, res) {
  const user = req.user;

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "허용되지 않은 요청" });

  const body = req.body || {};
  const itemsRaw = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.cart)
      ? body.cart
      : null;

  if (!itemsRaw) return res.status(400).json({ message: "items(또는 cart) 필수" });
  if (itemsRaw.length === 0) return res.status(400).json({ message: "주문할 상품이 없습니다" });

  const items = itemsRaw.map(normalizeItem);

  // 기본 유효성
  for (const it of items) {
    if (!it.id || !it.name) {
      return res.status(400).json({ message: "상품 데이터 오류(id/name)" });
    }
    if (!Number.isFinite(it.price) || it.price <= 0) {
      return res.status(400).json({ message: `상품 가격 오류: ${it.name}` });
    }
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
      return res.status(400).json({ message: `상품 수량 오류: ${it.name}` });
    }
  }

  // 3,4 포함 주문 시 status 반환
  const blocked = items.find((it) => BLOCKED_ORDER_IDS.has(it.id));
  if (blocked) {
    return res.status(422).json({
      message: `주문 불가 상품 포함(의도적 오류): ${blocked.name} (id=${blocked.id})`,
    });
  }

  const totalPrice = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  return res.status(200).json({
    user,
    message: "주문 완료",
    totalPrice,
    items,
  });
}
