/**
 * api/_lib/db.js - Postgres 연결 관리 (pg Pool 싱글턴)
 *
 * - Vercel Serverless 환경에서 모듈 스코프에 Pool을 유지해
 *   같은 인스턴스 내 요청들이 커넥션을 재사용하도록 한다.
 * - DATABASE_URL 미설정 시 폴백 없음(단일 코드 경로).
 *   핸들러는 isConfigured() 확인 후 respondDbNotConfigured(res)로 503을 반환한다.
 * - Neon 등 원격 Postgres는 TLS 필수, 로컬(localhost/127.0.0.1)은 TLS 비활성화.
 */

import pg from 'pg';

const { Pool } = pg;

// 모듈 레벨 싱글턴 Pool
let pool = null;

// DATABASE_URL 설정 여부
export function isConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

// Pool 싱글턴 획득 (미설정 시 throw — 핸들러에서 isConfigured()로 먼저 방어할 것)
export function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다');
    }
    pool = new Pool({
      connectionString: url,
      // 로컬 Postgres는 TLS 없이, 원격(Neon)은 TLS 필수
      ssl:
        url.includes('localhost') || url.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
      // 서버리스 환경 고려: 인스턴스당 커넥션 수 제한
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

// 단건 쿼리 실행 (파라미터 바인딩 필수 — 값 문자열 보간 금지)
export async function query(text, params) {
  return getPool().query(text, params);
}

// 트랜잭션용 전용 클라이언트 획득 (사용 후 반드시 client.release())
export async function getClient() {
  return getPool().connect();
}

// Pool 종료 (스크립트/테스트 마무리용)
export async function closePool() {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end();
  }
}

// DATABASE_URL 미설정 시 공통 503 응답
export function respondDbNotConfigured(res) {
  return res.status(503).json({
    message: '데이터베이스가 설정되지 않았습니다. DATABASE_URL 환경변수를 확인하세요.',
    code: 'DB_NOT_CONFIGURED',
  });
}
