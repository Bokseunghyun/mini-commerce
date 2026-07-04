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
await page.click('#login-submit');
await expect(page.locator('.success')).toBeVisible();
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

---

## 2. 핵심 함수 3가지

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

// UI 없이 API만 테스트
const response = await page.request.get('/api/products/99');

expect(response.status()).toBe(404);
const body = await response.json();
expect(body.code).toBe('PRODUCT_NOT_FOUND');
```

> 💡 본 사이트의 의도적 픽스처: 상품 3/4 → 500, 상품 16 → 404 (버그가 아닌 연습용 고정 시나리오)

**언제 사용?**
- UI 없이 API만 검증할 때
- 여러 상태 코드를 빠르게 테스트할 때

---

## 3. 실전 패턴

### 패턴 1: 로그인 검증

```typescript
import { test, expect } from '@playwright/test';

test('로그인 성공', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');  // 홈 → 로그인 페이지 이동
  
  // 입력
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  
  // API 응답 캡처
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  // API 검증
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.token).toBeTruthy();
  expect(data.user).toBeDefined();
  
  // UI 검증
  await expect(page.locator('#home-logout')).toBeVisible();
});
```

### 패턴 2: 에러 처리 검증

```typescript
import { test, expect } from '@playwright/test';

test('잘못된 계정 로그인 실패', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  await page.fill('#login-username', 'wrong');
  await page.fill('#login-password', 'wrong');
  
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  // 에러 응답 검증 (응답: { "message": "아이디 또는 비밀번호 오류" })
  expect(response.status()).toBe(401);
  const data = await response.json();
  expect(data.message).toContain('아이디 또는 비밀번호');
  
  // 에러 메시지 UI 확인
  await expect(page.locator('#login-error'))
    .toContainText('아이디 또는 비밀번호');
});
```

### 패턴 3: POST 요청 검증

```typescript
import { test, expect } from '@playwright/test';

test('상품 추가', async ({ page }) => {
  // 로그인하여 토큰 획득 (상품 추가는 ADMIN 권한 필요)
  await page.goto('/');
  await page.click('#home-login');
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  const token = await page.evaluate(() => 
    localStorage.getItem('token')
  );
  
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
  page.click('#button')
]);
```

### API 직접 호출
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
// 모든 상태가 Postgres(DB)에 저장되므로 서버 재시작으로는 초기화되지 않음
// POST /api/reset 으로 초기화 — 상품/사용자(가입 계정 삭제)/리뷰/위시리스트/장바구니/주문/쿠폰을 시드 상태로 복원
const res = await page.request.post('/api/reset');
expect(res.status()).toBe(200);
// 응답: { "message": "모든 데이터가 초기화되었습니다",
//         "reset": ["products", "users", "reviews", "wishlists", "carts", "orders", "coupons"] }
```

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
//                     VIP20(20%, 최소 10만, 최대 5만), EXPIRED10(만료 — 의도적 픽스처)
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
