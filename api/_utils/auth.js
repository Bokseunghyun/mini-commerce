import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export default function verifyToken(req, res, next) {
  // 기존 로그 유지
  console.log('JWT_SECRET:', SECRET);
  console.log('Authorization 헤더:', req.headers.authorization, req.headers.Authorization);

  const publicPaths = [
    '/api/login',
    '/api/products'
  ];

  if (publicPaths.includes(req.path)) {
    return next();
  }

  // 대소문자 구분 없이 헤더 가져오기
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    return res.status(401).json({ message: '토큰 없음' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, ''); // 대소문자 대응

  try {
    const decoded = jwt.verify(token, SECRET);
    console.log('decoded user:', decoded);
    req.user = decoded; // 기존 구조 유지
    next();
  } catch (err) {
    console.error('JWT 검증 실패:', err.message);
    return res.status(401).json({ message: '토큰 유효하지 않음' });
  }
}
