import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export default function verifyToken(req, res, next) {
  const publicPaths = [
    '/api/login',
    '/api/products',
    /^\/api\/products\/\d+$/ // 상품 상세도 public
  ];

  if (publicPaths.some(p => (p instanceof RegExp ? p.test(req.path) : p === req.path))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: '토큰 없음' });

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: '토큰 유효하지 않음' });
  }
}
