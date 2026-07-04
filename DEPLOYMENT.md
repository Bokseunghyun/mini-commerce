# DEPLOYMENT.md - Vercel + Neon 배포/운영 가이드

이 사이트는 **Vercel(정적 프론트 + 서버리스 API)** 위에서 돌고, 모든 영속 상태는 **Neon(Postgres)** 에 저장됩니다. 여러 명이 함께 쓰는 **공유 연습 사이트**로 운영하는 것을 전제로 한 가이드입니다.

핵심 규칙 하나만 기억하세요:

> **`DATABASE_URL`이 없으면 모든 데이터 API가 503 `{"code":"DB_NOT_CONFIGURED"}`를 반환합니다.**
> (인메모리 폴백 없음 — 로컬/운영 단일 코드 경로. 예외: `/api/status-codes`와 상품 3/4/16 의도적 픽스처 응답은 DB 없이도 동작)

---

## 1. Neon 무료 DB 만들기

### 방법 A — Vercel 대시보드에서 연결 (권장)

1. Vercel 대시보드 → 해당 프로젝트 → **Storage 탭**
2. **Create Database** → **Neon (Postgres)** 선택
3. 프로젝트에 연결(Connect)하면 **`DATABASE_URL` 환경 변수가 자동 주입**됩니다

### 방법 B — neon.tech에서 직접 만들기

