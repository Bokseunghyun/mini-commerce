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
await page.click('#login-btn');
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
  
  // 입력
  await page.fill('#username', 'test');
  await page.fill('#password', '1234');
  
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
  await expect(page.locator('#logout-btn')).toBeVisible();
});
```

### 패턴 2: 에러 처리 검증

```typescript
import { test, expect } from '@playwright/test';

test('잘못된 계정 로그인 실패', async ({ page }) => {
  await page.goto('/');
  await page.fill('#username', 'wrong');
  await page.fill('#password', 'wrong');
  
  const [response] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  // 에러 응답 검증
  expect(response.status()).toBe(401);
  const data = await response.json();
  expect(data.code).toBe('INVALID_CREDENTIALS');
  
  // 에러 메시지 UI 확인
  await expect(page.locator('.error-message'))
    .toContainText('아이디 또는 비밀번호');
});
```

### 패턴 3: POST 요청 검증

```typescript
import { test, expect } from '@playwright/test';

test('상품 추가', async ({ page }) => {
  // 로그인하여 토큰 획득
  await page.goto('/');
  await page.click('#login');
  await page.fill('#username', 'admin');
  await page.fill('#password', '1234');
  await page.click('#submit');
  
  const token = await page.evaluate(() => 
    localStorage.getItem('token')
  );
  
  // API 직접 호출
  const response = await page.request.post('/api/products', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    data: {
      name: '신제품',
      price: 50000,
      category: '전자기기'
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
  await page.goto('/products');
  
  // POST 메서드만 캡처
  const response = await page.waitForResponse(
    res => res.url().includes('/api/cart') && 
           res.request().method() === 'POST'
  );
  
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
