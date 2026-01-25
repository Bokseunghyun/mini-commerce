import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export default function verifyToken(req, res, next) {
  const publicPaths = ['/api/login', '/api/products'];

  if (publicPaths.includes(req.url)) return next(); // req.path 대신 req.url

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader) {
    return res.status(401).json({ message: '토큰 없음' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: '토큰 유효하지 않음' });
  }
}
