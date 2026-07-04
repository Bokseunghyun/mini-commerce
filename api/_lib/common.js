// api/_lib/common.js
import jwt from 'jsonwebtoken';

export const SECRET = process.env.JWT_SECRET || 'demo-secret-key';

// CORS
export function applyCors(req, res) {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://mini-commerce.vercel.app',
  ];

  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return true;
  }

  return false;
}

// Bearer 토큰 파싱
export function getToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

// 토큰 검증해서 user 객체 반환
export function requireUser(req, res) {
  const token = getToken(req);

  if (!token) {
    res.status(401).json({ message: '토큰 없음', code: 'AUTH_NO_TOKEN' });
    return null;
  }

  try {
    const user = jwt.verify(token, SECRET);
    return user;
  } catch {
    res.status(401).json({ message: '토큰 유효하지 않음', code: 'AUTH_INVALID_TOKEN' });
    return null;
  }
}

// 관리자 권한 검증
export function requireAdmin(user, res) {
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({ message: '관리자 권한이 필요합니다', code: 'AUTH_FORBIDDEN' });
    return false;
  }
  return true;
}
