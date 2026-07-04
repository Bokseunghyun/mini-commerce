/**
 * api/_lib/auth-hash.js - 비밀번호 해시/검증 헬퍼
 *
 * node:crypto scrypt 기반. 외부 의존성 없음.
 * 저장 포맷: 'salt(hex):hash(hex)'
 * 비교는 timingSafeEqual로 타이밍 공격 방지.
 */

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

// 비밀번호 해시 생성 -> 'salt:hexhash'
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(password), salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

// 비밀번호 검증 (저장 포맷이 깨져 있어도 throw 하지 않고 false 반환)
export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) {
    return false;
  }
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) {
    return false;
  }
  let expected;
  try {
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  const actual = scryptSync(String(password), salt, KEY_LENGTH);
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}
