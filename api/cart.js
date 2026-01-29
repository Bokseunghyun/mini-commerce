export default async function cartRoutes(req, res) {
  // verifyToken을 통과했으니 req.user 존재
  const user = req.user;

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "허용되지 않은 요청" });

  const body = req.body || {};
  const action = String(body.action || "").trim();

  // 프론트 기존 규격 유지: { action:'remove', index, cart }
  const cart = Array.isArray(body.cart) ? body.cart : null;

  if (!action) return res.status(400).json({ message: "action 필수" });
  if (!cart) return res.status(400).json({ message: "cart 필수" });

  if (action === "remove") {
    const index = Number(body.index);
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) {
      return res.status(400).json({ message: "index 오류" });
    }

    const next = cart.slice();
    next.splice(index, 1);

    return res.status(200).json({
      user,
      cart: next,
    });
  }

  return res.status(400).json({ message: "지원하지 않는 action" });
}
