/**
 * api/login.js - 로그인 API
 *
 * POST /api/login  body: { username, password }
 * - 사용자 조회는 Postgres(users 테이블), 비밀번호는 scrypt 해시 검증
 * - 회원가입으로 생성된 계정도 동일 경로로 로그인 가능
 *
 * QA 검증 포인트:
 * - 필드 누락 케이스별 400 메시지
 * - 아이디/비밀번호 오류 401 (계정 존재 여부는 노출하지 않음)
 * - 의도적 테스트 시나리오: test2는 차단 계정(BLOCKED) → 올바른 비밀번호여도 403
 */

import jwt from "jsonwebtoken";
import { isConfigured, respondDbNotConfigured } from "./_lib/db.js";
import { findUser } from "./_lib/store.js";
import { verifyPassword } from "./_lib/auth-hash.js";

const SECRET = process.env.JWT_SECRET || "demo-secret-key";

export default async function loginRoutes(req, res) {
  // CORS
  const allowedOrigins = [
    "http://localhost:5173",
    "https://mini-commerce.vercel.app",
    "https://mini-commerce-tawny.vercel.app",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ message: "허용되지 않은 요청" });

  const body = req.body || {};
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "").trim();

  // 입력 누락 케이스별로 status + message
  if (!username && !password) {
    return res.status(400).json({ message: "username, password 필수" });
  }
  if (!username) {
    return res.status(400).json({ message: "username 필수" });
  }
  if (!password) {
    return res.status(400).json({ message: "password 필수" });
  }

  // DB 미설정 시 503 (인메모리 폴백 없음 — 단일 코드 경로)
  if (!isConfigured()) return respondDbNotConfigured(res);

  try {
    const user = await findUser(username);

    // 존재하지 않는 계정과 비밀번호 불일치는 동일한 401 (계정 존재 여부 노출 방지)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "아이디 또는 비밀번호 오류" });
    }

    // 의도적 테스트 시나리오: 차단 계정(test2)은 비밀번호가 맞아도 403
    if (user.status === "BLOCKED") {
      return res.status(403).json({ message: "차단된 계정입니다" });
    }

    const token = jwt.sign({ username: user.username, role: user.role }, SECRET, { expiresIn: "1h" });

    return res.status(200).json({
      token,
      user: { username: user.username, role: user.role, avatarUrl: user.avatarUrl ?? null },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return res.status(500).json({ message: "서버 내부 오류", code: "INTERNAL_SERVER_ERROR" });
  }
}
