import jwt from 'jsonwebtoken';

const SECRET = 'demo-secret-key';

export default function verifyToken(req, res, next) {
  
  const publicPaths = [
    '/api/login',
    '/api/products'
  ];

  if (publicPaths.includes(req.path)) {
  return next();
}
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: '토큰 없음' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: '토큰 유효하지 않음' });
  }
}
