# QA 자동화 프로젝트 - 최종 가이드

## 🎯 프로젝트 목적
- QA 자동화 연습
- 포트폴리오 데모
- Playwright / Selenium 학습

## 📦 기술 스택
- **Frontend**: React 19 (Vite)
- **Backend**: Vercel Serverless Functions (`api/*.js`)
- **Database**: Postgres (Neon 무료 플랜) — 모든 데이터가 DB에 영속 저장
- **배포**: Vercel (무료 플랜) + Neon Postgres

## 🚀 빠른 시작

### 1. DB 연결 설정 (필수)
```bash
# .env 파일에 Postgres 연결 문자열 설정
# DATABASE_URL=postgres://...
# (미설정 시 모든 데이터 API가 503 { code: "DB_NOT_CONFIGURED" } 반환)

# 최초 1회: 스키마 생성 + 시드 데이터 투입
npm run db:init
```

### 2. 로컬 개발
```bash
npm install
npm run dev
# → http://localhost:5173 (vite가 /api 요청을 3000 포트로 프록시)
```

### 3. API 서버
```bash
npm run start-api
# → http://localhost:3000/api/* (server.js가 api/*.js 핸들러를 Express로 마운트)
```

### 4. QA 가이드 확인
웹사이트 접속 → 우측 상단 "📘 QA 가이드" 버튼 클릭

## 🔑 테스트 계정
| 계정 | ID | PW | 역할 | 설명 |
|------|----|----|------|------|
| 일반 | test | 1234 | USER | 일반 사용자 |
| 관리자 | admin | 1234 | ADMIN | 모든 권한 |
| 차단 | test2 | 1234 | BLOCKED | 로그인 시 403 에러 테스트용 (의도적) |

> 회원가입(`/signup`, `POST /api/signup`)으로 직접 만든 계정도 USER 역할로 정상 로그인됩니다.
> 아이디는 영문 소문자+숫자 4~12자, 비밀번호는 4자 이상이어야 합니다 (문자 조합 제한 없음).
> `POST /api/reset` 실행 시 가입 계정은 삭제되고 시드 계정만 남습니다.

