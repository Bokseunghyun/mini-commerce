/**
 * scripts/load-env.js - 의존성 없는 .env 로더 (로컬 전용)
 *
 * - 레포 루트의 .env 파일을 읽어 process.env에 주입한다 (이미 설정된 값은 유지).
 * - Vercel에서는 대시보드 환경변수가 주입되므로 이 파일을 사용하지 않는다
 *   (server.js / scripts에서만 import — api/ 핸들러에서는 import 금지).
 * - .env 파일이 없으면 조용히 넘어간다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(repoRoot, '.env');

try {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    // 따옴표로 감싼 값 허용 ("..." 또는 '...')
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // .env 없음 - 셸 환경변수만 사용
}
