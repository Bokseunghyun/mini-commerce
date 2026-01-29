import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'demo-secret-key';

export default async function loginRoutes(req, res) {
  // CORS
  const allowedOrigins = [
    'http://localhost:5173',
    'https://mini-commerce.vercel.app'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  const method = String(req.method || '').toUpperCase();

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }


  if (method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 요청' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'username, password 필수' });
  }

  const USERS = [
    { username: 'test', password: '1234', role: 'USER', status: 'ACTIVE' },
    { username: 'admin', password: '1234', role: 'ADMIN', status: 'ACTIVE' },
    { username: 'test2', password: '1234', role: 'USER', status: 'BLOCKED' },
  ];

  const user = USERS.find(
    u => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: '아이디 또는 비밀번호 오류' });
  }

  if (user.status === 'BLOCKED') {
    return res.status(403).json({ message: '차단된 계정입니다' });
  }

  const token = jwt.sign(
    { username: user.username, role: user.role },
    SECRET,
    { expiresIn: '1h' }
  );

  return res.status(200).json({
    token,
    user: {
      username: user.username,
      role: user.role
    }
  });
}
