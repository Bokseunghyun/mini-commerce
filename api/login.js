// api/login.js
export async function loginRoutes(req, res) {
    // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*'); // 모든 도메인 허용
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const body = req.body;  // 여기서 req.body를 바로 사용
  const { username, password } = body;

  const USERS = [
    { username: 'test', password: '1234', role: 'USER', status: 'ACTIVE' },
    { username: 'admin', password: '1234', role: 'ADMIN', status: 'ACTIVE' },
    { username: 'test2', password: '1234', role: 'USER', status: 'BLOCKED' },
  ];

  const user = USERS.find(u => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ message: '아이디 또는 비밀번호 오류' });
  if (user.status === 'BLOCKED') return res.status(403).json({ message: '차단된 계정입니다' });

  return res.status(200).json({
    token: `mock-token-${user.username}`,
    user: { username: user.username, role: user.role }
  });
}

