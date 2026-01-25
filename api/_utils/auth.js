import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export default function verifyToken(req, res, next) {
  console.log('JWT_SECRET:', SECRET);               // 배포 시 로그 확인
  console.log('Authorization 헤더:', req.headers.authorization); // 헤더 확인
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
     console.log('decoded user:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: '토큰 유효하지 않음' });
  }
}
