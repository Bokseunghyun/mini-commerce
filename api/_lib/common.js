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

  // 같은 도메인 배포면 origin이 실제 배포 도메인으로 들어옴
  // allowedOrigins에 정확한 도메인을 추가해두는 게 가장 안전함
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return true; // preflight 처리 끝
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
    return user; // { username, role, iat, exp }
  } catch (e) {
    res.status(401).json({ message: '토큰 유효하지 않음', code: 'AUTH_INVALID_TOKEN' });
    return null;
  }
}
