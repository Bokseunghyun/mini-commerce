# Mini Commerce - QA 자동화 & API 검증 연습 프로젝트

QA 자동화 테스트와 RESTful API 검증 연습을 위한 이커머스 데모 사이트

## 🎯 프로젝트 목적

- **QA 자동화 테스트** 연습 (Playwright, Cypress, Selenium)
- **RESTful API 검증** 연습 (Postman, Thunder Client, fetch API)
- **UI 테스트** 연습 (다양한 선택자, 시나리오)
- **포트폴리오** 프로젝트로 활용 가능

## 🏗 아키텍처 (한 줄 요약)

**React + Vite 프론트엔드(5173)** + **Vercel 서버리스 API(`api/*.js`) + Postgres(Neon)** — 로컬에서는 `server.js`(Express, 3000)가 동일한 서버리스 핸들러를 그대로 마운트하고, vite dev 서버가 `/api` 요청을 3000으로 프록시합니다(로컬/운영 **단일 코드 경로**).

모든 영속 상태(상품/계정/리뷰/장바구니/위시리스트/주문/쿠폰)는 **Postgres**에 저장됩니다. `DATABASE_URL` 미설정 시 모든 데이터 API가 **503 `DB_NOT_CONFIGURED`** 를 반환합니다. → 설정 방법은 아래 [Vercel 배포](#-vercel-배포) 참고.

## 🚀 빠른 시작

```bash
npm install

# 1) DB 연결 문자열 설정 (.env.example을 .env로 복사 후 값 입력, Neon 무료 DB 권장)
cp .env.example .env   # DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# 2) 최초 1회: 스키마 생성 + 시드 데이터 입력
npm run db:init

# 3) 실행
npm run start-api  # API 서버 (server.js, port 3000) - 별도 터미널
npm run dev        # 프론트엔드 (Vite, port 5173) - /api 요청은 3000으로 프록시됨
```

> `npm run start-api` / `npm run db:init` / `npm run db:migrate`는 레포 루트의 **`.env` 파일을 자동으로 읽습니다** (`scripts/load-env.js`, 셸 환경변수가 있으면 그 값이 우선).
>
> **스키마가 바뀐 뒤에는** `npm run db:migrate`(비파괴 — 기존 데이터 유지, `ADD COLUMN IF NOT EXISTS` + `CREATE TABLE IF NOT EXISTS`)를 실행해 반영합니다. 결제/업로드/배송추적/아바타/리뷰이미지 스키마가 늘었으므로, 기존 DB를 쓰는 경우 배포 후 **1회 `npm run db:migrate`** 가 필요합니다(안 하면 신규 엔드포인트가 500). 자세한 절차는 [DEPLOYMENT.md](DEPLOYMENT.md) 참고.

## 🔑 테스트 계정

| 계정 | ID | PW | 역할 | 설명 |
|------|----|----|------|------|
| 일반 사용자 | test | 1234 | USER | 정상 로그인 |
| 관리자 | admin | 1234 | ADMIN | 관리자 페이지 접근 가능 |
| 차단 계정 | test2 | 1234 | USER (상태 BLOCKED) | 로그인 시 **403** 반환 (의도적 negative 테스트용) |

- `/signup` 페이지(또는 `POST /api/signup`)로 **직접 가입한 계정도 로그인 가능**합니다 (역할 USER).
- `POST /api/reset` 실행 시 가입 계정은 삭제되고 위 시드 계정만 남습니다.

## 📊 주요 기능

### 18개 상품 (카테고리별)
- 전자기기 6개 / 액세서리 6개 / 생활 6개
- 상품마다 상세 설명, 스펙 7~8개, 이미지 3장, 태그, 재고 포함

### 페이지 라우트 (전부 딥링크 가능)

`/` `/login` `/signup` `/products` `/product/:id` `/cart` `/checkout` `/orders` `/wishlist` `/profile` `/tracking` `/order-complete` `/admin`

- `/profile` — 내정보(아바타 업로드 + 배송지 주소검색), **로그인 필요**
- `/tracking` — 배송조회(운송장번호로 타임라인 조회), **공개**

> 앱 진입 시 토큰이 초기화되므로(REQ-1) **딥링크 직후에는 항상 비로그인 상태**입니다.

### API 엔드포인트 (17개 라우트)

> Vercel에서는 **단일 서버리스 함수 `api/index.js`** 가 모든 `/api/*` 를 경로 기반으로 디스패치합니다(무료 플랜 함수 12개 제한 회피). 엔드포인트를 추가해도 함수 개수는 늘지 않습니다. 로컬은 `server.js`가 동일 핸들러를 마운트합니다.

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/api/login` | POST | 로그인 (JWT 발급) — 차단 계정은 **403**, 응답 `user.avatarUrl` 포함 |
| `/api/signup` | POST / GET | 회원가입 (아이디: 영문 소문자+숫자 4~12자, 비밀번호: 8자 이상 영문+숫자) / `?username=`으로 중복 확인 |
| `/api/products` | GET | 상품 목록 (`?category=`) |
| `/api/products/:id` | GET | 상품 상세 (설명/스펙/이미지/태그/재고) |
| `/api/search` | GET | 상품 검색 (`q`, `category`, `minPrice`, `maxPrice`, `sort=price-asc\|price-desc\|name\|discount`) — 전체 18개 상품 대상 |
| `/api/reviews` | GET/POST/PATCH/DELETE | 리뷰 CRUD (작성은 로그인 필수, 수정/삭제는 소유자·admin, `sort=latest\|rating`, `limit`/`offset` 페이지네이션). `images: string[]`(최대 3, dataURL/http URL) 첨부 — 무효 시 400 `INVALID_REVIEW_IMAGE`, GET은 `images[]` 반환 |
| `/api/inventory` | GET/HEAD | 재고 조회 (`X-Stock-Count`/`ETag` 헤더) — 주문/취소 시 실시간 반영 |
| `/api/user-actions` | GET/POST | 통합 액션: `cart_add`(수량 누적)·`cart_update`(절대값, 0=삭제)·`cart_remove`·`wishlist_add`·`wishlist_remove`·`order`(쿠폰/배송지, 선택적 `paymentKey` 검증, 가격은 서버가 결정)·`set_avatar`(아바타 dataURL) / 조회는 `GET ?type=cart\|wishlist\|profile`(profile은 `avatarUrl` 등) |
| `/api/coupons` | POST | 쿠폰 검증 + 할인액 계산 (`{code, orderAmount}`) |
| `/api/payment` | GET/POST | 모의 결제(이니시스 스타일). POST `{cardNumber, amount, ...}` → 201 `{paymentKey, status:'DONE', ...}`; 카드 뒤4자리·`?simulate=`로 결과 결정. GET `?paymentKey=` 사후검증 → 404 `PAYMENT_NOT_FOUND` |
| `/api/upload` | POST | 파일 업로드(모의, 인증). `{kind:'review'\|'avatar', image: dataURL}` → 201 `{url, kind}` / 400 `INVALID_FILE_TYPE` / 400 `INVALID_KIND` / **413** `FILE_TOO_LARGE`(2MB 초과) |
| `/api/tracking` | GET | 배송조회(모의 택배). `?trackingNumber=`(공개, 주문 존재해야) 또는 `?orderId=`(인증) → `{trackingNumber, status, events[]}` / 404 `TRACKING_NOT_FOUND` |
| `/api/orders` | GET | 내 주문 목록 (로그인 필수, 관리자는 전체 주문 + username) |
| `/api/orders/:id` | GET/PATCH | 주문 상세(배송지 포함, 타인 주문은 404). `{action:'cancel'}`(PAID/PREPARING만, 재고 복원, 재취소 **409**) / `{action:'advance'}`(PAID→PREPARING→SHIPPING→DELIVERED, 종료상태 **409** `INVALID_TRANSITION`, SHIPPING 진입 시 송장번호 `MC`+10자리) / `{action:'set_status',status}`(관리자, 400 `INVALID_STATUS`/403) |
| `/api/admin` | GET/POST/PUT/DELETE | 관리자 상품 CRUD (ADMIN 전용) — DB 반영이므로 목록/상세에 즉시 반영 |
| `/api/status-codes` | GET | 원하는 HTTP 상태 코드 반환 (연습용, DB 불필요) |
| `/api/reset` | POST | 모든 데이터를 시드 상태로 초기화 (TRUNCATE + 재시드) |

### 쿠폰 (시드)

| 코드 | 할인 | 조건 |
|------|------|------|
| `WELCOME10` | 10% | 최대 할인 20,000원 |
| `SAVE5000` | 5,000원 | 최소 주문 30,000원 |
| `VIP20` | 20% | 최소 주문 100,000원, 최대 할인 50,000원 |
| `EXPIRED10` | - | **만료된 쿠폰 (의도적)** — 적용 시 400 `COUPON_EXPIRED` |

## 💥 의도적 버그 (테스트 연습용 - 고치지 마세요)

| 케이스 | 동작 |
|--------|------|
| `GET /api/products/3`, `GET /api/products/4` | **500** Internal Server Error |
| `GET /api/products/16` | **404** Not Found (목록에는 있지만 상세 없음) |
| `test2 / 1234` 로그인 | **403** Forbidden (차단 계정) |
| 상품 3, 4 주문 시도 | **422** `ORDER_BLOCKED_PRODUCT` |
| 상품 3, 8, 18 | **재고 0 (품절)** — 품절 뱃지/재고부족 연습용, 재고 부족 주문 시 **409** `INSUFFICIENT_STOCK` (예: 상품 18) |
| 쿠폰 `EXPIRED10` | **400** `COUPON_EXPIRED` (만료 쿠폰) |
| 결제 카드 뒤4자리 `0001` | **402** `PAYMENT_DECLINED` (카드 거절) |
| 결제 카드 뒤4자리 `0002` | **402** `PAYMENT_LIMIT_EXCEEDED` (한도 초과) |
| 결제 카드 뒤4자리 `9999` | **504** `PAYMENT_GATEWAY_TIMEOUT` (게이트웨이 타임아웃, ~500ms 지연) |
| 결제 `?simulate=decline\|limit\|timeout\|error` | 카드와 무관하게 결과 강제 (`error` → **500** `PAYMENT_ERROR`) — 외부 PG 목킹 연습 |
| 업로드 2MB 초과 이미지 | **413** `FILE_TOO_LARGE` |
| 카카오 주소검색 스크립트(`postcode.v2.js`) 차단 | 수동입력 폴백 노출 — 외부 API 목킹 연습 |

> 결제 카드 `0000`/그 외는 **201 승인(`DONE`)**. 결과는 랜덤이 아니라 카드 뒤4자리·`?simulate=`로만 결정됩니다(자동화 안정성). 상세: [DEPLOYMENT.md](DEPLOYMENT.md#6-결제-설정-mock-pg--기본값)

## 💾 상태 모델 (Postgres 영속)

- 가입/리뷰/장바구니/위시리스트/주문/관리자 CRUD 등 **모든 변경 사항은 Postgres에 영속 저장**됩니다. 서버 재시작·재배포 후에도 유지됩니다.
- 배포본은 **여러 명이 공유하는 연습 사이트**입니다 — 다른 사용자가 만든 데이터(리뷰, 주문, 상품 변경 등)가 보일 수 있습니다.
- **`POST /api/reset`** (응답: `200 {"message":"모든 데이터가 초기화되었습니다","reset":[...]}`) 으로 언제든 시드 상태로 복원할 수 있습니다 — 테스트 사전조건(clean state) 세팅용.

## 📖 상세 문서

- [DEPLOYMENT.md](DEPLOYMENT.md) - Vercel + Neon 배포/운영 가이드 (db:init/db:migrate, 결제 설정, 외부 API 목킹, 트러블슈팅)
- [README_QA.md](README_QA.md) - 사이트 레퍼런스 (계정/셀렉터/의도적 버그)
- [QA_TEST_GUIDE.md](QA_TEST_GUIDE.md) - UI 테스트 시나리오
- [UI_AUTOMATION_GUIDE.md](UI_AUTOMATION_GUIDE.md) / [UI_AUTOMATION_GUIDE_SUMMARY.md](UI_AUTOMATION_GUIDE_SUMMARY.md) - UI 자동화 학습 가이드
- [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) / [API_TESTING_GUIDE2.md](API_TESTING_GUIDE2.md) / [API_TESTING_GUIDE_SUMMARY.md](API_TESTING_GUIDE_SUMMARY.md) - API 검증 학습 가이드
- [API_TEST_COLLECTION.md](API_TEST_COLLECTION.md) - API 테스트 컬렉션 (요청 모음)
- [API_CONSOLIDATION.md](API_CONSOLIDATION.md) - user-actions 통합 이력 (cart/order/wishlist → user-actions)

## 🌐 Vercel 배포

전체 가이드(결제 설정/외부 API 목킹/트러블슈팅 포함)는 **[DEPLOYMENT.md](DEPLOYMENT.md)** 참고. 요약:

1. Vercel 프로젝트의 **Storage 탭 → Create Database → Neon(Postgres)** 연결 → `DATABASE_URL` 자동 주입
2. 환경 변수 `JWT_SECRET` 설정
3. 최초 1회 로컬에서 `DATABASE_URL`을 `.env`에 넣고 `npm run db:init` (스키마 + 시드)
4. **스키마 변경 배포 시**(이번처럼 결제/업로드/추적/아바타/리뷰이미지 컬럼·테이블 추가) 배포 후 **`npm run db:migrate` 1회**(비파괴 — 데이터 유지). 안 하면 신규 엔드포인트가 500
5. 재배포 (`vercel --prod` 또는 git push → 자동 배포)

환경 변수:
- `DATABASE_URL` (**필수** — 없으면 모든 데이터 API가 503 `DB_NOT_CONFIGURED`)
- `JWT_SECRET` (미설정 시 데모 기본값 사용 — 배포 시 설정 권장)
- `VITE_API_BASE_URL` (선택 — 로컬은 vite proxy 사용)

### 문제해결

| 증상 | 원인 / 해결 |
|------|-------------|
| 모든 API가 **503 `DB_NOT_CONFIGURED`** | `DATABASE_URL` 미설정/오타. Vercel에서 env 추가·수정 후에는 **재배포**해야 반영됨 |
| 연결 오류 (`SSL required`, `ECONNREFUSED`, 타임아웃) | 원격 Postgres는 TLS 필수 — connection string 끝에 `?sslmode=require` 확인 (코드는 localhost가 아니면 자동 TLS) |
| `relation "products" does not exist` 류 500 | 스키마/시드 미생성 — 최초 1회 `npm run db:init` 실행 필요 |
| `relation "payments" does not exist` / `column "avatar_url"(또는 tracking_number/images/payment_key ...) does not exist` 류 500 | 스키마 변경 후 `npm run db:migrate` 미실행 (비파괴). 초기화해도 되면 `npm run db:init` |
| 결제/배송조회가 **404** (`PAYMENT_NOT_FOUND`/`TRACKING_NOT_FOUND`) | 없는 `paymentKey`/송장번호/주문 조회 시 정상. 트래킹은 주문이 존재해야 조회됨. 500이 아니면 스키마는 정상 |
| `password authentication failed` | connection string의 사용자/비밀번호 오류 — Neon 대시보드에서 다시 복사 |
| 모르는 리뷰/주문/계정이 보임 | 정상 — 여러 명이 공유하는 사이트. clean state가 필요하면 `POST /api/reset` |
| `db:init` 시 "DATABASE_URL 환경변수가 설정되지 않았습니다" | 레포 루트에 `.env`가 없거나 셸 환경변수 미설정 — `.env.example`을 `.env`로 복사 후 값 입력 |
