# DEPLOYMENT.md - Vercel + Neon 배포/운영 가이드

이 사이트는 **Vercel(정적 프론트 + 서버리스 API)** 위에서 돌고, 모든 영속 상태는 **Neon(Postgres)** 에 저장됩니다. 여러 명이 함께 쓰는 **공유 연습 사이트**로 운영하는 것을 전제로 한 가이드입니다.

핵심 규칙 두 개만 기억하세요:

> 1. **`DATABASE_URL`이 없으면 모든 데이터 API가 503 `{"code":"DB_NOT_CONFIGURED"}`를 반환합니다.**
>    (인메모리 폴백 없음 — 로컬/운영 단일 코드 경로. 예외: `/api/status-codes`와 상품 3/4/16 의도적 픽스처 응답은 DB 없이도 동작)
> 2. **스키마가 바뀐 배포(이번 배포처럼 새 컬럼·테이블 추가) 뒤에는 반드시 한 번 `npm run db:migrate`를 실행**해야 결제/업로드/배송추적/아바타/리뷰이미지 기능이 500 없이 동작합니다. (→ [3-B절](#3-b-스키마-변경-반영-npm-run-dbmigrate--비파괴))

---

## 아키텍처 한 줄 요약

**React + Vite 프론트(빌드 → 정적 `dist/`)** + **단일 서버리스 함수 `api/index.js`(모든 `/api/*` 디스패치)** + **Postgres(Neon)**.

- Vercel Hobby(무료) 플랜은 배포당 서버리스 함수 최대 12개 제한이 있는데 `api/*.js` 핸들러는 그보다 많습니다. 그래서 `vercel.json`은 **`api/index.js` 하나만 함수로 빌드**하고, 나머지 핸들러(`login.js`, `payment.js`, `upload.js`, `tracking.js` 등)는 그 안에서 import 되어 경로 기반으로 내부 라우팅됩니다.
- **→ 엔드포인트를 추가해도 Vercel 함수 개수는 늘어나지 않습니다.** 새 파일은 `api/index.js`의 `switch`에 케이스를 하나 더 추가하면 끝입니다.
- 로컬은 `server.js`(Express, 3000)가 **동일한 핸들러**를 그대로 마운트하므로 로컬/운영 동작이 같습니다(단일 코드 경로).

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

## 2. 환경 변수 (`JWT_SECRET` 등)

Vercel **Settings → Environment Variables**에 아래를 설정합니다.

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | **필수** | 없으면 모든 데이터 API가 503 `DB_NOT_CONFIGURED`. Neon connection string (`?sslmode=require` 포함) |
| `JWT_SECRET` | 권장 | 로그인 JWT 서명 키(임의의 긴 문자열). 미설정 시 코드의 데모 기본값(`demo-secret-key`)으로 동작은 하나 배포 환경에서는 설정 권장 |
| `VITE_API_BASE_URL` | 선택 | 프론트가 호출할 API 베이스. 로컬은 vite proxy를 쓰므로 보통 비워둠 |

> 환경 변수는 **추가/수정 후 재배포해야 반영**됩니다.

## 3. DB 초기화 / 마이그레이션 (`.env` 자동 로드)

로컬 스크립트(`server.js`, `db:init`, `db:migrate`)는 레포 루트의 **`.env` 파일을 자동으로 읽습니다**(`scripts/load-env.js` — 의존성 없는 자체 로더, 셸 환경변수가 이미 있으면 그 값이 우선). `api/` 핸들러는 이 로더를 import 하지 않습니다(Vercel에서는 대시보드 env가 주입됨).

`DATABASE_URL`은 Vercel 대시보드(Storage 탭 또는 Settings → Environment Variables)에서 복사하거나, Vercel CLI로 받아옵니다:

```bash
vercel env pull .env   # 프로젝트에 연결된 env를 .env 파일로 저장
```

### 3-A. 최초 1회: 스키마 생성 + 시드 입력 (`npm run db:init`)

DB를 **처음 만들었을 때** 딱 한 번 실행합니다. 스키마(`CREATE TABLE IF NOT EXISTS`)를 만들고 시드 데이터(상품 18개, 계정 3개, 쿠폰 4개 등)를 입력합니다.

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

> `npm run db:init`은 **기존 데이터를 모두 삭제하고 시드 상태로 리셋**합니다(`ensureSchema()` + `resetAll()`). 이미 운영 중인 DB에 다시 실행하면 연습 데이터가 날아가니 주의하세요.

### 3-B. 스키마 변경 반영: `npm run db:migrate` (비파괴)

**이번 배포처럼 새 기능이 새 컬럼/테이블을 요구할 때** 사용합니다. `ensureSchema()`만 실행하는 **비파괴** 스크립트로, `resetAll()`을 호출하지 않으므로 **기존 데이터를 유지**합니다.

```bash
npm run db:migrate
```

이번에 추가된 스키마(전부 `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` — 멱등):

| 대상 | 변경 | 이걸 안 하면 500 나는 기능 |
|------|------|---------------------------|
| `payments` 테이블 | 신규 `CREATE TABLE` | 결제 (`POST/GET /api/payment`) |
| `users.avatar_url` | 컬럼 추가 | 아바타 (`set_avatar`, 프로필/로그인 응답의 `avatarUrl`) |
| `reviews.images` | 컬럼 추가(JSONB) | 리뷰 이미지 (`POST/PATCH/GET /api/reviews`의 `images[]`) |
| `orders.tracking_number` | 컬럼 추가 | 배송추적 (`/api/tracking`, 주문 SHIPPING 진입 시 송장번호) |
| `orders.payment_key` / `payment_method` / `card_last4` | 컬럼 추가 | 주문-결제 연동(`order` 액션의 `paymentKey`) |

> **운영 반영 절차:** 코드 배포(git push 또는 `vercel --prod`) → 로컬에서 운영 `DATABASE_URL`을 `.env`에 넣고 **`npm run db:migrate` 1회** → 끝. 안 하면 신규 엔드포인트가 `relation "payments" does not exist` / `column ... does not exist` 류 500을 반환합니다.
>
> 데이터를 초기화해도 되는 상황이라면 `npm run db:init`(스키마 + 재시드)이 대안입니다. 배포 후 데이터만 시드로 되돌리려면 `POST /api/reset`을 쓰는 편이 간단합니다.

## 4. 재배포

환경 변수와 마이그레이션이 준비되면 배포합니다:

```bash
vercel --prod   # 또는 git push → 자동 배포
```

배포 후 확인:

- `GET /api/products` 가 **200** 인지 (503이면 `DATABASE_URL` 문제)
- 스키마를 늘렸다면 `GET /api/payment?paymentKey=nope` 가 **404 `PAYMENT_NOT_FOUND`** 로 오는지(500이면 `db:migrate` 미실행)

## 5. 로컬 개발

로컬도 운영과 **동일한 단일 코드 경로**입니다 — `server.js`(Express, 3000)가 서버리스 핸들러(`api/*.js`)를 그대로 마운트하고, vite(5173)가 `/api`를 3000으로 프록시합니다.

```bash
# 최초 1회 — .env 준비
cp .env.example .env   # DATABASE_URL 값 입력

# 스키마 준비 (최초 db:init, 이후 스키마 변경 시 db:migrate)
npm run db:init        # 또는 이미 데이터가 있으면 npm run db:migrate

# 터미널 1 — API 서버 (.env의 DATABASE_URL 자동 로드)
npm run start-api

# 터미널 2 — 프론트엔드
npm run dev            # http://localhost:5173
```

- 운영 DB를 그대로 써도 되지만, **Neon의 브랜치 기능**으로 `dev` 브랜치 DB를 만들어 로컬은 브랜치 connection string을 쓰면 운영 연습 데이터와 분리됩니다.
- 로컬 Postgres(localhost)를 쓰는 경우 코드가 자동으로 TLS를 끄므로 `sslmode` 없이 연결됩니다.

## 6. 결제 설정 (Mock PG — 기본값)

기본 결제는 **내장 모의 PG(이니시스 스타일)** 로, 무료이며 항상 동작합니다. 실제 결제창(팝업/리다이렉트)은 없고, `POST /api/payment` 가 카드번호로 결과를 **결정론적으로** 판정합니다. 자동화가 안정적으로 단언할 수 있도록 결과는 랜덤이 아니라 **카드 뒤 4자리**(또는 `?simulate=`)로만 정해집니다. (검증 위치: `api/payment.js`, `api/_lib/payment-utils.js`)

### 테스트 카드표 (뒤 4자리로 결과 결정)

| 카드 뒤 4자리 | 결과 | HTTP | 코드 |
|---------------|------|------|------|
| `0000` | 승인 | **201** | `status:'DONE'` |
| `0001` | 거절 | **402** | `PAYMENT_DECLINED` |
| `0002` | 한도초과 | **402** | `PAYMENT_LIMIT_EXCEEDED` |
| `9999` | 게이트웨이 타임아웃(약 500ms 지연 후 응답) | **504** | `PAYMENT_GATEWAY_TIMEOUT` |
| 그 외 | 승인 (기본 해피패스) | **201** | `status:'DONE'` |

- 형식 오류: 카드번호가 숫자 12~19자리가 아니면 **400 `INVALID_CARD`**, 금액이 양의 정수가 아니면 **400 `INVALID_AMOUNT`**.
- 성공 응답 형태: `201 { paymentKey:'PAY-<uuid>', status:'DONE', method:'CARD', cardLast4, amount }`. `paymentKey`는 `crypto.randomUUID` 기반이라 **테스트가 단언할 값이 아닙니다**(결정론은 카드/simulate로만).

### 폴트 주입 `?simulate=` (외부 PG 목킹 연습)

카드번호와 무관하게 결과를 강제합니다:

| 쿼리 | 결과 | HTTP | 코드 |
|------|------|------|------|
| `?simulate=decline` | 거절 | 402 | `PAYMENT_DECLINED` |
| `?simulate=limit` | 한도초과 | 402 | `PAYMENT_LIMIT_EXCEEDED` |
| `?simulate=timeout` | 타임아웃 | 504 | `PAYMENT_GATEWAY_TIMEOUT` |
| `?simulate=error` | 서버 오류 | **500** | `PAYMENT_ERROR` |

### 사후 검증 & 주문 연동

- `GET /api/payment?paymentKey=...` → 결제 레코드(있으면 200 / 없으면 **404 `PAYMENT_NOT_FOUND`**). 결제 결과를 사후 검증하는 연습용.
- 주문 연동: `POST /api/user-actions {action:'order', ..., paymentKey?}` — `paymentKey`를 주면 **① 결제 존재 ② status=DONE ③ 금액 일치 ④ 미사용(다른 주문에 연결 안 됨)** 을 검증한 뒤 주문에 `payment_key/payment_method/card_last4`를 저장합니다. 실패 시 **402 `PAYMENT_REQUIRED`(결제 없음)** / **402 `PAYMENT_INVALID`(미승인·금액불일치·중복사용)**. `paymentKey`를 생략하면 기존처럼 결제 없이도 주문 성공(하위 호환).

### 실제 이니시스로 바꾸려면 (옵션 — 현재 코드 기본은 모의)

실제 카드 결제를 붙이려면 **포트원(구 아임포트) 무료 테스트 모드**로 이니시스를 연동합니다. 이는 **옵션 확장**이며, 현재 코드의 기본 동작은 위의 모의 PG입니다.

1. [포트원](https://portone.io) 가입
2. 콘솔 → **테스트 연동관리**에서 **이니시스 채널 추가** (공유 테스트 MID 예: `INIpayTest`)
3. 프론트에 **포트원 SDK**를 붙여 결제창(팝업/리다이렉트) 호출
4. 백엔드에서 **포트원 REST API로 결제 검증**(imp_uid로 실제 승인/금액 대조) 후 주문 생성

> 주의: 실제 연동은 **팝업/리다이렉트** 흐름이라 UI 자동화가 까다롭습니다. 자동화 연습이 목적이라면 기본 모의 PG를 그대로 쓰는 편이 안정적입니다.

## 7. 외부 API 목킹 연습 포인트

이 사이트에는 "외부 의존성"을 흉내 낸 지점이 세 곳 있습니다. 테스터가 각 의존성을 **가로채거나 차단**해 실패 처리(폴백/에러 표시)를 검증하는 연습 대상입니다.

| 외부 의존성 | 목킹/차단 방법 | 검증 포인트 |
|-------------|----------------|-------------|
| 결제 PG (`/api/payment`) | 카드 `9999`(타임아웃) / `0001`·`0002`(거절), 또는 `?simulate=decline\|limit\|timeout\|error` | 402/504/500 시 주문 미생성, `#payment-error`(role=alert)에 메시지 노출 |
| 카카오(다음) 주소검색 | 외부 스크립트 `postcode.v2.js`(`t1.daumcdn.net`) 로드를 네트워크 차단 | 스크립트 실패 시 **수동입력 폴백**(`#address-search-fallback` role=alert + `address-search-manual-*` 필드)으로 전환되는지 |
| 배송추적 (`/api/tracking`) | 없는 송장번호/주문으로 조회 | **404 `TRACKING_NOT_FOUND`**; 존재 시 status에 맞는 결정론적 이벤트 타임라인 반환 |

## 8. 공유 연습 사이트 운영 팁

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

## 9. 트러블슈팅

| 증상 | 원인 / 해결 |
|------|-------------|
| 모든 API가 **503 `DB_NOT_CONFIGURED`** | `DATABASE_URL` 미설정 또는 이름 오타 (환경 변수 키가 정확히 `DATABASE_URL`인지 확인). Vercel에서 env 추가/수정 후에는 **재배포**해야 반영됨. 로컬이면 API 서버를 띄운 셸/`.env`에 값이 있는지 확인 |
| **`relation "products" does not exist`** 류 500 | 스키마 미생성 — 최초 1회 `npm run db:init` 미실행. 최초 1회 실행 필요 |
| **`relation "payments" does not exist`** / **`column "avatar_url"(또는 tracking_number/images/payment_key ...) does not exist`** 류 500 | 스키마 변경 후 **`npm run db:migrate` 미실행**. 배포 후 운영 DB 상대로 1회 실행 (비파괴). 초기화해도 되면 `npm run db:init` |
| 결제/트래킹이 **404** (`PAYMENT_NOT_FOUND` / `TRACKING_NOT_FOUND`) | 정상 동작일 수 있음 — 없는 `paymentKey`/송장번호/주문 조회는 404. 트래킹은 **주문이 존재해야** 조회됨(송장번호 경로도 주문 존재 필요). 500이 아니라 404면 스키마는 정상 |
| 연결 오류 (`SSL required`, `ECONNREFUSED`, 타임아웃) | 원격 Postgres는 TLS 필수 — connection string 끝에 `?sslmode=require` 확인. 코드는 `localhost`/`127.0.0.1`이 아니면 자동 TLS(`api/_lib/db.js`). 호스트명(`ep-xxx...`) 오타도 확인 |
| `password authentication failed` | connection string의 사용자/비밀번호 오류 — Neon 대시보드에서 다시 복사 |
| 주소검색 버튼을 눌러도 위젯이 안 뜸 | 외부 스크립트(`postcode.v2.js`) 로드 실패/차단 — 정상적으로 수동입력 폴백(`#address-search-fallback`)이 떠야 함. 네트워크/CSP 확인 |
| 데이터가 예상과 다름 (모르는 리뷰/주문/계정이 보임) | 정상 — 여러 명이 공유하는 사이트. 깨끗한 상태가 필요하면 `POST /api/reset` |
| `db:init`/`db:migrate` 시 "DATABASE_URL 환경변수가 설정되지 않았습니다" | 레포 루트에 `.env`가 없고 셸 환경변수도 없는 경우 — `.env.example`을 `.env`로 복사해 값을 채우거나 셸 환경변수로 설정 |

---

관련 문서: [README.md](README.md) (아키텍처/엔드포인트/계정) · [README_QA.md](README_QA.md) (셀렉터/의도적 버그 레퍼런스)
