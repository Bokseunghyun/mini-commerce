// api/cart.js
import { applyCors, requireUser } from './_lib/common.js';

export default async function cartRoutes(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 요청', code: 'METHOD_NOT_ALLOWED' });
  }

  const user = requireUser(req, res);
  if (!user) return;

  const { action, index, cart } = req.body || {};

  if (action !== 'remove') {
    return res.status(400).json({ message: '알 수 없는 동작', code: 'CART_BAD_ACTION' });
  }

  if (!Array.isArray(cart)) {
    return res.status(400).json({ message: 'cart 형식 오류', code: 'CART_BAD_BODY' });
  }

  const idx = Number(index);
  if (!Number.isInteger(idx) || idx < 0 || idx >= cart.length) {
    return res.status(400).json({ message: 'index 값 오류', code: 'CART_BAD_INDEX' });
  }

  const newCart = cart.filter((_, i) => i !== idx);
  return res.status(200).json({ message: '삭제 성공', cart: newCart });
}
