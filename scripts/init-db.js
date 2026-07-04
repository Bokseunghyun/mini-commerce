/**
 * scripts/init-db.js - 데이터베이스 초기화 스크립트
 *
 * 사용법:
 *   npm run db:init            (레포 루트 .env의 DATABASE_URL 사용)
 *   DATABASE_URL=postgresql://... npm run db:init
 *
 * 스키마(CREATE TABLE IF NOT EXISTS) 생성 후 시드 데이터를 입력한다.
 * 기존 데이터는 모두 삭제되고 시드 상태로 리셋되므로 주의.
 */

import './load-env.js';
import { isConfigured, closePool } from '../api/_lib/db.js';
import { ensureSchema, resetAll } from '../api/_lib/store.js';

async function main() {
  if (!isConfigured()) {
    console.error('[실패] DATABASE_URL 환경변수가 설정되지 않았습니다.');
    console.error('예: DATABASE_URL=postgresql://user:pass@host/db npm run db:init');
    process.exit(1);
  }

  console.log('[1/2] 스키마 생성 중... (CREATE TABLE IF NOT EXISTS)');
  await ensureSchema();
  console.log('[1/2] 스키마 생성 완료');

  console.log('[2/2] 시드 데이터 입력 중... (기존 데이터는 초기화됩니다)');
  const seeded = await resetAll();
  console.log(`[2/2] 시드 완료: ${seeded.join(', ')}`);

  console.log('데이터베이스 초기화가 완료되었습니다.');
}

main()
  .then(() => closePool())
  .catch(async (err) => {
    console.error('[실패] 데이터베이스 초기화 중 오류가 발생했습니다:', err.message);
    console.error(err);
    await closePool().catch(() => {});
    process.exit(1);
  });
