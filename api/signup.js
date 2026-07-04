/**
 * api/signup.js - 회원가입 API
 *
 * POST /api/signup            - 회원가입 { username, password, email? }
 * GET  /api/signup?username=x - 아이디 사용 가능 여부 확인 (UI 중복 체크용)
 *
 * QA 검증 포인트:
 * - 아이디 형식: 영문 소문자+숫자 4~12자
 * - 비밀번호: 4자 이상 (조합 제한 없음)
 * - 이메일 형식 (선택 입력)
 * - 중복 아이디 409
 */

import { applyCors } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { findUser, createUser } from './_lib/store.js';
import { hashPassword } from './_lib/auth-hash.js';

const USERNAME_RE = /^[a-z0-9]{4,12}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 비밀번호 정책: 4자 이상 (조합 제한 없음)
function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 4;
}

// GET ?username=x - 아이디 사용 가능 여부 (형식 검증 포함)
async function handleCheck(req, res) {
  const username = String(req.query.username ?? '').trim();

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      message: '아이디는 영문 소문자와 숫자 4~12자여야 합니다',
      code: 'INVALID_USERNAME',
    });
  }

  const existing = await findUser(username);
  return res.status(200).json({ username, available: !existing });
}

// POST - 회원가입
async function handleSignup(req, res) {
  const body = req.body || {};
  const username = String(body.username ?? '').trim();
  const password = body.password;
  const email = body.email;

  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({
      message: '아이디는 영문 소문자와 숫자 4~12자여야 합니다',
      code: 'INVALID_USERNAME',
    });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({
      message: '비밀번호는 4자 이상이어야 합니다',
      code: 'INVALID_PASSWORD',
    });
  }

  // 이메일은 선택 입력 — 값이 있으면 형식 검증
  if (email !== undefined && email !== null && email !== '') {
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({
        message: '이메일 형식이 올바르지 않습니다',
        code: 'INVALID_EMAIL',
      });
    }
  }

  const existing = await findUser(username);
  if (existing) {
    return res.status(409).json({
      message: '이미 사용 중인 아이디입니다',
      code: 'USERNAME_TAKEN',
    });
  }

  let user;
  try {
    user = await createUser({
      username,
      passwordHash: hashPassword(password),
      email: typeof email === 'string' && email.trim() ? email.trim() : null,
    });
  } catch (err) {
    // 동시 가입 경합으로 PK 위반(23505)이 나면 동일하게 409 처리
    if (err.code === '23505') {
      return res.status(409).json({
        message: '이미 사용 중인 아이디입니다',
        code: 'USERNAME_TAKEN',
      });
    }
    throw err;
  }

  return res.status(201).json({
    message: '회원가입이 완료되었습니다',
    user: { username: user.username, role: user.role },
  });
}

export default async function signupHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (단일 코드 경로 — 인메모리 폴백 없음)
  if (!isConfigured()) return respondDbNotConfigured(res);

  try {
    if (req.method === 'GET') {
      return await handleCheck(req, res);
    }
    if (req.method === 'POST') {
      return await handleSignup(req, res);
    }
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['GET', 'POST'],
    });
  } catch (error) {
    console.error('Signup API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
