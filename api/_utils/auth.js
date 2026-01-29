import jwt from 'jsonwebtoken';

//  login.js와 같은 규칙으로 SECRET 통일 (로컬에서 env 없으면 undefined 방지)
const SECRET = process.env.JWT_SECRET || 'demo-secret-key';

export default function verifyToken(req, res, next) {
  const publicPaths = [
    '/api/login',
    '/api/products',
    /^\/api\/products\/\d+$/ // 상품 상세도 public
  ];


  const isPublic = publicPaths.some((p) =>
    p instanceof RegExp ? p.test(req.path) : p === req.path
  );
  if (isPublic) return next();

  const raw = req.headers.authorization || req.headers.Authorization || '';
  const value = String(raw);

  if (!value) return res.status(401).json({ message: '토큰 없음' });

  // "Bearer <token>" / "bearer <token>" / 공백 등 안전 처리
  let token = value.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  if (!token) return res.status(401).json({ message: '토큰 없음' });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: '토큰 유효하지 않음' });
  }
}