> 인증 정책: 로그인 인증정보(`token`/`role`/`username`)는 **localStorage**에 저장됩니다. 따라서 **새로고침·탭 닫기·브라우저 재시작 후에도 로그인이 유지**되고 **탭 간 공유**됩니다. Playwright의 `storageState`로 세션을 재사용할 수 있습니다(아래 [인증 & 세션](#-인증--세션-정본) 참조). JWT는 발급 후 **1시간이 지나면 만료**되어 이후 인증 요청은 서버가 401로 거절합니다. 명시적 토큰 제거는 로그아웃/주문완료(`restartApp`)에서 일어납니다.

## 🔐 인증 & 세션 (정본)

> 이 절은 인증/세션의 **정본(SSOT)**입니다. 다른 QA 문서는 여기로 링크합니다.

### 로그인 정보는 어디에 저장되나
- 로그인 성공 시 서버는 **set-cookie 없이** JWT를 응답 바디 `{ token, user }`로만 돌려줍니다.
- 클라이언트(`src/App.jsx`의 `handleLogin`)는 이 값을 **localStorage**의 `token`/`role`/`username`에 저장합니다.
- 인증이 필요한 요청은 `Authorization: Bearer <token>` 헤더로 보냅니다.

### 로그인 UI 흐름 (초보용 발판)
로그인/계정 관련 메뉴는 **계정 드롭다운**을 거쳐 열립니다. 홈 헤더에 로그인 버튼이 직접 박혀 있는 게 아니라, 드롭다운을 연 뒤 항목을 고르는 구조라고 생각하면 됩니다.
- 드롭다운 열기: `user-menu-trigger` (data-testid)
- 항목: `usermenu-login`, `usermenu-signup`, `usermenu-logout`, `usermenu-wishlist`, `usermenu-orders`, `usermenu-profile`
- 로그인 폼: `login-modal`, `username-input`, `password-input`, `login-submit-button`

**로그인 성공 시 모달이 닫힙니다.** 로그인 성공은 페이지 이동이 아니라 **로그인 모달이 닫히고** 현재 페이지가 그대로 유지되는 것으로 나타납니다. 로그인/회원가입은 홈(`/`) + 모달로 열리며 URL은 그대로 유지됩니다. 로그인 성공은 **모달이 사라짐**(`login-modal` hidden) 또는 **로그인 상태 UI**(`usermenu-logout` 노출)로 검증하세요.

```typescript
// 로그인 성공 검증 — 모달 닫힘/상태 UI로
await page.goto('/');
await page.getByTestId('user-menu-trigger').click();     // 계정 드롭다운 열기
await page.getByTestId('usermenu-login').click();
await page.getByTestId('username-input').fill('test');
await page.getByTestId('password-input').fill('1234');
await page.getByTestId('login-submit-button').click();
await expect(page.getByTestId('login-modal')).toBeHidden(); // 모달 닫힘으로 로그인 성공 검증
```

### storageState로 로그인 재사용 (표준 패턴)
Playwright의 `storageState`는 **쿠키 + localStorage를 직렬화**합니다. 이 앱은 인증을 localStorage에 두므로 표준 setup-project 패턴을 그대로 쓸 수 있습니다.

```typescript
// auth.setup.ts — 한 번만 로그인해서 세션을 파일로 저장
import { test as setup, expect } from '@playwright/test';
const authFile = '.auth/user.json';

setup('로그인', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-modal')).toBeHidden();
  await page.context().storageState({ path: authFile });   // localStorage 포함 저장 → 재사용
});
```

```typescript
// playwright.config.ts (발췌)
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  { name: 'chromium', dependencies: ['setup'],
    use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' } },
]
```

**대안 — UI 없이 API로 토큰만 받아 주입** (더 빠름):
```typescript
const { token, user } = await (await request.post('/api/login',
  { data: { username: 'test', password: '1234' } })).json();
await context.addInitScript(([t, r, u]) => {
  localStorage.setItem('token', t);
  localStorage.setItem('role', r);
  localStorage.setItem('username', u);
}, [token, user.role, user.username]);
// 이후 page.goto('/') 하면 로그인 상태로 시작
```

## 🌐 API 테스트: `page.request` / APIRequestContext

- 순수 API 검증은 **`request` 픽스처** 또는 **`request.newContext({ baseURL, extraHTTPHeaders })`**를 씁니다.
- UI 동작이 유발한 네트워크 호출을 검증할 때는 `page.waitForResponse(...)`를 씁니다. → **순수 API = `page.request`, UI 유발 호출 검증 = `waitForResponse`**.
- 앱 origin은 `http://localhost:5173`(vite dev)이고 `/api`는 vite가 3000(Express)으로 프록시합니다. 테스트는 `baseURL: 'http://localhost:5173'` + 상대경로 `/api/...`를 씁니다.

```typescript
import { test, expect } from '@playwright/test';

test('상품 목록', async ({ request }) => {
  const res = await request.get('/api/products');   // baseURL=5173, /api는 3000으로 프록시
  expect(res).toBeOK();
  const { products } = await res.json();
  expect(products.length).toBeGreaterThan(0);
});

test('내 주문 (인증 필요)', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: 'http://localhost:5173' });
  const { token } = await (await anon.post('/api/login',
    { data: { username: 'test', password: '1234' } })).json();
  const api = await playwright.request.newContext({
    baseURL: 'http://localhost:5173',
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  expect((await api.get('/api/orders')).status()).toBe(200);
});
```

## 💥 의도적 오류 케이스

### 상품 상세 API (`GET /api/products/:id`)
| 상품 ID | 응답 | 설명 |
|---------|------|------|
| 1, 2, 5-15, 17, 18 | 200 OK | 정상 |
| 3, 4 | 500 Server Error | 의도적 장애 |
| 16 | 404 Not Found | 목록에는 있지만 상세는 의도적으로 없음 |
| 99 등 미존재 ID | 404 Not Found | 존재하지 않음 (`PRODUCT_NOT_FOUND`) |
| 0, -1, abc | 400 Bad Request | id 파라미터 오류 (`INVALID_ID`) |

### 재고 / 주문
| 케이스 | 동작 |
|--------|------|
| 씨드 재고 | 전 상품 재고 5~30 범위(품절 상품 없음) — **재고 0인 씨드 상품은 없습니다** |
| 주문 수량 > 재고 | 409 (`INSUFFICIENT_STOCK`) |
| 상품 3, 4 주문 | 422 (`ORDER_BLOCKED_PRODUCT`) — 의도적 주문 차단 |
| 빈 주문 (장바구니 비어있음 + items 생략) | 400 (`EMPTY_ORDER`) |

> 재고부족(409 `INSUFFICIENT_STOCK`) 재현법: 씨드 재고가 0인 상품이 없으므로 **동적으로** 만듭니다 — 현재 재고를 조회한 뒤 `stock+1` 수량으로 주문하거나, 관리자 `PUT /api/admin`으로 재고를 0으로 낮춘 뒤 주문하세요.

### 쿠폰 API (`POST /api/coupons`)
| 쿠폰 코드 | 조건 | 동작 |
|-----------|------|------|
| WELCOME10 | 제한 없음 | 10% 할인 (최대 20,000원) |
| SAVE5000 | 최소 주문 30,000원 | 5,000원 정액 할인 |
| VIP20 | 최소 주문 100,000원 | 20% 할인 (최대 50,000원) |
| EXPIRED10 | - | 400 (`COUPON_EXPIRED`) — 의도적 만료 픽스처 |
| 없는 코드 | - | 404 (`COUPON_NOT_FOUND`) |
| 최소 주문 금액 미달 | - | 400 (`MIN_ORDER_NOT_MET`) |

### 로그인 API  
| 입력 | 응답 |
|------|------|
| 빈 입력 | 400 Bad Request |
| 잘못된 계정 | 401 Unauthorized |
| 차단 계정 (test2) | 403 Forbidden |

### 결제 API (`POST /api/payment`, 모의 PG · 이니시스 스타일)
결과는 카드번호 **끝 4자리로 결정론적**으로 정해집니다(랜덤 아님). 앞자리는 임의의 숫자.
| 테스트 카드 끝 4자리 | 응답 | 코드 |
|---------------------|------|------|
| `…0000` (그 외 전부 포함) | 201 승인 (`status: DONE`) | — |
| `…0001` | 402 카드 거절 | `PAYMENT_DECLINED` |
| `…0002` | 402 한도 초과 | `PAYMENT_LIMIT_EXCEEDED` |
| `…9999` | 504 게이트웨이 타임아웃 (~500ms 지연) | `PAYMENT_GATEWAY_TIMEOUT` |
| 형식 오류(숫자 12~19자리 아님) | 400 | `INVALID_CARD` |
| 금액 ≤ 0 / 정수 아님 | 400 | `INVALID_AMOUNT` |

폴트 주입(카드와 무관하게 강제): `?simulate=decline|limit|timeout|error` — `error` → 500 `PAYMENT_ERROR`.
결제 사후조회: `GET /api/payment?paymentKey=...` → 없으면 404 `PAYMENT_NOT_FOUND`. (`paymentKey`=`PAY-<uuid>`는 비결정 값이므로 존재 여부만 검증하고 값 자체는 단언하지 않는 편이 안정적입니다.)

### 파일 업로드 API (`POST /api/upload`, 모의 · 검증+에코)
| 케이스 | 응답 | 코드 |
|--------|------|------|
| 정상 이미지 data URL (`png/jpeg/webp/gif`, ≤2MB) | 201 `{ url, kind }` | — |
| 이미지 아님/미지원 형식 | 400 | `INVALID_FILE_TYPE` |
| 2MB 초과 | 413 | `FILE_TOO_LARGE` |
| `kind`이 `review`/`avatar` 아님 | 400 | `INVALID_KIND` |
| 리뷰 이미지 4개 이상/무효 항목 (`POST /api/reviews`의 `images[]`) | 400 | `INVALID_REVIEW_IMAGE` |

### 배송 추적 API (`GET /api/tracking`, 모의 택배)
| 케이스 | 응답 | 코드 |
|--------|------|------|
| `?trackingNumber=` 유효 (송장 주문 존재) | 200 `{ trackingNumber, status, events[] }` | — |
| `?trackingNumber=` 없는 송장 | 404 | `TRACKING_NOT_FOUND` |
| `?orderId=` 본인/관리자 주문 | 200 (인증 필요) | — |
| `?orderId=` 타인/없는 주문 | 404 (존재 비노출) | `TRACKING_NOT_FOUND` |

### 주문 상태 전이 (`PATCH /api/orders/:id`)
상태: `PAID`(결제완료) → `PREPARING`(상품준비중) → `SHIPPING`(배송중, 이때 송장 `MC`+10자리 발급) → `DELIVERED`(배송완료). 취소는 `PAID`/`PREPARING`에서만.
| action | 동작 | 실패 |
|--------|------|------|
| `advance` | 다음 상태로 진행 (본인/관리자) | 종료 상태(DELIVERED/CANCELED)에서 409 `INVALID_TRANSITION` |
| `cancel` | 취소 + 재고 복원 (PAID/PREPARING만) | 재취소 409 `ALREADY_CANCELED`, 불가 상태 409 `CANCEL_NOT_ALLOWED` |
| `set_status` (ADMIN) | 상태 명시 지정 | 비관리자 403, 잘못된 상태 400 `INVALID_STATUS` |

## 📋 주요 UI 셀렉터

> URL 라우팅(라이브러리 없이 `App.jsx`가 `history.pushState`로 직접 구현): `/`, `/product/:id`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/profile`(로그인 필요), `/tracking`(공개), `/order-complete`, `/admin` — 이들은 딥링크로 직접 접근할 수 있습니다.
> 목록/정렬/가격필터 시나리오는 **홈(`/`) 기준**으로 작성하세요. 로그인/회원가입은 홈 + 모달로 열리며 URL은 그대로 유지됩니다(위 [인증 & 세션](#-인증--세션-정본) 참조).

> 로케이터 전략: 이 앱은 `data-testid`가 촘촘히 박혀 있으므로 **`getByTestId`/`getByRole`를 1급(우선) 셀렉터**로 안심하고 쓰세요. `#id`/`.class`는 testid가 없는 요소에 보조로 활용합니다.
> 아래 셀렉터 사전은 요약본입니다. 전체 목록은 인앱 **QA 가이드**(`#qa-guide-btn`)를 참고하세요.

### 홈페이지
```typescript
// 홈 헤더 id
page.locator('#home-admin-btn')    // 관리자 (항상 표시, 비ADMIN 클릭 시 권한 오류)
page.locator('#home-cart-btn')     // 장바구니
page.locator('#qa-guide-btn')      // QA 가이드
page.locator('#home-search-btn')   // 검색

// 로그인/계정/위시리스트/주문/내정보는 계정 드롭다운 경유 (data-testid)
page.getByTestId('user-menu-trigger')  // 계정 드롭다운 열기
page.getByTestId('usermenu-login')     // 로그인
page.getByTestId('usermenu-signup')    // 회원가입
page.getByTestId('usermenu-logout')    // 로그아웃
page.getByTestId('usermenu-wishlist')  // 위시리스트
page.getByTestId('usermenu-orders')    // 주문내역
page.getByTestId('usermenu-profile')   // 내정보

// 입력
page.locator('#home-search')       // 검색창
page.locator('#sort-select')       // 정렬 셀렉트

// 카테고리
page.locator('#category-전체')
page.locator('#category-전자기기')
page.locator('#category-액세서리')
page.locator('#category-생활')

// 상품 카드 (홈 그리드) — 모든 카드가 동일한 testid를 공유하므로 카드를 먼저 스코핑
page.getByTestId('product-card')       // 카드 컨테이너 (19개 전부 동일값)
page.getByTestId('wishlist-toggle')    // 하트 토글 (aria-pressed) — 카드 스코핑 후 사용
page.getByTestId('view-detail-btn')    // 상세보기 버튼 — 카드 스코핑 후 사용
// 특정 카드를 고르는 법은 아래 [상품 카드](#상품-카드-홈-그리드--동일-testid) 절 참조
```

> 목록/정렬/가격필터는 **홈(`/`)** 에서 동작합니다. 관련 셀렉터: `#sort-select`(정렬), `#min-price`/`#max-price`(가격 입력), `apply-price-filter`/`reset-price-filter`/`price-filter-error`/`search-result-count`(data-testid).

### 로그인 폼 (모달)
로그인은 별도 페이지가 아니라 계정 드롭다운(`user-menu-trigger`) → `usermenu-login`으로 여는 **모달**입니다.
```typescript
page.getByTestId('login-modal')            // 로그인 모달 컨테이너
page.getByTestId('username-input')         // 아이디 입력
page.getByTestId('password-input')         // 비밀번호 입력
page.getByTestId('login-submit-button')    // 로그인 버튼
```

### 회원가입 폼 (모달)
회원가입도 드롭다운(`usermenu-signup`)으로 여는 모달이며, 성공 시 로그인 모달이 열립니다.
```typescript
page.locator('#signup-username')                            // 아이디 입력
page.locator('#username-check-btn')                         // 아이디 중복확인 버튼
page.locator('[data-testid="username-check-result"]')       // 중복확인 결과
page.locator('#signup-password')                            // 비밀번호
page.locator('#signup-password-confirm')                    // 비밀번호 확인
page.locator('#signup-email')                               // 이메일 (선택)
page.locator('#signup-submit')                              // 가입하기 버튼
page.locator('[data-testid="signup-username-error"]')       // 필드별 에러 (role=alert)
page.locator('[data-testid="signup-email-error"]')          // 이메일 에러
page.locator('[data-testid="signup-error"]')                // 폼 전체 에러
page.locator('[data-testid="signup-success"]')              // 가입 성공 메시지
```

> 서브페이지 공통 헤더(공개): 배송조회 이동 `site-nav-tracking`, 장바구니 이동 `site-nav-cart` (data-testid).

### 상품 카드 (홈 그리드) — 동일 testid
홈(`/`) 상품 카드는 **셀렉터 전략 연습을 위해 모든 카드가 같은 `data-testid`를 공유**합니다(카드/서브요소 모두 동일값). 따라서 **원하는 카드를 먼저 스코핑**(상품명 텍스트·접근성 이름·`data-product-category`·위치)한 뒤 그 안의 버튼을 눌러야 합니다.

| 셀렉터 | 값 | 비고 |
|--------|----|------|
| `getByTestId('product-card')` | 모든 카드 공통(동일값) | `<article>`, `role="listitem"`, 19개 매칭 → 스코핑 필요 |
| `getByTestId('product-image')` / `product-name` / `price` / `original-price` | 카드 공통(동일값) | 카드 스코핑 후 사용 |
| `getByTestId('discount-badge')` / `soldout-badge` | 카드 공통(동일값) | 조건부 렌더 |
| `getByTestId('wishlist-toggle')` / `view-detail-btn` | 카드 공통(동일값) | 카드 스코핑 후 사용 |
| `.product-card` (className) | 모든 카드 | `document.querySelectorAll('.product-card').length`로 카드 개수 카운트 가능 |
| `[data-product-category="전자기기"]` | 카테고리 그룹 | 그룹으로 좁히는 용도 (전자기기/액세서리/생활) |
| `[data-product-index="0"]` | 위치(0부터) | 정렬 순서를 알 때 |

#### 동일 testid 카드에서 원하는 상품 고르기 (초보용)
카드가 전부 같은 testid이므로, **상품명 텍스트 / 접근성 이름 / 카테고리 / 위치(nth)** 중 하나로 카드를 특정합니다.
```typescript
// 1) 상품명 텍스트로 카드 스코핑 → 카드 안에서 버튼은 유일
const card = page.getByTestId('product-card')
  .filter({ hasText: '스마트 워치 헬스 트래커 방수 기능' });
await card.getByTestId('view-detail-btn').click();
await card.getByTestId('wishlist-toggle').click();

// 2) 접근성 이름으로 바로 (권장 — 사용자가 보는 이름 그대로, aria-label)
await page.getByRole('button', { name: '스마트 워치 헬스 트래커 방수 기능 상품 상세' }).click();

// 3) 위치(nth) — 정렬 순서를 알 때
await page.getByTestId('product-card').nth(2).getByTestId('view-detail-btn').click();

// 4) 카테고리로 좁힌 뒤 상품명으로 특정
const 전자 = page.locator('[data-product-category="전자기기"]');
await 전자.filter({ hasText: '4K 웹캠' }).getByTestId('view-detail-btn').click();
```
> 안티패턴: `await page.getByTestId('view-detail-btn').click()`처럼 카드 스코핑 없이 단독으로 쓰면 카드 19개가 매칭되어 Playwright strict mode 위반(에러)이 납니다. 반드시 상품명/이름/카테고리/위치로 하나를 특정하세요.

### 상품 상세 페이지 (/product/:id)
```typescript
// 이미지 갤러리
page.locator('[data-testid="product-main-image"]')     // 메인 이미지
page.locator('[data-testid="gallery-thumb-0"]')        // 썸네일 (0~2)

// 탭 (상세설명/상품스펙/배송·교환/리뷰)
page.locator('#tab-description')                       // 상세설명 탭 버튼
page.locator('#tab-specs')                             // 상품스펙 탭 버튼
page.locator('#tab-shipping')                          // 배송·교환 탭 버튼
page.locator('#tab-reviews')                           // 리뷰 탭 버튼
page.locator('[data-testid="tab-panel-description"]')  // 탭 패널 (specs/shipping/reviews 동일 패턴)
page.locator('[data-testid="spec-row-0"]')             // 스펙 행 (인덱스 기준)

// 재고
page.locator('#stock-info')                            // 재고 정보 (/api/inventory 연동)
page.locator('[data-testid="stock-badge"]')            // 재고 뱃지 (재고 0이면 장바구니/바로구매 disabled — 씨드엔 재고 0 없음, 관리자로 0 설정 시 재현)

// 평점 & 리뷰
page.locator('[data-testid="rating-average"]')         // 평균 평점
page.locator('[data-testid="rating-bar-5"]')           // 평점 분포 바 (5~1)
page.locator('[data-testid="star-input-5"]')           // 리뷰 별점 입력 (1~5)
page.locator('#review-comment')                        // 리뷰 내용 입력
page.locator('#review-submit')                         // 리뷰 등록 버튼
page.locator('[data-testid="review-form-message"]')    // 리뷰 폼 결과 메시지 (in-DOM)
page.locator('#review-sort')                           // 리뷰 정렬 (latest|rating)
page.locator('[data-testid="review-item-1"]')          // 리뷰 항목 (리뷰 id 기준)
page.locator('[data-testid="review-load-more"]')       // 리뷰 더보기

// 리뷰 이미지 첨부 (최대 3장, 공통 ImageUpload 컴포넌트)
page.locator('[data-testid="image-upload-input-review"]') // 파일 입력 (setInputFiles 사용)
page.locator('[data-testid="image-upload-error"]')        // 형식/용량 검증 에러
page.locator('[data-testid="review-upload-thumb-0"]')     // 업로드 썸네일 (0~2)
page.locator('[data-testid="review-upload-remove-0"]')    // 썸네일 제거 (0~2)
page.locator('[data-testid="review-images-1"]')           // 리뷰별 첨부 이미지 컨테이너 (리뷰 id 기준)
page.locator('[data-testid="review-image-1-0"]')          // 리뷰 첨부 개별 이미지 (review-image-{reviewId}-{i})
```

### 장바구니 페이지 (/cart)
장바구니는 **서버 장바구니**(DB 저장)로 동작하며 로그인이 필요합니다.
```typescript
page.locator('#cart-page')                          // 장바구니 페이지 컨테이너
page.locator('[data-testid="cart-item-1"]')         // 장바구니 항목 (상품 id 기준)
page.locator('[data-testid="cart-increase-1"]')     // 수량 증가
page.locator('[data-testid="cart-decrease-1"]')     // 수량 감소
page.locator('[data-testid="cart-qty-1"]')          // 수량 표시
page.locator('[data-testid="cart-subtotal-1"]')     // 상품별 소계
page.locator('[data-testid="cart-remove-1"]')       // 상품 삭제
page.locator('[data-testid="cart-total"]')          // 총 금액
page.locator('[data-testid="checkout-button"]')     // 주문하기 → /checkout 이동 (#checkout-btn 도 동일 요소)
page.locator('[data-testid="cart-empty"]')          // 빈 장바구니 표시
```

### 체크아웃 페이지 (/checkout)
```typescript
page.locator('[data-testid="checkout-item-1"]')     // 주문 상품 행 (상품 id 기준)

// 배송 정보
page.locator('#checkout-name')                      // 받는 사람
page.locator('#checkout-phone')                     // 연락처
page.locator('#checkout-address')                   // 주소
page.locator('#checkout-memo')                      // 배송 메모 (선택)
page.locator('[data-testid="checkout-name-error"]') // 필드별 에러 (phone/address 동일 패턴)

// 쿠폰
page.locator('#coupon-code')                        // 쿠폰 코드 입력
page.locator('[data-testid="coupon-apply-btn"]')    // 쿠폰 적용
page.locator('[data-testid="coupon-message"]')      // 쿠폰 적용 결과 메시지
page.locator('[data-testid="coupon-remove-btn"]')   // 쿠폰 제거

// 결제수단 & 약관
page.locator('#payment-card')                       // 카드 (카드 입력폼 동작)
page.locator('#payment-bank')                       // 무통장입금 (선택 시 payment-bank-warn 경고)
page.locator('#payment-inicis')                     // 이니시스 샌드박스
page.locator('[data-testid="payment-bank-warn"]')   // 무통장입금 선택 시 경고
page.locator('[data-testid="payment-method-notice"]') // 결제수단 안내
page.locator('#agree-terms')                        // 약관 동의 (체크 전 결제 버튼 비활성)
page.locator('#place-order-btn')                    // 결제 버튼 (라벨: "{금액}원 결제하기")

// 카드 입력폼 (카드 선택 시에만 렌더) — 끝 4자리로 결과 결정 (0000 승인/0001 거절/0002 한도/9999 타임아웃)
page.locator('#card-number')                        // 카드번호 (data-testid: card-number-input)
page.locator('#card-expiry')                        // 유효기간 MM/YY (card-expiry-input)
page.locator('#card-cvc')                           // CVC (card-cvc-input)
page.locator('[data-testid="test-card-guide"]')     // 테스트 카드 안내 (접이식, -toggle/-body, test-card-row-0000 등)

// 결제 진행/에러
page.locator('[data-testid="payment-processing"]')  // 결제 진행 스피너 (role=status, 내부 loading-spinner)
page.locator('[data-testid="payment-error"]')       // 결제 실패 메시지 (role=alert) — 실패 시 주문 미생성

// 금액 요약 & 상태
page.locator('[data-testid="checkout-subtotal"]')   // 상품 금액
page.locator('[data-testid="checkout-discount"]')   // 할인 금액
page.locator('[data-testid="checkout-final"]')      // 최종 결제 금액
page.locator('[data-testid="checkout-error"]')      // 주문 실패 에러 (결제 검증 실패 포함)
page.locator('[data-testid="checkout-empty"]')      // 주문할 상품 없음
```

### 주문내역 페이지 (/orders)
```typescript
page.locator('[data-testid="order-item-ORD-20260701-0001"]')    // 주문 행 (클릭 시 상세 확장)
page.locator('[data-testid="order-detail-ORD-20260701-0001"]')  // 확장된 주문 상세
page.locator('[data-testid="order-status-ORD-20260701-0001"]')  // 상태 뱃지 5종: 결제완료/상품준비중/배송중/배송완료/취소됨 (data-status)
page.locator('[data-testid="order-advance-btn-ORD-20260701-0001"]')  // 상태 진행 (다음 단계로, 종료 상태에선 미노출)
page.locator('[data-testid="order-cancel-ORD-20260701-0001"]')  // 취소 버튼 (PAID/PREPARING만, confirm() 다이얼로그)
page.locator('[data-testid="order-track-btn-ORD-20260701-0001"]')       // 배송조회 (SHIPPING/DELIVERED만)
page.locator('[data-testid="order-tracking-number-ORD-20260701-0001"]') // 송장번호 (MC+10자리)
page.locator('[data-testid="tracking-timeline-ORD-20260701-0001"]')     // 인라인 배송 타임라인
page.locator('[data-testid="tracking-event-ORD-20260701-0001-0"]')      // 타임라인 이벤트 (order-...-{i})
page.locator('[data-testid="order-cancel-message"]')            // 취소 결과 메시지
page.locator('[data-testid="orders-empty"]')                    // 주문 없음
page.locator('[data-testid="orders-login-required"]')           // 로그인 필요 안내
```

### 위시리스트 페이지 (/wishlist)
```typescript
page.locator('[data-testid="wishlist-item-1"]')            // 위시리스트 항목 (상품 id 기준)
page.locator('[data-testid="wishlist-add-to-cart-1"]')     // 장바구니 담기
page.locator('[data-testid="wishlist-remove-1"]')          // 위시리스트에서 제거
page.locator('[data-testid="wishlist-empty"]')             // 빈 위시리스트
page.locator('[data-testid="wishlist-login-required"]')    // 로그인 필요 안내
```

### 내정보 페이지 (/profile) — 로그인 필요
```typescript
page.locator('[data-testid="profile-page"]')                 // 페이지 루트
page.locator('[data-testid="profile-login-required"]')       // 비로그인 딥링크 시 안내
page.locator('[data-testid="profile-avatar"]')               // 아바타 (없으면 이니셜 폴백)
page.locator('[data-testid="profile-avatar-message"]')       // 아바타 결과 메시지 (in-DOM)
page.locator('[data-testid="image-upload-input-avatar"]')    // 아바타 업로드 (file input)

// 주소검색 (카카오/다음 우편번호 위젯 — 외부 스크립트 동적 로드)
page.locator('[data-testid="address-search-btn"]')                // 주소검색 열기
page.locator('[data-testid="address-search-layer"]')             // 위젯 마운트 레이어
page.locator('[data-testid="address-search-fallback"]')         // 스크립트 차단 시 수동입력 폴백 (role=alert)
page.locator('[data-testid="address-search-manual-zonecode"]')  // 폴백: 우편번호 입력
page.locator('[data-testid="address-search-manual-address"]')   // 폴백: 주소 입력
page.locator('[data-testid="address-search-manual-submit"]')    // 폴백: 적용
page.locator('[data-testid="profile-zonecode"]')                // 선택된 우편번호
page.locator('[data-testid="profile-address"]')                 // 선택된 주소
```

### 배송조회 페이지 (/tracking) — 공개
```typescript
page.locator('#tracking-number-input')                   // 송장번호 입력
page.locator('#tracking-search-btn')                     // 조회 버튼
page.locator('[data-testid="tracking-result"]')          // 조회 결과 컨테이너
page.locator('[data-testid="tracking-result-number"]')   // 결과 송장번호
page.locator('[data-testid="tracking-status"]')          // 상태 뱃지
page.locator('[data-testid="tracking-event-0"]')         // 이벤트 타임라인 (순번 0부터)
page.locator('[data-testid="tracking-not-found"]')       // 없는 송장 (role=alert)
```

### 파일 업로드 공통 컴포넌트 (ImageUpload — 리뷰/아바타 공용)
```typescript
page.locator('[data-testid="image-upload-input-review"]')  // kind=review 파일 입력
page.locator('[data-testid="image-upload-input-avatar"]')  // kind=avatar 파일 입력
page.locator('[data-testid="image-upload-loading"]')       // 업로드 중
page.locator('[data-testid="image-upload-error"]')         // 형식/용량 에러 (서버 메시지)
page.locator('[data-testid="image-upload-preview"]')       // 업로드 미리보기
```

### 주문완료 페이지 (/order-complete)
```typescript
page.locator('[data-testid="order-complete-id"]')       // 주문번호 (ORD-yyyymmdd-XXXX)
page.locator('[data-testid="order-complete-amount"]')   // 결제 금액
page.locator('[data-testid="go-orders-btn"]')           // 주문내역으로 이동
```

### 관리자 페이지
```typescript
page.locator('[data-testid="admin-row-1"]')     // 상품 행 (상품 id 기준)
page.locator('[data-testid="edit-btn-1"]')      // 수정 버튼
page.locator('[data-testid="toggle-btn-1"]')    // 활성화/비활성화 토글
page.locator('[data-testid="delete-btn-1"]')    // 삭제 버튼
```

## 🎬 Playwright 테스트 예시 (TypeScript)

### 초보자를 위한 설명
아래 예제들은 Playwright를 사용한 자동화 테스트 코드입니다. 각 테스트는 실제 사용자가 웹사이트를 사용하는 것처럼 동작하며, 예상한 결과가 나오는지 자동으로 검증합니다.

> 참고: 본 저장소는 테스트 대상(SUT)이며 테스트 코드를 포함하지 않습니다. 아래 파일명(`test/login.spec.ts` 등)은 자동화 코드를 작성하는 **별도 저장소** 기준의 예시입니다.

### test/login.spec.ts
```typescript
import { test, expect } from '@playwright/test';

/**
 * 로그인 성공 테스트
 * 목적: 올바른 계정 정보로 로그인이 정상적으로 되는지 확인
 * 
 * 테스트 흐름:
 * 1. 홈페이지 접속
 * 2. 계정 드롭다운 열기 → 로그인 항목 클릭
 * 3. 아이디/비밀번호 입력
 * 4. 로그인 제출
 * 5. 로그인 모달이 닫히는지 확인 (= 로그인 성공)
 */
test('로그인 성공', async ({ page }) => {
  // 홈페이지로 이동
  await page.goto('/');
  
  // 계정 드롭다운 열기 → 로그인 항목 클릭
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  
  // 아이디/비밀번호 입력
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');
  
  // 로그인 버튼 클릭
  await page.getByTestId('login-submit-button').click();
  
  // 로그인 성공 시 모달이 닫힘 → 모달 닫힘으로 검증
  // toBeHidden()은 해당 요소가 사라졌는지 검증
  await expect(page.getByTestId('login-modal')).toBeHidden();
});

/**
 * 로그인 실패 테스트
 * 목적: 잘못된 계정 정보로 로그인 시 에러 메시지가 표시되는지 확인
 * 
 * 테스트 흐름:
 * 1. 홈페이지 접속
 * 2. 계정 드롭다운 → 로그인 모달 열기
 * 3. 존재하지 않는 아이디/비밀번호 입력
 * 4. 로그인 시도
 * 5. 모달이 그대로 열려 있는지(로그인 실패) 확인
 *
 * 참고: 잘못된 계정은 서버가 401을 반환합니다. 순수하게 상태 코드를
 *       검증하고 싶다면 아래 test/api.spec.ts처럼 page.request로 확인하세요.
 */
test('잘못된 계정 로그인 실패', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  
  // 존재하지 않는 계정 정보 입력
  await page.getByTestId('username-input').fill('wrong');
  await page.getByTestId('password-input').fill('wrong');
  await page.getByTestId('login-submit-button').click();
  
  // 실패 시 모달이 닫히지 않고 그대로 남아 있음
  await expect(page.getByTestId('login-modal')).toBeVisible();
});
```

### test/products.spec.ts
```typescript
/**
 * 상품 500 에러 테스트
 * 목적: 특정 상품(ID 3번)을 조회할 때 500 에러가 발생하는지 확인
 * 
 * 배경: ID 3번 상품은 의도적으로 500 에러를 발생시키도록 설정되어 있음
 * 
 * 테스트 흐름:
 * 1. 브라우저의 alert 창을 감지하는 리스너 등록
 * 2. 상품 3번 카드를 상품명으로 스코핑 → 상세보기 버튼 클릭
 * 3. alert 메시지에 '500'이 포함되어 있는지 확인
 * 4. alert 창 닫기 (accept)
 *
 * 참고: 홈 카드는 모든 카드가 동일 testid를 공유하므로, 상품명 텍스트로
 *       카드를 먼저 스코핑한 뒤 그 안의 view-detail-btn을 눌러 하나만 특정합니다.
 */
test('상품 3번 500 에러', async ({ page }) => {
  // dialog 이벤트: 브라우저의 alert, confirm, prompt 창이 뜰 때 발생
  page.on('dialog', async dialog => {
    // alert 메시지에 '500'이 포함되어 있는지 검증
    expect(dialog.message()).toContain('500');
    // alert 창의 '확인' 버튼 클릭
    await dialog.accept();
  });
  
  await page.goto('/');
  // 상품 3번 카드를 상품명으로 스코핑 → 상세보기 버튼 클릭
  const card = page.getByTestId('product-card')
    .filter({ hasText: '휴대용 블루투스 스피커 360도 서라운드 사운드' });
  await card.getByTestId('view-detail-btn').click();
});

/**
 * 존재하지 않는 상품 404 에러 테스트
 * 목적: API 레벨에서 존재하지 않는 상품 조회 시 404 에러가 발생하는지 확인
 * 
 * 테스트 흐름:
 * 1. API를 직접 호출 (UI 거치지 않음)
 * 2. HTTP 상태 코드가 404인지 확인
 * 3. 응답 본문의 에러 코드가 'PRODUCT_NOT_FOUND'인지 확인
 */
test('존재하지 않는 상품 404', async ({ page }) => {
  // page.request.get()을 사용하여 API 직접 호출
  const response = await page.request.get('/api/products/99');
  
  // HTTP 상태 코드 검증
  expect(response.status()).toBe(404);
  
  // 응답을 JSON으로 파싱
  const body = await response.json();
  
  // 에러 코드 검증
  expect(body.code).toBe('PRODUCT_NOT_FOUND');
});
```

### test/permissions.spec.ts
```typescript
/**
 * 일반 사용자 권한 테스트
 * 목적: 일반 사용자(test)가 관리자 페이지 접근 시 403으로 차단되는지 확인
 * 
 * 배경: 관리자 버튼은 항상 표시되지만, 클릭 시 GET /api/admin 권한 체크에서
 *       비ADMIN 계정은 403 + 권한 오류 alert이 발생함
 * 
 * 테스트 흐름:
 * 1. 일반 사용자(test) 계정으로 로그인
 * 2. 관리자 버튼 클릭
 * 3. GET /api/admin 응답이 403인지, 권한 오류 alert이 뜨는지 확인
 */
test('일반 사용자는 관리자 페이지 접근 시 403', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  
  // 일반 사용자 계정 (Role: USER)
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-modal')).toBeHidden();
  
  // 권한 오류 alert 감지
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('관리자 권한');
    await dialog.accept();
  });
  
  // 관리자 버튼 클릭과 동시에 /api/admin 응답 캐치
  const [adminResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('#home-admin-btn')
  ]);
  
  expect(adminResponse.status()).toBe(403);
});

/**
 * 관리자 권한 테스트
 * 목적: 관리자(admin) 계정은 관리자 페이지에 정상 접근되는지 확인
 * 
 * 테스트 흐름:
 * 1. 관리자(admin) 계정으로 로그인
 * 2. 관리자 버튼 클릭
 * 3. GET /api/admin 응답이 200인지 확인
 */
test('관리자는 관리자 페이지 접근 가능', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  
  // 관리자 계정 (Role: ADMIN)
  await page.getByTestId('username-input').fill('admin');
  await page.getByTestId('password-input').fill('1234');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-modal')).toBeHidden();
  
  const [adminResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('#home-admin-btn')
  ]);
  
  expect(adminResponse.status()).toBe(200);
});
```

### test/api.spec.ts
```typescript
/**
 * 재고 API HEAD 메서드 테스트
 * 목적: HEAD 메서드를 사용한 재고 조회가 정상 동작하는지 확인
 * 
 * 배경: HEAD 메서드는 응답 본문(body) 없이 헤더만 받아옴
 *       재고 수량은 HTTP 헤더(x-stock-count)로 전달됨
 * 
 * 테스트 흐름:
 * 1. HEAD 메서드로 재고 API 호출
 * 2. HTTP 상태 코드가 200인지 확인
 * 3. 응답 헤더에 'x-stock-count'가 있는지 확인
 */
test('재고 API HEAD 메서드', async ({ page }) => {
  // page.request.head()는 HEAD 메서드로 HTTP 요청을 보냄
  const response = await page.request.head(
    '/api/inventory?productId=1'
  );
  
  // HTTP 상태 코드 검증
  expect(response.status()).toBe(200);
  
  // 응답 헤더에서 재고 수량 헤더가 존재하는지 확인
  // toBeDefined()는 값이 undefined가 아닌지 검증
  expect(response.headers()['x-stock-count']).toBeDefined();
});

/**
 * 리뷰 작성 유효성 검사 테스트
 * 목적: 너무 짧은 리뷰(10자 미만)를 작성할 때 에러가 발생하는지 확인
 * 
 * 배경: 리뷰 작성 시 코멘트는 최소 10자 이상이어야 함
 * 
 * 테스트 흐름:
 * 1. 로그인 API를 직접 호출해 인증 토큰 획득 (UI를 거치지 않음)
 * 2. 토큰을 포함하여 리뷰 작성 API 호출 (짧은 코멘트)
 * 3. 400 에러 발생 확인
 * 4. 에러 코드가 'COMMENT_TOO_SHORT'인지 확인
 *
 * 참고: 순수 API 검증이므로 page.request로 로그인 토큰을 바로 받습니다.
 *       (UI 로그인 후 localStorage.getItem('token')으로 읽어도 되지만,
 *        인증 정책이 localStorage이므로 storageState 재사용이 더 편합니다.)
 */
test('리뷰 작성 짧은 코멘트 검증', async ({ page }) => {
  // 1단계: 로그인 API로 토큰 획득
  const { token } = await (await page.request.post('/api/login', {
    data: { username: 'test', password: '1234' }
  })).json();
  
  // 2단계: 리뷰 작성 API 호출 (인증 토큰 포함)
  const response = await page.request.post('/api/reviews', {
    headers: { 
      Authorization: `Bearer ${token}` // Bearer 토큰 인증 방식
    },
    data: {
      productId: 1,
      rating: 5,
      comment: '좋아요' // 4자 - 10자 미만이므로 실패해야 함
    }
  });
  
  // 3단계: HTTP 상태 코드가 400(Bad Request)인지 확인
  expect(response.status()).toBe(400);
  
  // 4단계: 에러 응답 본문 검증
  const body = await response.json();
  expect(body.code).toBe('COMMENT_TOO_SHORT');
});
```

## ✅ 테스트 작성 베스트프랙티스 (초보용)

### web-first assertion 권장
조건 충족까지 자동 재시도하는 **web-first assertion**을 쓰면 안정적입니다. 상태 변화는 아래처럼 검증하세요.
```typescript
await expect(page.getByTestId('login-modal')).toBeHidden();
await expect(locator).toHaveText('주문 완료');
await locator.waitFor({ state: 'hidden' });
```
요소/상태 조건으로 대기하면 타이밍에 견고한 테스트가 됩니다.

### 셀렉터 우선순위
`getByTestId`/`getByRole`를 1급으로 씁니다. 이 앱은 `data-testid`가 촘촘하므로 안심하고 쓸 수 있습니다. `#id`·`.class`는 testid가 없는 요소에 보조로 활용합니다.

### 테스트 격리
장바구니/주문/리뷰/계정이 서버 DB에 계정 단위로 **영속**됩니다. 여러 사람이 공유하는 사이트라는 점에 유의하고, 테스트를 격리하세요.
```typescript
// 공유 환경 전체 초기화 (다른 사용자 데이터도 함께 초기화됨에 유의)
test.beforeEach(async ({ request }) => { await request.post('/api/reset'); });
// 병렬(fullyParallel) 실행 시엔 테스트별 고유 계정 권장:
// const username = `u${Date.now()}_${test.info().parallelIndex}`; // signup 후 사용
```

### dialog 처리
비로그인으로 보호 페이지에 진입하면 `confirm()`이, 주문/취소 등에서 `alert()`가 뜹니다. 리스너가 없으면 자동 dismiss되어 흐름이 끊깁니다.
```typescript
page.on('dialog', d => d.accept());
```

### playwright.config (별도 테스트 레포)
```typescript
export default defineConfig({
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry',
         screenshot: 'only-on-failure', video: 'retain-on-failure' },
  retries: process.env.CI ? 2 : 0,
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' } },
  ],
  webServer: [
    { command: 'npm run start-api', port: 3000, reuseExistingServer: !process.env.CI },
    { command: 'npm run dev',       port: 5173, reuseExistingServer: !process.env.CI },
  ],
});
```

## 📚 사용 가능한 API

> 배포는 Vercel 단일 서버리스 함수(`api/index.js`)가 모든 `/api/*`를 경로 기반으로 디스패치합니다. 엔드포인트를 추가해도 Vercel 함수 개수는 늘지 않습니다.

| API | 메서드 | 설명 | 인증 |
|-----|--------|------|------|
| /api/login | POST | 로그인 (`{token, user}` 반환) | ❌ |
| /api/signup | POST | 회원가입 (201) / 검증 실패 400 (`INVALID_USERNAME`/`INVALID_PASSWORD`/`INVALID_EMAIL`) / 중복 409 (`USERNAME_TAKEN`) | ❌ |
| /api/signup?username=x | GET | 아이디 중복 확인 (`{username, available}`) | ❌ |
| /api/products | GET | 상품 목록 (18개+, `?category=` 필터) — description/specs/images/tags/stock 포함 | ❌ |
| /api/products/:id | GET | 상품 상세 (의도적: 3,4 → 500 / 16 → 404) | ❌ |
| /api/search | GET | 상품 검색 (`q`, `category`, `minPrice`, `maxPrice`, `sort`) — 전체 18개 상품 대상 | ❌ |
| /api/inventory | GET/HEAD | 재고 조회 (`X-Stock-Count`/`ETag` 헤더, 주문/취소 시 실시간 반영) | ❌ |
| /api/reviews | GET | 리뷰 목록 (`productId`, `username`, `minRating`, `sort`, `limit`, `offset`) | ❌ |
| /api/reviews | POST | 리뷰 작성 (201 / 10자 미만 400 `COMMENT_TOO_SHORT`) — 같은 상품에 여러 번 작성해도 201로 성공 | ✅ |
| /api/reviews | PATCH/DELETE | 리뷰 수정/삭제 (소유자 또는 admin) | ✅ |
| /api/coupons | POST | 쿠폰 검증 (`{code, orderAmount}` → 할인액 계산) | ❌ |
| /api/user-actions | POST | `action`으로 분기(9종): cart_add/cart_update/cart_remove/wishlist_add/wishlist_remove/order/set_avatar/set_address/register_coupon | ✅ |
| /api/user-actions?type=profile | GET | 내 프로필 (`{username, role, email, avatarUrl, defaultAddress}`) | ✅ |
| /api/user-actions?type=cart\|wishlist | GET | 서버 장바구니/위시리스트 조회 | ✅ |
| /api/orders | GET | 본인 주문 목록 (admin은 전체 + username 포함) | ✅ |
| /api/orders/:id | GET | 주문 상세 (shipping 포함, 타인 주문은 404) | ✅ |
| /api/orders/:id | PATCH | `{action:'cancel'\|'advance'\|'set_status'}` 취소/상태진행/상태지정 (종료 상태 409 `INVALID_TRANSITION`, set_status는 ADMIN) | ✅ |
| /api/payment | POST | 모의 카드 결제 (201 DONE / 402 거절·한도 / 504 타임아웃 — 카드 끝 4자리 결정론, `?simulate=` 폴트주입) | ✅ |
| /api/payment?paymentKey= | GET | 결제 내역 조회 (없으면 404 `PAYMENT_NOT_FOUND`) | ✅ |
| /api/upload | POST | 이미지 업로드(모의, 검증+에코) — 400 `INVALID_FILE_TYPE` / 413 `FILE_TOO_LARGE`(2MB) / 400 `INVALID_KIND` | ✅ |
| /api/tracking?trackingNumber= | GET | 배송 추적(모의 택배) — 송장번호 공개 / `?orderId=`는 인증, 없으면 404 `TRACKING_NOT_FOUND` | ❌/✅ |
| /api/admin | GET/POST/PUT/DELETE | 상품 CRUD — DB에 반영되어 목록/상세에 즉시 노출 | ✅ ADMIN |
| /api/status-codes | GET | 원하는 HTTP 상태 코드 반환 (연습용, DB 불필요) | ❌ |
| /api/reset | POST | 모든 데이터를 시드 상태로 초기화 (TRUNCATE + 재시드) — 응답 `reset` 배열 9종: products/users/reviews/wishlists/carts/orders/coupons/payments/user_coupons | ❌ |

> 주문(`action: 'order'`) 참고: `items`를 생략하면 서버 장바구니 전체를 주문하고 장바구니를 비웁니다.
> `couponCode`, `shipping: {name, phone, address, memo}`를 함께 보낼 수 있으며, 성공 시 201과
> `{order: {id: 'ORD-yyyymmdd-XXXX', totalPrice, discount, finalPrice, status: 'PAID'}, items}`를 반환합니다.
> 가격은 항상 서버(DB)가 결정하며 클라이언트가 보낸 가격은 무시됩니다.

## 🎓 학습 가능한 QA 역량

1. **셀렉터 전략**: `getByTestId`/`getByRole` 우선(1급), 보조로 ID/ARIA 활용
2. **상태 검증**: loading, disabled, error
3. **API 테스팅**: HTTP 메서드, 상태 코드, 응답 구조
4. **권한 테스트**: 인증/인가 플로우
5. **에러 시나리오**: 400/401/403/404/500
6. **폼 검증**: Validation, 에러 메시지
7. **E2E 시나리오**: 전체 사용자 플로우

## 📝 변경 이력

### v2.1 (2026-07-05)
- ✅ 결제(모의 PG, 이니시스 스타일): 체크아웃 카드 입력폼 + 테스트 카드 끝 4자리로 승인/거절(402)/한도(402)/타임아웃(504) 재현 (`POST /api/payment`, `?simulate=` 폴트주입, `GET ...?paymentKey=` 사후조회)
- ✅ 파일 업로드(모의): 리뷰 이미지·프로필 아바타, 형식/용량(2MB) 검증 (`POST /api/upload`, 공통 `ImageUpload` 컴포넌트)
- ✅ 주문 상태 전이 + 배송추적: `결제완료→상품준비중→배송중(송장 MC+10자리)→배송완료` (`PATCH .../advance`), 공개 배송조회 `/tracking` + 모의 택배 `GET /api/tracking`
- ✅ 신규 라우트 `/profile`(로그인 필요, 아바타 + 카카오/다음 주소검색·수동입력 폴백), `/tracking`(공개)
- ✅ 계정 드롭다운(`user-menu-trigger`)에 배송조회·내정보 등 항목(`usermenu-*`) 정리 — 현재 셀렉터는 위 [셀렉터 사전](#-주요-ui-셀렉터) 참조
- ⚠️ 배포 후 Neon에 `npm run db:migrate` 1회 실행 필요 (payments 테이블, users.avatar_url, reviews.images, orders.tracking_number/payment_key/payment_method/card_last4 컬럼 추가 — 비파괴)

### v2.0 (2026-07-04)
- ✅ Postgres(Neon) 영속 저장으로 전환 — 메모리 상태 제거, `POST /api/reset`으로 시드 복원
- ✅ 회원가입 (`/signup`, `POST/GET /api/signup`)
- ✅ 체크아웃 + 쿠폰 (`/checkout`, `POST /api/coupons`)
- ✅ 주문내역/주문취소 (`/orders`, `GET/PATCH /api/orders`)
- ✅ 위시리스트 페이지 (`/wishlist`) 및 카드 하트 토글
- ✅ 상품 상세 강화: 이미지 갤러리, 탭(설명/스펙/배송/리뷰), 평점 분포, 리뷰 작성 폼
- ✅ URL 라우팅(딥링크) 지원

### v1.1 (2026-02-03)
- ✅ QA 가이드 컴포넌트 추가
- ✅ 미존재 상품 ID는 모두 404 응답
- ✅ HomePage에 QA 가이드 버튼 추가
- ✅ 모든 주요 UI에 id/class/aria-label 정리

### v1.0 (기존)
- 로그인/상품/장바구니/주문 기본 기능
- 관리자 페이지 (CRUD)
- API 기본 구조

## 💾 상태 모델 (Postgres 영속)

- 모든 상태(상품/계정/리뷰/장바구니/위시리스트/주문/쿠폰)는 **Postgres에 영속 저장**됩니다. 서버 메모리 상태는 없습니다.
- Vercel 배포본(공유 연습 사이트)에서도 mutation이 그대로 유지되므로 read-back 검증(작성 → 새로고침 → 확인)을 배포 환경에서 바로 연습할 수 있습니다.
- `DATABASE_URL` 미설정 시 모든 데이터 엔드포인트가 503 `{ code: "DB_NOT_CONFIGURED" }`를 반환합니다 (`/api/status-codes`는 DB 불필요).
- `POST /api/reset` 으로 언제든 시드 상태로 되돌릴 수 있습니다 — 가입 계정/주문/리뷰/장바구니/위시리스트가 전부 초기화되고 의도적 픽스처(상품 3·4 상세 500, 16 상세 404, test2 로그인 차단, EXPIRED10 쿠폰 만료 등)가 복원됩니다. (씨드 재고는 전 상품 5~30 범위이며 재고 0인 상품은 없습니다.) 여러 사람이 공유하는 사이트이므로 reset 시 다른 사용자의 데이터도 함께 초기화되는 점에 유의하세요.
- 스키마/시드 정의: `api/_lib/schema.js`, `api/_lib/seedData.js` (최초 1회 `npm run db:init`)

## 🔍 참고

- ProductDetail 페이지는 inventory API(`#stock-info`)와 reviews API(리뷰 탭 `#tab-reviews`, `[data-testid="review-item-{id}"]`)가 연동되어 있습니다.
- 상품 목록 필터링은 클라이언트에서 수행되며, 빈 검색어 제출 시 `/api/search?q=` 를 호출해 400 오류를 표시합니다 (의도적 연습 케이스). search API 자체는 직접 호출로 테스트하세요.
- status-codes API는 Playwright/Postman 직접 호출로 다양한 HTTP 상태 코드를 연습할 수 있습니다.

## 📞 문의
프로젝트 관련 문의는 프로젝트 README 참고

---
**만든 날짜**: 2026-02-03  
**목적**: QA 자동화 연습 & 포트폴리오
