/**
 * scripts/migrate-db.js - 데이터베이스 스키마 마이그레이션 (비파괴)
 *
 * 사용법:
 *   npm run db:migrate            (레포 루트 .env의 DATABASE_URL 사용)
 *   DATABASE_URL=postgresql://... npm run db:migrate
 *
 * ensureSchema()만 실행한다:
 *   - 기본 DDL(CREATE TABLE IF NOT EXISTS)
 *   - 증분 마이그레이션(ADD COLUMN IF NOT EXISTS / 신규 테이블)
 * 모두 멱등이며 기존 데이터를 삭제하지 않는다 (resetAll 미호출 — 비파괴).
 * 운영 DB의 스키마를 최신화할 때 사용한다.
 */

import './load-env.js';
import { isConfigured, closePool } from '../api/_lib/db.js';
import { ensureSchema } from '../api/_lib/store.js';

async function main() {
  if (!isConfigured()) {
    console.error('[실패] DATABASE_URL 환경변수가 설정되지 않았습니다.');
    console.error('예: DATABASE_URL=postgresql://user:pass@host/db npm run db:migrate');
    process.exit(1);
  }

  await ensureSchema();
  console.log('[마이그레이션] 스키마 최신화 완료');
}

main()
  .then(() => closePool())
  .catch(async (err) => {
    console.error('[실패] 스키마 마이그레이션 중 오류가 발생했습니다:', err.message);
    console.error(err);
    await closePool().catch(() => {});
    process.exit(1);
  });
