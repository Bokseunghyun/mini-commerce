# API 검증 가이드 (요약본)

---

## 📚 목차
1. [기본 개념](#1-기본-개념)
2. [핵심 함수 3가지](#2-핵심-함수-3가지)
3. [실전 패턴](#3-실전-패턴)
4. [자주 하는 실수](#4-자주-하는-실수)

---

## 1. 기본 개념

### API 검증이란?
**서버와 브라우저 사이의 통신을 확인하는 것**

```typescript
// UI만 검증 (불충분)
await page.getByTestId('login-submit-button').click();
await expect(page.getByTestId('login-modal')).toBeHidden();
// → 화면은 성공이지만 실제 서버 응답은?

// API까지 검증 (완전)
const response = await page.waitForResponse(
  res => res.url().includes('/api/login')
);
expect(response.status()).toBe(200);
const data = await response.json();
expect(data.token).toBeTruthy();
```

### 왜 필요한가?
- UI는 성공인데 서버는 에러일 수 있음
- 토큰, 에러 코드 등 실제 데이터 검증 필요
- 실무에서 버그의 30%는 API 검증으로만 발견

> 🌐 **환경 전제:** 앱 origin은 `http://localhost:5173`(vite dev), `/api/*`는 vite가 백엔드(`3000`)로 프록시한다.
> 테스트에서는 `playwright.config.ts`에 `baseURL: 'http://localhost:5173'`를 두고 **상대경로 `/api/...`**만 쓴다.

---

## 2. 핵심 함수 3가지

> 🎯 **셀렉터 팁:** 이 앱에는 `data-testid`가 389개나 촘촘히 박혀 있다.
> UI를 다룰 때는 `getByTestId`/`getByRole`를 **1급(우선) 셀렉터**로 안심하고 써라.

### 2.1 page.waitForResponse() - 응답 대기

```typescript
import { test, expect } from '@playwright/test';

// 기본 사용
const response = await page.waitForResponse(
  res => res.url().includes('/api/login')
);

// 상태 코드 확인
expect(response.status()).toBe(200);

// 응답 데이터 확인
const data = await response.json();
expect(data.token).toBeTruthy();
```

**언제 사용?**
- API 호출 후 응답을 검증할 때
- 여러 API 중 특정 API만 캡처할 때

### 2.2 Promise.all() - 동시 실행

```typescript
import { test, expect } from '@playwright/test';

// 클릭과 동시에 응답 대기
const [response] = await Promise.all([
  page.waitForResponse(res => res.url().includes('/api/login')),
  page.click('#login-submit')  // 이 클릭이 API를 호출함
]);

expect(response.status()).toBe(200);
```

**왜 필요?**
- `waitForResponse`는 응답을 기다림
- 하지만 누가 API를 호출해야 함
- `Promise.all()`로 "대기 시작"과 "API 호출 트리거"를 동시 실행

### 2.3 page.request.get/post() - 직접 호출

```typescript
import { test, expect } from '@playwright/test';

// UI 없이 API만 테스트 (baseURL=5173, /api는 백엔드로 프록시)
const response = await page.request.get('/api/products/16');

expect(response.status()).toBe(404);
const body = await response.json();
expect(body.code).toBe('PRODUCT_NOT_FOUND');
```

> 💡 본 사이트의 고정 픽스처: 상품 `3`·`4` 조회 → 500, 상품 `16` 조회 → 404. 이 응답을 그대로 검증하는 연습용 시나리오다.

**언제 사용?**
- UI 없이 API만 검증할 때 → **순수 API 검증의 기본 도구**
- 여러 상태 코드를 빠르게 테스트할 때
- (참고) UI 동작이 유발한 네트워크 호출을 검증할 때만 `page.waitForResponse(...)`를 쓴다.
  즉 **순수 API = `page.request`, UI 유발 호출 검증 = `waitForResponse`**.

---

## 3. 실전 패턴

### 패턴 1: 로그인 검증

> ⚠️ 로그인은 **모달**로 진입한다. 계정 드롭다운(`user-menu-trigger`)을 연 뒤 `usermenu-login`을 누르면 로그인 모달(`login-modal`)이 뜬다.
> 로그인 성공은 모달(`login-modal`)이 닫히는 것(또는 `usermenu-logout` 노출)으로 검증한다.

```typescript
import { test, expect } from '@playwright/test';

test('로그인 성공', async ({ page }) => {
  await page.goto('/');

  // 계정 드롭다운 → 로그인 모달 열기
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();

  // 입력 (모달 안의 폼)
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');

  // 클릭이 유발하는 로그인 API 응답을 함께 캡처
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);

  // API 검증 (서버는 set-cookie 없이 { token, user }만 반환)
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.token).toBeTruthy();
  expect(data.user).toBeDefined();

  // UI 검증: 리다이렉트가 아니라 모달이 닫히고 로그인 상태 UI가 뜬다
  await expect(page.getByTestId('login-modal')).toBeHidden();
  await page.getByTestId('user-menu-trigger').click();
  await expect(page.getByTestId('usermenu-logout')).toBeVisible();
});
```

### 패턴 2: 에러 처리 검증

```typescript
import { test, expect } from '@playwright/test';

test('잘못된 계정 로그인 실패', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  await page.getByTestId('username-input').fill('wrong');
  await page.getByTestId('password-input').fill('wrong');

  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);

  // 에러 응답 검증 (응답: { "message": "아이디 또는 비밀번호 오류" })
  expect(response.status()).toBe(401);
  const data = await response.json();
  expect(data.message).toContain('아이디 또는 비밀번호');

  // 에러 메시지 UI 확인 (모달은 닫히지 않고 에러가 표시됨)
  await expect(page.getByTestId('login-error'))
    .toContainText('아이디 또는 비밀번호');
});
```

> 💡 사용자 `test2`는 비밀번호가 맞아도 로그인이 차단되어 403을 반환하는 고정 픽스처다. 이 차단 응답(403)을 검증하는 케이스로 활용한다.

### 패턴 3: POST 요청 검증

```typescript
import { test, expect } from '@playwright/test';

test('상품 추가', async ({ page }) => {
  // 상품 추가는 ADMIN 권한 필요 → 토큰이 있어야 한다.
  // UI 로그인 없이 API로 직접 토큰을 받는 것이 가장 빠르다:
  const login = await page.request.post('/api/login', {
    data: { username: 'admin', password: '1234' }
  });
  const { token } = await login.json();

  // API 직접 호출 (상품 추가는 POST /api/admin)
  const response = await page.request.post('/api/admin', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    data: {
      name: '신제품',
      category: '전자기기',       // 전자기기/액세서리/생활 중 하나
      originalPrice: 60000,
      discountedPrice: 50000
    }
  });
  
  expect(response.status()).toBe(201);
  const data = await response.json();
  expect(data.product.id).toBeDefined();
  expect(data.product.name).toBe('신제품');
});
```

### 패턴 4: 조건부 응답 필터링

```typescript
import { test, expect } from '@playwright/test';

test('특정 API만 캡처', async ({ page }) => {
  await page.goto('/');
  
  // POST 메서드만 캡처
  // (장바구니 추가·수정·삭제/주문/위시리스트는 모두 POST /api/user-actions 로 호출됨)
  const response = await page.waitForResponse(
    res => res.url().includes('/api/user-actions') && 
           res.request().method() === 'POST'
  );
  
  // 장바구니 액션(cart_add 등)은 200, 주문(order)·위시리스트 추가(wishlist_add)는 201
  expect(response.status()).toBe(200);
});
```

---

## 4. 자주 하는 실수

### 실수 1: Promise.all() 없이 waitForResponse

```typescript
// ❌ 잘못된 코드
await page.waitForResponse(res => res.url().includes('/api/login'));
await page.click('#login-submit');
// → 대기만 하고 있어서 타임아웃!

// ✅ 올바른 코드
const [response] = await Promise.all([
  page.waitForResponse(res => res.url().includes('/api/login')),
  page.click('#login-submit')  // 이게 API를 트리거함
]);
```

### 실수 2: JSON 파싱 전 확인 누락

```typescript
// ❌ 잘못된 코드
const data = await response.json();
// → Content-Type이 text/html이면 에러!

// ✅ 올바른 코드
const contentType = response.headers()['content-type'];
if (contentType?.includes('application/json')) {
  const data = await response.json();
} else {
  const text = await response.text();
}
```

### 실수 3: 타임아웃 설정 누락

```typescript
// ❌ 잘못된 코드
await page.waitForResponse(res => res.url().includes('/api/slow'));
// → 느린 API면 30초 기다림

// ✅ 올바른 코드
await page.waitForResponse(
  res => res.url().includes('/api/slow'),
  { timeout: 60000 }  // 60초로 증가
);
```

### 실수 4: 헤더에 토큰 빠뜨림

이 앱은 로그인 인증정보(`token`/`role`/`username`)를 **localStorage**에 저장한다.
따라서 아래처럼 `localStorage`에서 토큰을 읽어 헤더에 넣는다.

```typescript
// ❌ 잘못된 코드
const response = await page.request.get('/api/admin');
// → 401 Unauthorized

// ✅ 올바른 코드
const token = await page.evaluate(() => localStorage.getItem('token'));
const response = await page.request.get('/api/admin', {
  headers: { Authorization: `Bearer ${token}` }
});
```

> 💡 순수 API 검증이라면 UI를 거칠 필요 없이 `POST /api/login`으로 토큰을 바로 받는 편이 빠르다(패턴 3 참고).
> 로그인은 새로고침·탭 재시작 후에도 유지되고 탭 간 공유된다. JWT는 **1시간 후 만료**되어 이후 인증요청은 401이다(고정 픽스처).

### 실수 5: `waitForTimeout`으로 고정 대기

```typescript
// ❌ 잘못된 코드 — 느리면 실패, 빠르면 낭비
await page.getByTestId('login-submit-button').click();
await page.waitForTimeout(3000);
await expect(page.getByTestId('login-modal')).toBeHidden();

// ✅ 올바른 코드 — 조건 충족까지 자동 재시도(web-first assertion)
await page.getByTestId('login-submit-button').click();
await expect(page.getByTestId('login-modal')).toBeHidden();
```

`page.waitForTimeout(...)` 같은 sleep과 `waitForLoadState('networkidle')`은 피한다.
대신 `await expect(locator).toBeVisible()` / `toHaveText(...)`, `await locator.waitFor({ state: 'hidden' })`처럼 조건을 기다리는 단언을 쓴다.

### 로그인 재사용 — storageState (반복 로그인 제거)

`storageState`는 **쿠키 + localStorage를 파일로 직렬화**한다(sessionStorage는 저장 안 됨). 이 앱은 인증을 localStorage에 두므로 표준 setup 패턴이 그대로 동작한다.

```typescript
// auth.setup.ts — 한 번만 로그인해 세션을 파일로 저장
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
  await page.context().storageState({ path: authFile });  // localStorage 포함 저장 → 재사용
});
```

```typescript
// playwright.config.ts — setup 프로젝트가 만든 세션을 이후 테스트가 재사용
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  { name: 'chromium', dependencies: ['setup'],
    use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' } },
];
```

---

## 5. 빠른 참고 치트시트

### 응답 대기
```typescript
const response = await page.waitForResponse(
  res => res.url().includes('/api/endpoint')
);
```

### 클릭과 동시 대기
```typescript
const [response] = await Promise.all([
  page.waitForResponse(res => res.url().includes('/api/endpoint')),
  page.getByTestId('login-submit-button').click()  // 이 앱은 data-testid가 촘촘하니 getByTestId를 1급 셀렉터로
]);
```

### API 직접 호출 (baseURL=5173, 상대경로만)
```typescript
const response = await page.request.get('/api/endpoint');
const response = await page.request.post('/api/endpoint', {
  headers: { 'Content-Type': 'application/json' },
  data: { key: 'value' }
});
```

### 상태 코드 검증
```typescript
expect(response.status()).toBe(200);
expect(response.status()).toBe(201);  // Created
expect(response.status()).toBe(400);  // Bad Request
expect(response.status()).toBe(401);  // Unauthorized
expect(response.status()).toBe(404);  // Not Found
```

### 응답 본문 검증
```typescript
const data = await response.json();
expect(data.token).toBeTruthy();
expect(data.error).toBeUndefined();
expect(data.message).toBe('Success');
```

### localStorage 토큰 사용
```typescript
const token = await page.evaluate(() => localStorage.getItem('token'));
const response = await page.request.get('/api/protected', {
  headers: { Authorization: `Bearer ${token}` }
});
```

### 테스트 데이터 초기화 (반복 실행 대비)
```typescript
// 모든 상태가 Postgres(DB)에 계정 단위로 영속되므로 서버 재시작으로는 초기화되지 않음
// POST /api/reset 으로 시드 상태 복원 (장바구니/주문/리뷰/쿠폰 등)
const res = await page.request.post('/api/reset');
expect(res.status()).toBe(200);
// 응답 reset 배열은 9개: products, users, reviews, wishlists, carts,
//   orders, coupons, payments, user_coupons
// → status 200 + message 존재 위주로 검증하는 것이 안정적
expect((await res.json()).message).toBeTruthy();
```

> 🔒 **테스트 격리:** `beforeEach`에서 `POST /api/reset`(공유 환경 전체 초기화)을 하거나,
> 병렬 실행(fullyParallel)이라면 테스트별 **고유 계정**(`/api/signup`)으로 격리한다.
> ```typescript
> test.beforeEach(async ({ request }) => { await request.post('/api/reset'); });
> // 병렬 시: const username = `u${Date.now()}_${test.info().parallelIndex}`;
> ```

### 신규 엔드포인트 빠른 참조 (signup / coupons / orders)
```typescript
// 회원가입 — 가입 즉시 로그인 가능 (role: USER)
// 네거티브: 400 INVALID_USERNAME(영소문자+숫자 4~12자) / INVALID_PASSWORD(4자 이상, 조합 무관)
//           / INVALID_EMAIL, 409 USERNAME_TAKEN
await page.request.post('/api/signup', {
  data: { username: 'newuser1', password: 'password1' }
}); // → 201
await page.request.get('/api/signup?username=newuser1'); // → 200 { username, available }

// 쿠폰 검증 — 시드 4종: WELCOME10(10%, 최대 2만), SAVE5000(5천원, 최소 3만),
//                     VIP20(20%, 최소 10만, 최대 5만), EXPIRED10(만료 응답 검증용 고정 픽스처)
// 네거티브: 404 COUPON_NOT_FOUND, 400 COUPON_EXPIRED / MIN_ORDER_NOT_MET / INVALID_AMOUNT
await page.request.post('/api/coupons', {
  data: { code: 'WELCOME10', orderAmount: 100000 }
}); // → 200 { valid, code, type, amount, discount, finalAmount }

// 주문 생성 — POST /api/user-actions { action: 'order', items?, couponCode?, shipping? } → 201
// (items 생략 시 서버 장바구니 전체 주문, 가격은 서버(DB)가 결정)

// 주문 목록/상세/취소 (모두 인증 필요)
await page.request.get('/api/orders', {
  headers: { Authorization: `Bearer ${token}` }
}); // → 200 { count, orders } (본인 주문만, 관리자는 전체)
await page.request.get(`/api/orders/${orderId}`, {
  headers: { Authorization: `Bearer ${token}` }
}); // → 200 { order } | 404 ORDER_NOT_FOUND (타인 주문도 404)
await page.request.patch(`/api/orders/${orderId}`, {
  headers: { Authorization: `Bearer ${token}` },
  data: { action: 'cancel' }
}); // → 200 (재고 원복) | 409 ALREADY_CANCELED
```

### 신규 엔드포인트 빠른 참조 (payment / upload / tracking · advance)
```typescript
// 결제 (모의 PG, 이니시스 스타일) — 결과는 카드 뒤 4자리 또는 ?simulate= 로 결정론적
// 0000 승인 / 0001 402 PAYMENT_DECLINED / 0002 402 PAYMENT_LIMIT_EXCEEDED
// 9999 504 PAYMENT_GATEWAY_TIMEOUT / 그 외 승인. 400 INVALID_CARD / INVALID_AMOUNT
// ?simulate=decline|limit|timeout|error (error → 500 PAYMENT_ERROR) — 외부 API 목킹 연습
await page.request.post('/api/payment', {
  headers: { Authorization: `Bearer ${token}` },
  data: { cardNumber: '4000000000000000', amount: 129000 }
}); // → 201 { paymentKey:'PAY-...', status:'DONE', method:'CARD', cardLast4, amount }
await page.request.get(`/api/payment?paymentKey=${paymentKey}`, {
  headers: { Authorization: `Bearer ${token}` }
}); // → 200 결제레코드 | 404 PAYMENT_NOT_FOUND (사후검증)
// 주문 연동: POST /api/user-actions { action:'order', ..., paymentKey } 로 결제 연결
//   금액 불일치/미승인/중복사용 → 402 PAYMENT_INVALID, 결제 없음 → 402 PAYMENT_REQUIRED

// 파일 업로드(모의) — data URL 이미지 형식/용량 검증 후 에코
// 400 INVALID_FILE_TYPE / INVALID_KIND, 413 FILE_TOO_LARGE(>2MB)
await page.request.post('/api/upload', {
  headers: { Authorization: `Bearer ${token}` },
  data: { kind: 'review', image: 'data:image/png;base64,....' }
}); // → 201 { url, kind }
// 아바타: POST /api/user-actions { action:'set_avatar', image } → 200 { avatarUrl }
// 리뷰 이미지: POST/PATCH /api/reviews 에 images:string[](최대 3), 400 INVALID_REVIEW_IMAGE

// 배송 상태 전진 (본인/관리자) — PAID→PREPARING→SHIPPING(운송장 MC+10자리)→DELIVERED
await page.request.patch(`/api/orders/${orderId}`, {
  headers: { Authorization: `Bearer ${token}` },
  data: { action: 'advance' }
}); // → 200 { order } | 409 INVALID_TRANSITION (DELIVERED/CANCELED)
// set_status(관리자): { action:'set_status', status } — 비관리자 403, 잘못된 상태 400 INVALID_STATUS

// 배송 추적 (송장번호=공개 / orderId=인증) — events:[{ status, label, at, location }]
await page.request.get(`/api/tracking?trackingNumber=${trackingNumber}`);
// → 200 { trackingNumber, status, events } | 404 TRACKING_NOT_FOUND
```

---

## 6. 학습 로드맵

### 1주차: 기본 익히기
- `page.waitForResponse()` 10번 사용해보기
- 로그인 API 검증 3가지 방법 시도
- 상태 코드 200, 400, 401, 404 각각 테스트

### 2주차: 실전 적용
- 모든 테스트에 API 검증 추가
- POST, PUT, DELETE 요청 각 5번씩
- 에러 케이스 10개 작성

### 3주차: 고급 패턴
- 여러 API 동시 검증
- 조건부 필터링
- 성능 측정 (응답 시간)

---

**💡 핵심 기억 포인트:**
1. UI 검증만으로는 불충분 → API도 검증
2. `Promise.all()` 패턴 필수
3. 상태 코드와 응답 데이터 모두 확인
4. 토큰이 필요한 API는 헤더에 포함

**🎯 다음 단계:** 실제 프로젝트의 로그인 API부터 적용해보세요!