1. [neon.tech](https://neon.tech)에서 무료 프로젝트 생성
2. 대시보드에서 connection string 복사 (형식: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)
3. Vercel 프로젝트 → **Settings → Environment Variables**에 `DATABASE_URL`로 수동 추가

> Neon 무료 티어(0.5GB)면 충분합니다. 이 사이트의 시드 + 연습 데이터는 커봐야 수 MB 수준이라 용량 걱정은 사실상 없습니다.

## 2. JWT_SECRET 설정

Vercel **Settings → Environment Variables**에 `JWT_SECRET`을 추가하세요 (임의의 긴 문자열).

- 미설정 시 코드의 데모 기본값(`demo-secret-key`)으로 동작은 하지만, 배포 환경에서는 설정을 권장합니다.

## 3. 최초 1회: 스키마 생성 + 시드 입력 (`npm run db:init`)

DB를 만들었으면 **로컬에서 딱 한 번** 초기화 스크립트를 실행합니다. 스키마(`CREATE TABLE IF NOT EXISTS`)를 만들고 시드 데이터(상품 18개, 계정 3개, 쿠폰 4개 등)를 입력합니다.

`DATABASE_URL`은 Vercel 대시보드(Storage 탭 또는 Settings → Environment Variables)에서 복사하거나, Vercel CLI로 받아옵니다:

```bash
vercel env pull .env   # 프로젝트에 연결된 env를 .env 파일로 저장
```

그다음 실행합니다. `server.js`와 `db:init`은 레포 루트의 **`.env` 파일을 자동으로 읽으므로**(`scripts/load-env.js`), `.env`에 `DATABASE_URL`이 있으면 바로 실행하면 됩니다:

```bash
npm run db:init
```

`.env` 없이 셸 환경변수로 직접 지정해도 됩니다:

```bash
# bash / macOS / Linux
DATABASE_URL="postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require" npm run db:init
```

```powershell
# Windows PowerShell
$env:DATABASE_URL = "postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require"
npm run db:init
```

> `npm run db:init`은 **기존 데이터를 모두 삭제하고 시드 상태로 리셋**합니다. 이미 운영 중인 DB에 다시 실행하면 연습 데이터가 날아가니 주의하세요. (의도적으로 초기화하려면 배포 후 `POST /api/reset`을 쓰는 편이 간단합니다)

## 4. 재배포

환경 변수는 **재배포해야 반영**됩니다:

```bash
vercel --prod
```

배포 후 사이트가 DB 모드로 동작합니다. `DATABASE_URL`이 없거나 잘못되면 모든 데이터 API가 **503 `DB_NOT_CONFIGURED`** 를 반환하므로, 배포 직후 `GET /api/products`가 200인지 확인하세요.

## 5. 로컬 개발

로컬도 운영과 **동일한 단일 코드 경로**입니다 — `server.js`(Express, 3000)가 Vercel 서버리스 핸들러(`api/*.js`)를 그대로 마운트하고, vite(5173)가 `/api`를 3000으로 프록시합니다.

```bash
# 최초 1회 — .env 준비
cp .env.example .env   # DATABASE_URL 값 입력

# 터미널 1 — API 서버 (.env의 DATABASE_URL 자동 로드)
npm run start-api

# 터미널 2 — 프론트엔드
npm run dev        # http://localhost:5173
```

- `.env.example`을 `.env`로 복사해 값을 채우면 `npm run start-api`/`npm run db:init`이 자동으로 읽습니다 (셸 환경변수가 이미 있으면 그 값이 우선).
- 운영 DB를 그대로 써도 되지만, **Neon의 브랜치 기능**으로 `dev` 브랜치 DB를 만들어 로컬은 브랜치 connection string을 쓰면 운영 연습 데이터와 분리됩니다.
- 로컬 Postgres(localhost)를 쓰는 경우 코드가 자동으로 TLS를 끄므로 `sslmode` 없이 연결됩니다.

## 6. 공유 연습 사이트 운영 팁

### 리셋은 누구나 할 수 있다

`POST /api/reset`은 **인증 없이 누구나 호출 가능**하며, 모든 데이터(가입 계정/주문/리뷰/장바구니/위시리스트/상품 변경)를 시드 상태로 되돌립니다. 여러 명이 동시에 연습 중이라면 **리셋 타이밍을 서로 조율**하세요 (한 명이 리셋하면 다른 사람의 진행 중인 시나리오가 깨집니다).

```bash
curl -X POST https://<your-domain>.vercel.app/api/reset
```

### 매일 자동 리셋 (Vercel Cron)

매일 새벽에 자동으로 시드 상태로 되돌리고 싶다면 Vercel Cron을 쓸 수 있습니다. `vercel.json`에 `crons` 항목을 추가하는 방식입니다.

예시 — **이 저장소의 `vercel.json`에는 적용되어 있지 않습니다. 필요할 때만 직접 추가하세요:**

```json
{
  "crons": [
    { "path": "/api/reset", "schedule": "0 20 * * *" }
  ]
}
```

- 스케줄은 **UTC 기준** cron 표현식입니다. `0 20 * * *` = 매일 20:00 UTC = **한국시간 새벽 5시**.
- **주의:** Vercel Cron은 해당 경로를 **GET**으로 호출하는데, 현재 `/api/reset`은 **POST만 허용**(그 외 405)합니다. 그대로 붙이면 매일 405만 기록되므로, 실제로 쓰려면 둘 중 하나가 필요합니다:
  - `api/reset.js`가 GET(또는 Vercel Cron 요청)도 허용하도록 수정하거나,
  - 외부 스케줄러(예: 아무 서버의 crontab)에서 `curl -X POST .../api/reset`을 주기 실행

### 용량 걱정은 불필요

전체 시드가 수백 KB 수준이고 리뷰/주문이 쌓여도 MB 단위입니다. Neon 무료 0.5GB면 연습 데이터 기준으로 사실상 무제한이며, 주기적으로 리셋까지 하면 더욱 그렇습니다.

## 7. 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-------------|
| 모든 API가 **503 `DB_NOT_CONFIGURED`** | `DATABASE_URL` 미설정 또는 이름 오타 (환경 변수 키가 정확히 `DATABASE_URL`인지 확인). Vercel에서 env 추가/수정 후에는 **재배포**해야 반영됨. 로컬이면 API 서버를 띄운 셸에 환경변수가 설정돼 있는지 확인 |
| 연결 오류 (`SSL required`, `ECONNREFUSED`, 타임아웃) | Neon 등 원격 Postgres는 TLS 필수 — connection string 끝에 `?sslmode=require`가 있는지 확인. 코드는 `localhost`/`127.0.0.1`이 아니면 자동으로 TLS를 켭니다(`api/_lib/db.js`). 호스트명(`ep-xxx...`) 오타도 확인 |
| **`relation "products" does not exist`** 류의 500 오류 | 스키마/시드 미생성 — 3번 절차대로 `npm run db:init`을 실행하지 않은 상태. 최초 1회 실행 필요 |
| `password authentication failed` | connection string의 사용자/비밀번호 오류 — Neon 대시보드에서 connection string을 다시 복사 |
| 데이터가 예상과 다름 (모르는 리뷰/주문/계정이 보임) | 정상 — 여러 명이 공유하는 사이트입니다. 깨끗한 상태가 필요하면 `POST /api/reset` |
| `db:init` 실행 시 "DATABASE_URL 환경변수가 설정되지 않았습니다" | 레포 루트에 `.env`가 없고 셸 환경변수도 없는 경우 — `.env.example`을 `.env`로 복사해 값을 채우거나 셸 환경변수로 설정 |

---

관련 문서: [README.md](README.md) (아키텍처/엔드포인트/계정) · [README_QA.md](README_QA.md) (셀렉터/의도적 버그 레퍼런스)
