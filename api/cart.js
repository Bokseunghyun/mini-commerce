import jwt from 'jsonwebtoken';

const SECRET = 'demo-secret-key';

export default async function cartRoutes(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 요청' });
  }

  // ---------------- 인증 처리 ----------------
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: '토큰 없음' });
  }

  const token = authHeader.replace('Bearer ', '');
  let user;
  try {
    user = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ message: '토큰 유효하지 않음' });
  }

  // ---------------- Body 처리 ----------------
  const { action, index, cart } = req.body;
  if (!action) {
    return res.status(400).json({ message: '요청 body가 올바르지 않음' });
  }

  if (action === 'remove') {
    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: 'cart 형식 오류(배열이아님)' });
    }

    const newCart = cart.filter((_, i) => i !== index);

    return res.status(200).json({
      message: '삭제 성공',
      cart: newCart
    });
  }

  return res.status(400).json({ message: '알 수 없는 동작' });
}
