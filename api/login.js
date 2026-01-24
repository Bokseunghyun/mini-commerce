export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { username, password } = JSON.parse(req.body);

  const USERS = [
    { username: 'test', password: '1234', role: 'USER', status: 'ACTIVE' },
    { username: 'admin', password: '1234', role: 'ADMIN', status: 'ACTIVE' },
    { username: 'test2', password: '1234', role: 'USER', status: 'BLOCKED' },
  ];

  const user = USERS.find(u => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ message: '아이디 또는 비밀번호 오류' });
  if (user.status === 'BLOCKED') return res.status(403).json({ message: '차단된 계정입니다' });

  res.status(200).json({
    token: `mock-token-${user.username}`,
    user: { username: user.username, role: user.role },
  });
}
