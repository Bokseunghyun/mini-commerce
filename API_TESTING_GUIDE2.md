# API 검증 가이드

---

## 📚 목차
1. [API 검증이 정확히 뭔데?](#1-api-검증이-정확히-뭔데)
2. [왜 API 검증이 필요한가?](#2-왜-api-검증이-필요한가)
3. [핵심 함수 완전 정복](#3-핵심-함수-완전-정복)
4. [손에 익히는 4단계 학습법](#4-손에-익히는-4단계-학습법)
5. [콘솔 디버깅 완전 정복](#5-콘솔-디버깅-완전-정복)
6. [실전 연습 프로젝트](#6-실전-연습-프로젝트)
7. [체화 훈련](#7-체화-훈련)
8. [API 성능 테스트](#8-api-성능-테스트)
9. [자주 하는 실수](#9-자주-하는-실수)

---

## 1. API 검증이 정확히 뭔데?

### 1.1 기본 개념

**API 검증 = 서버와 브라우저 사이의 대화를 엿듣는 것**

```
[브라우저] ━━ "로그인해줘!" ━━▶ [서버]
           ◀━━ "OK! 토큰 줄게" ━━

API 검증 = 이 대화 내용을 확인하는 것
- "서버가 제대로 응답했나?"
- "토큰을 진짜 줬나?"
- "에러는 없나?"
```

### 1.2 UI 검증 vs API 검증

```typescript
// UI 검증 (당신이 익숙한 것)
await page.click('button');
await expect(page.locator('.success-message')).toBeVisible();
// ✅ "화면에 성공 메시지 떴네!" → 테스트 통과

// 하지만...
// 서버: { error: "DB connection failed" } 
// → UI는 성공 보여줬지만 실제론 실패!
```

```typescript
// API 검증 (새로 배울 것)
const response = await page.waitForResponse((res) => 
  res.url().includes('/api/login')
);

expect(response.status()).toBe(200);     // 서버 응답 성공?
const data = await response.json();       
expect(data.token).toBeTruthy();          // 토큰 실제로 받았나?
expect(data.error).toBeUndefined();       // 에러 없나?

await expect(page.locator('.success-message')).toBeVisible();
// → 서버 응답까지 확인 → 진짜 성공!
```

**핵심 차이:**
- **UI 검증**: "화면이 맞나?" (표면만 봄)
- **API 검증**: "서버가 올바른 데이터를 줬나?" (속까지 봄)

---

### 1.3 API를 확인하는 두 가지 도구 (먼저 이걸 구분하자)

이 가이드의 3~9장은 주로 `page.waitForResponse(...)`를 씁니다. 하지만 그게 **기본 도구는 아닙니다.** 상황에 따라 도구가 갈립니다. 딱 한 줄로 외우세요:

> **순수 API 검증 = `page.request` / `request` 픽스처. UI 동작이 유발한 호출 검증 = `page.waitForResponse`.**

**비유:** `request`는 브라우저 화면 없이 서버에 **직접 전화를 거는 것**이고, `waitForResponse`는 사용자가 버튼을 누를 때 **오가는 통화를 옆에서 엿듣는 것(스파이)**입니다.

```typescript
// ✅ 순수 API 검증 (화면 없이 서버만 때린다 — 빠르고 안정적, 기본 도구)
import { test, expect } from '@playwright/test';

test('상품 목록 API', async ({ request }) => {
  const res = await request.get('/api/products');  // baseURL=5173, /api는 3000으로 프록시
  expect(res).toBeOK();                             // 200~299면 통과
  const { products } = await res.json();
  expect(products.length).toBeGreaterThan(0);
});
```

```typescript
// ✅ UI 유발 호출 검증 (버튼 클릭이 만든 네트워크 호출을 엿듣는다)
const [res] = await Promise.all([
  page.waitForResponse((r) => r.url().includes('/api/login')),
  page.getByTestId('login-submit-button').click(),
]);
expect(res.status()).toBe(200);
```

**언제 무엇을?**
- 서버 계약(상태코드/응답구조/에러코드)만 검증 → **`request`** (화면 안 띄움 → 훨씬 빠름)
- "이 버튼을 누르면 서버로 올바른 요청이 나가나?"까지 검증 → **`waitForResponse` + Promise.all**

> `request`는 `baseURL`(`http://localhost:5173`)이 자동 적용되므로 항상 상대경로 `/api/...`만 씁니다(`/api`는 vite가 백엔드로 프록시). 인증이 필요한 요청은 로그인 API로 받은 `token`을 헤더로 실어 보냅니다(→ [6장](#6-실전-연습-프로젝트), 인증 세부는 [README_QA](README_QA.md)).

---

## 2. 왜 API 검증이 필요한가?

### 2.1 실무 사례로 이해하기

#### 🐛 사례 1: UI는 성공인데 실제론 실패
```typescript
// 로그인 버튼 클릭
await page.getByTestId('login-submit-button').click();

// UI 검증만 함 (아래 .success / '/dashboard'는 개념 설명용 일반 예시.
//  이 앱은 로그인 성공 시 로그인 모달이 닫히므로, 성공 검증은
//  await expect(page.getByTestId('login-modal')).toBeHidden() 로 한다.)
await expect(page.locator('.success')).toBeVisible();
await expect(page).toHaveURL('/dashboard');
// ✅ 테스트 통과!

// 실제 API 응답:
{
  "token": null,
  "error": "Database connection timeout",
  "code": "DB_ERROR"
}

// 문제:
// - 프론트엔드가 에러를 무시하고 dashboard로 이동
// - 토큰이 없어서 다음 API 호출 시 전부 401 에러
// - 사용자는 "로그인됐다고 했는데 왜 안 돼?" 하고 문의
```

**API 검증으로 잡는 법:**
```typescript
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/login')),
  page.getByTestId('login-submit-button').click()
]);

// 상태 코드 확인
expect(response.status()).toBe(200);  // ❌ 500이면 여기서 실패!

// 데이터 확인
const data = await response.json();
expect(data.token).toBeTruthy();      // ❌ null이면 여기서 실패!
expect(data.error).toBeUndefined();   // ❌ 에러 있으면 여기서 실패!

// UI 확인
await expect(page.locator('.success')).toBeVisible();
```

---

#### 🐛 사례 2: 재고 부족 에러 놓침
```typescript
// 주문하기 버튼 클릭
await page.click('text=주문하기');

// UI만 체크
await expect(page).toHaveURL('/order-complete');
// ✅ URL 바뀜 = 성공!

// 실제 API 응답 (409):
{
  "message": "재고 부족: 발마사지기 무선 온열 기능\n요청 수량: 99개\n사용 가능 재고: 12개",
  "code": "INSUFFICIENT_STOCK",
  "productId": 1,
  "requestedQuantity": 99,
  "availableStock": 12
}

// 문제:
// - 프론트엔드가 에러 무시하고 완료 페이지로 이동
// - 실제론 주문 안 됨
// - 결제는 되는데 배송은 안 됨 → 환불 처리 필요
```

**API 검증으로 잡는 법:**
```typescript
// 주문은 POST /api/user-actions (body: { action: 'order', ... } — items 생략 시 서버 장바구니 주문)
const [orderResponse] = await Promise.all([
  page.waitForResponse((res) =>
    res.url().includes('/api/user-actions') &&
    res.request().method() === 'POST'
  ),
  // 체크아웃 페이지의 결제하기 버튼 클릭. 실제 셀렉터는 셀렉터 사전(README_QA) 확인 후 getByTestId로.
  page.getByRole('button', { name: /결제하기|주문하기/ }).click()
]);

// 재고 있을 때 (주문 성공은 201 Created)
if (orderResponse.status() === 201) {
  const data = await orderResponse.json();
  expect(data.message).toBe('주문 완료');
  // 주문 정보는 order 객체로 반환됨: { id, totalPrice, discount, finalPrice, status }
  expect(data.order.finalPrice).toBeGreaterThan(0);
  expect(data.order.status).toBe('PAID');
}

// 재고 부족일 때
if (orderResponse.status() === 409) {  // Conflict
  const error = await orderResponse.json();
  expect(error.code).toBe('INSUFFICIENT_STOCK');
  // UI에 에러 메시지 떠야 함
  await expect(page.getByText('재고 부족')).toBeVisible();
}
```

> 💡 **재고 사실:** 본 사이트 씨드 재고는 상품마다 5~30개 범위이며 모든 상품이 구매 가능한 상태로 시작합니다. `409 INSUFFICIENT_STOCK`을 재현하려면 (a) 현재 재고를 조회한 뒤 `stock+1` 이상 수량으로 주문하거나, (b) 관리자 `PUT /api/admin`으로 재고를 0으로 낮춘 뒤 주문하세요. 자세한 재고 사실은 [README_QA](README_QA.md)를 참고하세요.

---

### 2.2 API 검증으로 잡을 수 있는 것들

```typescript
// 1️⃣ 서버 에러 (500, 502, 503)
expect(response.status()).not.toBe(500);

// 2️⃣ 인증 에러 (401, 403)
expect(response.status()).not.toBe(401); // 토큰 없음
expect(response.status()).not.toBe(403); // 권한 없음

// 3️⃣ 데이터 누락
const data = await response.json();
expect(data.userId).toBeDefined();       // undefined면 에러!

// 4️⃣ 잘못된 데이터 타입
expect(typeof data.price).toBe('number'); // string 오면 에러!
expect(Array.isArray(data.items)).toBe(true);

// 5️⃣ 비즈니스 로직 에러
expect(data.stock).toBeGreaterThan(0);    // 재고 0개면 에러!
expect(data.discount).toBeLessThan(100);  // 할인 100% 넘으면 에러!

// 6️⃣ 보안 이슈
expect(data.password).toBeUndefined();    // 비밀번호 노출되면 안 됨!

// 7️⃣ 성능 이슈
const responseTime = Date.now() - startTime;
expect(responseTime).toBeLessThan(1000);  // 1초 넘으면 느림!
```

---

### 2.3 검증 레벨별 차이

```typescript
// 🥉 레벨 1: 최소 검증 (상태 코드만)
expect(response.status()).toBe(200);
// → "서버가 성공 응답은 했구나"

// 🥈 레벨 2: 기본 검증 (핵심 데이터)
const data = await response.json();
expect(data.token).toBeTruthy();
// → "토큰도 받았구나"

// 🥇 레벨 3: 완벽 검증 (전체 구조)
// 일반 예시 (본 사이트 로그인 응답은 { token, user: { username, role } })
expect(data).toMatchObject({
  token: expect.any(String),
  user: {
    id: expect.any(Number),
    name: expect.any(String),
    email: expect.stringContaining('@')
  }
});
// → "데이터 구조가 정확하구나"

// 🏆 레벨 4: 고급 검증 (Request까지)
const request = response.request();
const requestBody = JSON.parse(request.postData() || '{}');
expect(requestBody.password.length).toBeGreaterThanOrEqual(4);
// → "비밀번호도 4자 이상으로 보냈구나"
```

---

### 2.4 왜 이 순서로 검증해야 하나?

```typescript
// ❌ 잘못된 순서 (에러 발생!)
const data = await response.json();       // 500 에러면 여기서 터짐!
expect(response.status()).toBe(200);      // 실행 안 됨

// ✅ 올바른 순서
expect(response.status()).toBe(200);      // 1. 먼저 상태 확인
const data = await response.json();       // 2. 성공이면 파싱
expect(data.token).toBeTruthy();          // 3. 데이터 검증

// 이유:
// - 500 에러일 때 response.json() 호출하면 에러 발생
// - "Unexpected token < in JSON" 같은 에러 뜸
// - HTML 에러 페이지가 와서 JSON 파싱 실패
```

---

## 3. 핵심 함수 완전 정복

### 3.1 page.waitForResponse() - API 응답 캐치하기

#### 역할
**브라우저가 특정 API 응답을 받을 때까지 기다림**

```typescript
const response = await page.waitForResponse(predicate);
```

#### predicate가 뭔데?
**"이런 조건의 응답이 오면 잡아줘"라고 알려주는 함수**

```typescript
// 조건: URL에 '/api/login' 포함
(res) => res.url().includes('/api/login')

// 동작:
// 1. 브라우저가 모든 네트워크 요청 모니터링
// 2. 응답 올 때마다 이 함수 실행
// 3. true 반환하면 그 응답을 잡아서 리턴
```

#### 예시로 이해하기

```typescript
// 예시 1: 단순 URL 매칭
const response = await page.waitForResponse((res) => 
  res.url().includes('/api/products')
);
// "URL에 /api/products 들어간 응답 잡아줘"

// 예시 2: URL + HTTP 메서드
const response = await page.waitForResponse((res) => 
  res.url().includes('/api/admin') && 
  res.request().method() === 'POST'
);
// "URL에 /api/admin 들어가고 POST 요청인 응답 잡아줘"

// 예시 3: 정확한 URL
const response = await page.waitForResponse(
  'https://api.example.com/login'
);
// "정확히 이 URL인 응답만 잡아줘"

// 예시 4: 정규식
const response = await page.waitForResponse((res) => 
  /\/api\/products\/\d+/.test(res.url())
);
// "URL이 /api/products/1, /api/products/2 같은 패턴인 응답 잡아줘"
```

#### ⚠️ 주의사항: 타이밍이 생명!

```typescript
// ❌ 잘못된 사용 (응답 놓침!)
await page.click('button');  // 1. 클릭 (API 호출 발생)
const response = await page.waitForResponse(...);  // 2. 대기 시작 (이미 늦음!)

// 타임라인:
// [클릭] ━▶ [API 호출] ━▶ [응답 도착] ━▶ [대기 시작] ❌
//                          ↑ 이미 지나감!

// ✅ 올바른 사용 (동시 실행)
const [response] = await Promise.all([
  page.waitForResponse(...),  // 1. 대기 시작
  page.click('button')        // 2. 클릭 (거의 동시에)
]);

// 타임라인:
// [대기 시작] ━━━━━━━━━━━━━━▶ [응답 캐치!] ✅
//     ↓
// [클릭] ━▶ [API 호출] ━▶ [응답 도착]
```

---

### 3.2 Promise.all() - 왜 필요한가?

#### 역할
**여러 비동기 작업을 동시에 실행하고 모두 완료될 때까지 대기**

#### 왜 필요한가? (타임라인으로 이해)

```typescript
// 방법 1: 순차 실행 (느림 + 응답 놓칠 수 있음)
await page.click('button');           // 1초 걸림
const response = await page.waitForResponse(...); // 응답 이미 지나감!

// 타임라인:
// [클릭 1초] ━━━▶ [대기 시작] ━━━▶ ❌ (응답 못 잡음)

// 방법 2: Promise.all (빠름 + 응답 확실히 잡음)
const [response] = await Promise.all([
  page.waitForResponse(...),  // 대기 시작
  page.click('button')        // 클릭
]);

// 타임라인:
// [대기 시작] ━━━━━━━━━━━━━━▶ ✅ (응답 캐치!)
//     ↓
// [클릭] ━━━▶ [응답 도착]
```

#### 배열 구조 분해 할당 완전 이해

**Promise.all은 항상 배열을 반환합니다:**

```typescript
// Promise.all의 반환값
const result = await Promise.all([
  page.waitForResponse(...),  // 첫 번째 작업 → 응답객체
  page.click('button')        // 두 번째 작업 → undefined (클릭은 반환값 없음)
]);

// result의 실제 값:
// result = [응답객체, undefined]
// result[0] = 응답객체
// result[1] = undefined
```

**이걸 더 편하게 쓰는 방법이 배열 구조 분해:**

```typescript
// 방법 1: 첫 번째 값만 꺼내기 (가장 많이 사용) ⭐
const [response] = await Promise.all([
  page.waitForResponse(...),
  page.click('button')
]);
// response = result[0]과 같음
// 클릭 결과(undefined)는 버림

// 방법 2: 둘 다 꺼내기 (거의 안 씀)
const [response, clickResult] = await Promise.all([
  page.waitForResponse(...),
  page.click('button')
]);
// response = result[0]
// clickResult = result[1] (보통 undefined라 의미 없음)

// 방법 3: 배열 그대로 받기 (비추천 - 불편함)
const result = await Promise.all([
  page.waitForResponse(...),
  page.click('button')
]);
const response = result[0];  // 인덱스로 접근해야 함
```

**왜 `const [response]`를 주로 쓸까?**

```typescript
// ❌ 방법 1: result 사용 (번거로움)
const result = await Promise.all([...]);
const response = result[0];
expect(response.status()).toBe(200);

// ✅ 방법 2: [response] 사용 (간결함)
const [response] = await Promise.all([...]);
expect(response.status()).toBe(200);
```

**실전 예시:**

```typescript
// 예시 1: 응답만 필요 (99% 케이스)
const [loginResponse] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/login')),
  page.getByTestId('login-submit-button').click()
]);
expect(loginResponse.status()).toBe(200);

// 예시 2: 여러 API 동시에 받기 (개념 설명용 일반 예시 — 엔드포인트명은 자유)
const [productsRes, categoriesRes, userRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),
  page.waitForResponse((res) => res.url().includes('/api/categories')),
  page.waitForResponse((res) => res.url().includes('/api/user')),
  page.goto('/')
]);
// productsRes = 첫 번째 응답
// categoriesRes = 두 번째 응답
// userRes = 세 번째 응답
```

**핵심 정리:**
- `const [response]` = 첫 번째 값만 꺼냄 (추천 ⭐)
- `const result` = 전체 배열 받음 (비추천)
- 두 방식 모두 동작은 같지만, `[response]`가 더 깔끔함!

---

### 3.3 여러 로케이터 쓰는 경우

#### 언제 여러 개를 Promise.all에 넣나?

**1️⃣ 여러 API를 동시에 기다릴 때**

```typescript
// 사례: 페이지 로드 시 3개 API 동시 호출 (개념 설명용 일반 예시 — 엔드포인트명은 자유)
const [productsRes, categoriesRes, userRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),
  page.waitForResponse((res) => res.url().includes('/api/categories')),
  page.waitForResponse((res) => res.url().includes('/api/user')),
  page.goto('/')  // 페이지 이동 (3개 API 동시 발생)
]);

// 모두 검증
expect(productsRes.status()).toBe(200);
expect(categoriesRes.status()).toBe(200);
expect(userRes.status()).toBe(200);
```

**2️⃣ API 응답 + UI 변화를 동시에 기다릴 때**

```typescript
// 사례: 로그인 시 API 응답 + UI 변화(모달 닫힘) 동시 발생
// 💡 이 앱의 로그인은 성공하면 로그인 "모달이 닫히고" 현재 페이지가 유지된다.
//    따라서 성공 검증은 "로그인 모달이 닫혔는지"로 한다.
const [loginRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/login')),
  page.getByTestId('login-submit-button').click()
]);

// API와 UI 모두 검증
expect(loginRes.status()).toBe(200);
await expect(page.getByTestId('login-modal')).toBeHidden();  // 모달 닫힘으로 검증
```

**3️⃣ 여러 요소가 나타나길 기다릴 때**

```typescript
// 사례: 검색 결과가 로딩되면서 여러 요소 나타남
// (개념 설명용 일반 예시 — 실제 검색 버튼은 getByTestId('search-button'))
const [searchRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/search')),
  page.locator('.search-result').first().waitFor(),  // 첫 결과 대기
  page.locator('.result-count').waitFor(),           // 개수 표시 대기
  page.click('#search-button')
]);

// 모두 나타났는지 확인
await expect(page.locator('.search-result')).toHaveCount(5);
await expect(page.locator('.result-count')).toHaveText('5개');
```

**4️⃣ 연속된 API 호출을 동시에 캐치**

```typescript
// 사례: 상품 추가 시 추가 API + 목록 갱신 API 연속 호출
const [addRes, listRes] = await Promise.all([
  page.waitForResponse((res) => 
    res.url().includes('/api/admin') && 
    res.request().method() === 'POST'
  ),
  page.waitForResponse((res) => 
    res.url().includes('/api/products')
  ),
  page.click('button:has-text("상품 추가")')
]);

// 둘 다 검증
expect(addRes.status()).toBe(201);   // 추가 성공
expect(listRes.status()).toBe(200);  // 목록 조회 성공
```

#### 주의사항

```typescript
// ⚠️ 순서 주의! (개념 설명용 일반 예시 — 엔드포인트명은 자유)
const [res1, res2] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),
  page.waitForResponse((res) => res.url().includes('/api/user')),
  page.goto('/')
]);

// res1 = /api/products 응답
// res2 = /api/user 응답
// → Promise.all 배열 순서대로 할당됨!

// ❌ 잘못된 사용
const [userRes, productsRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),  // 첫 번째
  page.waitForResponse((res) => res.url().includes('/api/user')),      // 두 번째
  page.goto('/')
]);
// userRes에는 products 응답이 들어감! (순서 반대)

// ✅ 올바른 사용
const [productsRes, userRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),
  page.waitForResponse((res) => res.url().includes('/api/user')),
  page.goto('/')
]);
```

---

### 3.4 response 객체 메서드

#### response.status()
**역할:** HTTP 상태 코드 반환 (숫자)

```typescript
const status: number = response.status();

// 성공
200  // OK - 조회/수정/삭제 성공 (이 앱은 삭제 성공도 200으로 응답한다)
201  // Created - 생성 성공 (회원가입, 주문, 리뷰, 결제, 업로드 등)
204  // No Content - 본문 없는 성공 (일반적인 코드. 이 앱의 삭제는 200으로 응답한다)

// 클라이언트 에러
400  // Bad Request - 잘못된 요청
401  // Unauthorized - 인증 필요 (토큰 없음/만료)
403  // Forbidden - 권한 없음
404  // Not Found - 못 찾음
409  // Conflict - 충돌 (재고 부족 INSUFFICIENT_STOCK, 주문 재취소 ALREADY_CANCELED 등)

// 서버 에러
500  // Internal Server Error - 서버 에러
502  // Bad Gateway - 게이트웨이 에러
503  // Service Unavailable - 서비스 중단
```

**사용 예시:**
```typescript
// 성공 확인
expect(response.status()).toBe(200);

// 에러 확인
if (response.status() === 401) {
  console.log('로그인 필요!');
} else if (response.status() === 500) {
  console.log('서버 에러 발생!');
}
```

---

#### response.ok()
**역할:** 응답이 성공(200-299)인지 확인 (boolean)

```typescript
const isSuccess: boolean = response.ok();
// 200-299 → true
// 그 외 → false

// 사용 예시
if (response.ok()) {
  const data = await response.json();
  console.log('성공:', data);
} else {
  const error = await response.json();
  console.log('실패:', error);
}

// response.status()와 차이
response.status() === 200  // 정확히 200만
response.ok()              // 200, 201, 204 모두 true
```

---

#### response.json()
**역할:** 응답 본문(body)을 JSON으로 파싱

```typescript
const data: any = await response.json();
// { token: "eyJ...", user: {...} }

expect(data.token).toBeTruthy();
expect(data.user.name).toBe('test');
```

**⚠️ 주의사항:**
```typescript
// 1. await 필수! (비동기 함수)
const data = await response.json();  // ✅
const data = response.json();        // ❌ Promise 객체 반환됨

// 2. 에러일 때 조심
if (response.status() === 500) {
  // HTML 에러 페이지 올 수 있음
  const text = await response.text();  // JSON 아닐 수 있음
  console.log(text);
}

// 3. 한 번만 호출 가능
const data1 = await response.json();  // ✅
const data2 = await response.json();  // ❌ 에러 발생!
```

---

#### response.request()
**역할:** 이 응답을 발생시킨 요청(Request) 객체 반환

```typescript
const request = response.request();

// 1. HTTP 메서드 확인
const method: string = request.method();  
// "GET", "POST", "PUT", "DELETE"

// 2. 요청 헤더 확인
const headers = request.headers();
console.log(headers['authorization']);  // "Bearer eyJ..."
console.log(headers['content-type']);   // "application/json"

// 3. 요청 본문 확인 (POST/PUT)
const postData: string | null = request.postData();
const body = JSON.parse(postData || '{}');
console.log(body);  // { username: "test", password: "..." }

// 4. 요청 URL 확인
const url: string = request.url();
console.log(url);  // "https://api.example.com/login"
```

---

### 3.5 변수명: response vs loginResponse?

**Q: `response`만 써도 되나요?**

**A: 상황에 따라 다릅니다!**

#### 1. API가 1개만 있을 때
```typescript
test('로그인', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);
  
  // ✅ response만으로 충분 (명확함)
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.token).toBeTruthy();
});
```

#### 2. API가 여러 개 있을 때
```typescript
test('상품 추가 후 목록 조회', async ({ page }) => {
  // ✅ 명확함
  const [addResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/admin') && 
      res.request().method() === 'POST'
    ),
    page.click('button:has-text("추가")')
  ]);
  expect(addResponse.status()).toBe(201);
  
  const [listResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.reload()
  ]);
  expect(listResponse.status()).toBe(200);
});
```

**결론:**
- 🟢 하나만 있으면 `response` OK
- 🟡 여러 개면 `loginResponse`, `orderResponse` 처럼 구체적으로!
- 🔴 절대 같은 이름 재사용 금지!

---

## 4. 손에 익히는 4단계 학습법

### 🎯 1단계: API 보는 눈 기르기 (1주)

**목표:** 브라우저에서 API 호출 관찰하기

**실습:**
1. Chrome DevTools 열기 (F12)
2. Network 탭 선택
3. 사이트 사용하면서 API 관찰

```
예시: 로그인 버튼 클릭
→ Network 탭에 "login" 요청 보임
→ Status: 200
→ Response: { "token": "eyJ..." }
```

**1단계 졸업 기준:**
- [ ] 버튼 클릭 시 어떤 API 호출될지 예측 가능
- [ ] Network 탭 보고 Request/Response 이해
- [ ] 200, 400, 500 상태 코드 구분 가능

---

### 🎯 2단계: 첫 API 검증 코드 작성 (1주)

**필수 암기 패턴:**
```typescript
// 패턴 1: 단순 응답 대기
const response = await page.waitForResponse((res) => 
  res.url().includes('/api/엔드포인트')
);

// 패턴 2: 클릭과 동시에 응답 대기 (가장 많이 사용!)
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/엔드포인트')),
  page.click('button')
]);

// 패턴 3: 상태 코드 검증
expect(response.status()).toBe(200);

// 패턴 4: 응답 데이터 검증
const data = await response.json();
expect(data.필드명).toBe(기대값);
```

---

### 🎯 3단계: 다양한 시나리오 연습 (2주)

#### 패턴 1: 에러 응답 검증
```typescript
test('잘못된 비밀번호 로그인', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);
  
  // 에러 상태 코드
  expect(response.status()).toBe(401);
  
  // 에러 메시지 확인 (본 사이트 응답: { "message": "아이디 또는 비밀번호 오류" })
  const data = await response.json();
  expect(data.message).toContain('아이디 또는 비밀번호');
});
```

#### 패턴 2: 여러 API 순차 검증

> 💡 아래 UI 셀렉터는 개념 설명용 일반 예시입니다. 실제 관리자 페이지는 `data-testid`로 `admin-edit-btn-{id}`, `admin-save-btn-{id}`, `admin-delete-btn-{id}`를 사용하고, API 계약은 `/api/admin` POST 201 · PUT 200 · DELETE 200입니다.

```typescript
test('상품 추가 → 수정 → 삭제', async ({ page }) => {
  // 1. 추가
  const [addResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/admin') && 
      res.request().method() === 'POST'
    ),
    page.click('button:has-text("상품 추가")')
  ]);
  
  expect(addResponse.status()).toBe(201);
  const added = await addResponse.json();
  const productId = added.product.id;
  
  // 2. 수정
  await page.fill('#product-name', '수정된 이름');
  
  const [updateResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/admin') && 
      res.request().method() === 'PUT'
    ),
    page.click('button:has-text("저장")')
  ]);
  
  expect(updateResponse.status()).toBe(200);
  
  // 3. 삭제
  const [deleteResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/admin') && 
      res.request().method() === 'DELETE'
    ),
    page.click('button:has-text("삭제")')
  ]);
  
  expect(deleteResponse.status()).toBe(200);
});
```

---

### 🎯 4단계: 통합 시나리오 (1주)

```typescript
test('전체 주문 흐름 (UI + API 통합)', async ({ page }) => {
  page.on('dialog', (d) => d.accept());  // 주문/취소 alert 자동 수락 (없으면 흐름이 끊김)

  // 1. 로그인 — 이 앱은 계정 드롭다운을 열고 모달에서 로그인한다 (실제 셀렉터, §3)
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();  // 계정 드롭다운 열기
  await page.getByTestId('usermenu-login').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');

  const [loginResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click(),
  ]);

  expect(loginResponse.status()).toBe(200);
  const { token } = await loginResponse.json();
  expect(token).toBeTruthy();
  // 💡 로그인 성공은 "로그인 모달이 닫혔는지"로 검증한다 (§ 인증&세션, README_QA 참고).
  await expect(page.getByTestId('login-modal')).toBeHidden();

  // 2. 상품 조회 (홈 진입 시 호출됨)
  const [productsResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.goto('/'),
  ]);

  expect(productsResponse.status()).toBe(200);
  const { products } = await productsResponse.json();
  expect(products.length).toBeGreaterThan(0);

  // 3. 주문할 상품의 현재 재고를 API로 동적으로 확인한다
  const target = products[0];
  const availableStock = target.stock;  // 씨드 재고는 상품마다 5~30 범위

  // 4. 주문 — 장바구니 → 체크아웃. 아래 버튼 셀렉터는 실제 testid 확인 후 사용할 것.
  //    (배송지/약관 입력 필드 셀렉터는 UI_AUTOMATION_GUIDE / README_QA의 셀렉터 사전 참고)
  const orderQty = 1;  // availableStock 이내 → 성공(201) 기대
  const [orderResponse] = await Promise.all([
    page.waitForResponse((res) =>
      res.url().includes('/api/user-actions') &&
      res.request().method() === 'POST'
    ),
    page.getByTestId('site-nav-cart').click(),  // 예: 장바구니로 이동 후 체크아웃 진행
  ]);

  // 재고에 따른 분기 (주문 성공은 201 Created)
  if (orderQty <= availableStock) {
    expect(orderResponse.status()).toBe(201);
    const data = await orderResponse.json();
    expect(data.message).toBe('주문 완료');
    expect(data.order.status).toBe('PAID');
  } else {
    expect(orderResponse.status()).toBe(409);
    const error = await orderResponse.json();
    expect(error.code).toBe('INSUFFICIENT_STOCK');
  }
});
```

---

## 5. 콘솔 디버깅 완전 정복

### 5.1 기본 로깅

#### 응답 전체 구조 보기
```typescript
test('API 응답 구조 파악', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);
  
  // 1. 상태 코드
  console.log('Status:', response.status());
  
  // 2. URL
  console.log('URL:', response.url());
  
  // 3. 응답 데이터
  const data = await response.json();
  console.log('Response Data:', JSON.stringify(data, null, 2));
  
  // 4. 응답 헤더
  const headers = response.headers();
  console.log('Headers:', headers);
});
```

**출력 예시:**
```
Status: 200
URL: http://localhost:5173/api/login
Response Data: {
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "test",
    "role": "USER"
  }
}
Headers: {
  'content-type': 'application/json'
}
```

> 💡 **인증은 JWT 토큰 방식입니다.** 이 서버는 JWT를 응답 바디 `{ token, user }`로 돌려줍니다. 인증이 필요한 요청은 이 `token`을 `Authorization: Bearer <token>` 헤더로 직접 실어 보냅니다(§ 6장). URL origin은 항상 `http://localhost:5173`이고, `/api`는 vite dev 서버가 백엔드로 프록시하므로 테스트에서는 상대경로 `/api/...`만 씁니다.

---

### 5.2 Request 정보 로깅

```typescript
test('Request 정보 확인', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/reviews')),
    page.click('button:has-text("등록")')
  ]);
  
  const request = response.request();
  
  // 1. HTTP 메서드
  console.log('Method:', request.method());
  
  // 2. Request URL
  console.log('Request URL:', request.url());
  
  // 3. Request 헤더
  console.log('Request Headers:', request.headers());
  
  // 4. Request Body
  const postData = request.postData();
  if (postData) {
    console.log('Request Body:', JSON.stringify(JSON.parse(postData), null, 2));
  }
});
```

**출력 예시:**
```
Method: POST
Request URL: https://example.com/api/reviews
Request Headers: {
  'authorization': 'Bearer eyJhbGci...',
  'content-type': 'application/json'
}
Request Body: {
  "productId": 1,
  "rating": 5,
  "comment": "정말 좋은 상품입니다!"
}
```

---

### 5.3 여러 API 비교 로깅

```typescript
test('API 응답 비교', async ({ page }) => {
  await page.goto('/');
  
  // 여러 API 동시 호출 (개념 설명용 일반 예시 — 엔드포인트명은 자유)
  const [productsRes, categoriesRes, userRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.waitForResponse((res) => res.url().includes('/api/categories')),
    page.waitForResponse((res) => res.url().includes('/api/user'))
  ]);
  
  // 테이블 형식으로 비교
  console.table([
    {
      API: 'Products',
      Status: productsRes.status(),
      URL: productsRes.url()
    },
    {
      API: 'Categories',
      Status: categoriesRes.status(),
      URL: categoriesRes.url()
    },
    {
      API: 'User',
      Status: userRes.status(),
      URL: userRes.url()
    }
  ]);
});
```

**출력 예시:**
```
┌─────────┬──────────────┬────────┬───────────────────────────────┐
│ (index) │     API      │ Status │              URL              │
├─────────┼──────────────┼────────┼───────────────────────────────┤
│    0    │  'Products'  │  200   │ 'https://example.com/api/...' │
│    1    │ 'Categories' │  200   │ 'https://example.com/api/...' │
│    2    │    'User'    │  200   │ 'https://example.com/api/...' │
└─────────┴──────────────┴────────┴───────────────────────────────┘
```

---

### 5.4 에러 디버깅

```typescript
test('에러 상황 디버깅', async ({ page }) => {
  // 주문은 POST /api/user-actions (body: { action: 'order', ... })
  const [response] = await Promise.all([
    page.waitForResponse((res) =>
      res.url().includes('/api/user-actions') &&
      res.request().method() === 'POST'
    ),
    // 결제하기 버튼 (실제 셀렉터는 셀렉터 사전 확인 후 getByTestId 권장)
    page.getByRole('button', { name: /결제하기|주문하기/ }).click()
  ]);
  
  console.log('=== API 응답 디버깅 ===');
  console.log('Status:', response.status());
  console.log('OK:', response.ok());
  
  if (!response.ok()) {
    console.log('⚠️ 에러 발생!');
    
    // 에러 응답 상세 로깅
    const error = await response.json();
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    console.log('Full Error:', JSON.stringify(error, null, 2));
    
    // Request도 확인
    const request = response.request();
    console.log('Request Method:', request.method());
    console.log('Request URL:', request.url());
    
    const postData = request.postData();
    if (postData) {
      console.log('Request Body:', postData);
    }
  }
});
```

**출력 예시 (에러 발생 시):**
```
=== API 응답 디버깅 ===
Status: 409
OK: false
⚠️ 에러 발생!
Error Code: INSUFFICIENT_STOCK
Error Message: 재고 부족: 발마사지기 무선 온열 기능
요청 수량: 99개
사용 가능 재고: 12개
Full Error: {
  "code": "INSUFFICIENT_STOCK",
  "message": "재고 부족: 발마사지기 무선 온열 기능\n요청 수량: 99개\n사용 가능 재고: 12개",
  "productId": 1,
  "productName": "발마사지기 무선 온열 기능",
  "requestedQuantity": 99,
  "availableStock": 12
}
Request Method: POST
Request URL: http://localhost:5173/api/user-actions
Request Body: {"action":"order","items":[{"id":1,"quantity":99}]}
```

> 💡 items에는 `{ id, quantity }`만 보내면 됩니다. 가격/상품명은 서버가 DB에서 조회해 결정하며, 클라이언트가 보낸 가격은 무시됩니다.

---

### 5.5 성능 디버깅

```typescript
test('API 성능 측정', async ({ page }) => {
  await page.goto('/');
  
  const performanceData: Array<{
    api: string;
    time: number;
    status: number;
  }> = [];
  
  // 로그인
  let start = Date.now();
  const [loginRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);
  performanceData.push({
    api: 'Login',
    time: Date.now() - start,
    status: loginRes.status()
  });
  
  // 상품 조회
  start = Date.now();
  const [productsRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.goto('/')
  ]);
  performanceData.push({
    api: 'Products',
    time: Date.now() - start,
    status: productsRes.status()
  });
  
  // 테이블로 출력
  console.log('\n=== API 성능 측정 ===');
  console.table(performanceData);
  
  // 평균 계산
  const avgTime = performanceData.reduce((sum, d) => sum + d.time, 0) / performanceData.length;
  console.log(`\n평균 응답 시간: ${avgTime.toFixed(2)}ms`);
});
```

**출력 예시:**
```
=== API 성능 측정 ===
┌─────────┬──────────┬──────┬────────┐
│ (index) │   api    │ time │ status │
├─────────┼──────────┼──────┼────────┤
│    0    │ 'Login'  │ 234  │  200   │
│    1    │'Products'│ 456  │  200   │
└─────────┴──────────┴──────┴────────┘

평균 응답 시간: 345.00ms
```

---

### 5.6 조건부 로깅 (개발 환경에서만)

```typescript
// 환경 변수 설정
const DEBUG = process.env.DEBUG === 'true';

test('조건부 로깅', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);
  
  // DEBUG 모드일 때만 로깅
  if (DEBUG) {
    console.log('Status:', response.status());
    const data = await response.json();
    console.log('Data:', JSON.stringify(data, null, 2));
  }
  
  // 테스트는 항상 실행
  expect(response.status()).toBe(200);
});

// 실행 방법:
// DEBUG=true npx playwright test  → 로그 출력됨
// npx playwright test              → 로그 출력 안 됨
```

---

### 5.7 헬퍼 함수로 재사용하기

```typescript
// helpers/debug.ts
export async function logApiResponse(response: Response, label: string = 'API Response') {
  console.log(`\n=== ${label} ===`);
  console.log('URL:', response.url());
  console.log('Status:', response.status());
  console.log('OK:', response.ok());
  
  try {
    const data = await response.json();
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Response is not JSON');
  }
  
  const request = response.request();
  console.log('Method:', request.method());
  
  const postData = request.postData();
  if (postData) {
    console.log('Request Body:', postData);
  }
  console.log('========================\n');
}

// 사용 예시
import { logApiResponse } from './helpers/debug';

test('헬퍼로 간단하게 로깅', async ({ page }) => {
  const [loginRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);
  
  await logApiResponse(loginRes, '로그인 API');
  
  const [productsRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.goto('/')
  ]);
  
  await logApiResponse(productsRes, '상품 조회 API');
});
```

---

### 5.8 실전 디버깅 체크리스트

```typescript
test('완벽한 API 디버깅', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);
  
  // ✅ 체크리스트
  console.log('=== API 디버깅 체크리스트 ===');
  
  // 1. 기본 정보
  console.log('1. URL:', response.url());
  console.log('2. Status:', response.status());
  console.log('3. OK:', response.ok());
  
  // 4. Response 데이터
  const data = await response.json();
  console.log('4. Response:', JSON.stringify(data, null, 2));
  
  // 5. Request 정보
  const request = response.request();
  console.log('5. Method:', request.method());
  console.log('6. Headers:', request.headers());
  
  const postData = request.postData();
  if (postData) {
    console.log('7. Request Body:', postData);
  }
  
  // 8. 타이밍 정보
  const timing = await page.evaluate(() => {
    const perf = window.performance.getEntriesByType('navigation')[0] as any;
    return {
      dns: perf.domainLookupEnd - perf.domainLookupStart,
      tcp: perf.connectEnd - perf.connectStart,
      request: perf.responseStart - perf.requestStart,
      response: perf.responseEnd - perf.responseStart
    };
  });
  console.log('8. Timing:', timing);
  
  console.log('============================\n');
});
```

---

## 6. 실전 연습 프로젝트

### 💡 인증 토큰(`token`)은 어디서 나오나?

아래 프로젝트 3·4의 예제는 `Authorization: Bearer <token>` 헤더를 씁니다. 이 `token`은 **로그인 API를 먼저 호출해서** 받습니다. 이 서버는 JWT를 응답 바디 `{ token, user }`로 주므로, 받은 문자열을 그대로 헤더에 실어 보내면 됩니다.

```typescript
// 토큰 획득 (모든 인증 필요 테스트의 공통 준비 단계)
const login = await request.post('/api/login', {
  data: { username: 'test', password: '1234' },   // 관리자 API 연습은 'admin' 계정 사용
});
expect(login.status()).toBe(200);
const { token } = await login.json();  // 이 token을 이후 요청 헤더에 넣는다
```

매 테스트에서 UI 로그인을 반복하지 않으려면 **한 번 로그인한 세션을 재사용**하세요. 이 앱은 인증정보(`token`/`role`/`username`)를 `localStorage`에 저장하므로, Playwright `storageState`(localStorage 포함)로 세션을 저장했다가 프로젝트 의존성으로 재사용하거나, API로 받은 토큰을 `context.addInitScript`로 주입할 수 있습니다. 표준 setup-project 패턴과 스니펫은 [README_QA](README_QA.md)의 인증 & 세션 섹션을 참고하세요.

보일러플레이트를 줄이려면 인증된 `request` 컨텍스트를 fixture로 뽑아두면 편합니다:

```typescript
// fixtures.ts — authedRequest fixture (baseURL 5173 + Bearer 자동)
import { test as base, expect, APIRequestContext } from '@playwright/test';

export const test = base.extend<{ authedRequest: APIRequestContext }>({
  authedRequest: async ({ playwright }, use) => {
    const anon = await playwright.request.newContext({ baseURL: 'http://localhost:5173' });
    const { token } = await (await anon.post('/api/login',
      { data: { username: 'test', password: '1234' } })).json();
    const ctx = await playwright.request.newContext({
      baseURL: 'http://localhost:5173',
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    await use(ctx);
    await ctx.dispose();
  },
});
export { expect };
```

### 💡 반복 실행 전 데이터 초기화 (POST /api/reset)

연습 테스트를 반복 실행하면 관리자 CRUD, 회원가입 계정, 장바구니, 주문, 리뷰, 위시리스트, 재고 변경이 DB에 그대로 남아 결과가 달라질 수 있습니다.
모든 상태는 Postgres(DB)에 저장되므로 **서버 재시작으로는 초기화되지 않습니다**. 초기화는 `POST /api/reset`으로 수행합니다 (전체 데이터를 시드 상태로 복원).

```typescript
test.beforeEach(async ({ request }) => {
  const res = await request.post('/api/reset');
  expect(res.status()).toBe(200);
  // 응답: { "message": "모든 데이터가 초기화되었습니다",
  //         "reset": ["products", "users", "reviews", "wishlists", "carts",
  //                   "orders", "coupons", "payments", "user_coupons"] }  // 9개
});
```

> 💡 `reset` 배열은 원소 9개입니다. 순서/전체 원소를 `toEqual`로 강하게 못박기보다 `status 200`과 `message` 위주로 검증하세요(시드 구조가 바뀌어도 테스트가 덜 깨집니다).

### 프로젝트 1: 로그인 완전 정복 (1일)

```typescript
test('로그인 성공', async ({ page }) => { /* ... */ });
test('비밀번호 틀림', async ({ page }) => { /* ... */ });
test('존재하지 않는 계정', async ({ page }) => { /* ... */ });
```

### 프로젝트 2: 상품 관리 CRUD (2일)

```typescript
test('상품 추가', async ({ page }) => { /* ... */ });
test('상품 수정', async ({ page }) => { /* ... */ });
test('상품 삭제', async ({ page }) => { /* ... */ });
```

### 프로젝트 3: 신규 엔드포인트 정복 — 회원가입/쿠폰/주문내역 (2일)

새로 추가된 API 4종을 API 직접 호출(`page.request`)로 연습합니다.

```typescript
// 1) 회원가입 (POST /api/signup) — 가입한 계정으로 곧바로 로그인까지
test('회원가입 → 로그인', async ({ request }) => {
  const signup = await request.post('/api/signup', {
    data: { username: 'newuser1', password: 'password1' }
  });
  expect(signup.status()).toBe(201);
  // 네거티브: 형식 오류 400 INVALID_USERNAME / INVALID_PASSWORD / INVALID_EMAIL,
  //           중복 아이디 409 USERNAME_TAKEN
  
  const login = await request.post('/api/login', {
    data: { username: 'newuser1', password: 'password1' }
  });
  expect(login.status()).toBe(200); // 가입 계정도 즉시 로그인 가능
});

// 2) 쿠폰 검증 (POST /api/coupons) — 시드 쿠폰 4종
//    WELCOME10(10%, 최대 2만원) / SAVE5000(5천원, 최소주문 3만원)
//    VIP20(20%, 최소주문 10만원, 최대 5만원) / EXPIRED10(만료 — 의도적 픽스처)
test('쿠폰 할인 계산', async ({ request }) => {
  const res = await request.post('/api/coupons', {
    data: { code: 'WELCOME10', orderAmount: 100000 }
  });
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.discount).toBe(10000);
  expect(data.finalAmount).toBe(90000);
  // 네거티브: 없는 쿠폰 404 COUPON_NOT_FOUND, EXPIRED10 400 COUPON_EXPIRED,
  //           최소주문 미달 400 MIN_ORDER_NOT_MET, 금액 오류 400 INVALID_AMOUNT
});

// 3) 주문내역/상세/취소 (GET /api/orders, GET·PATCH /api/orders/:id)
test('주문 → 목록 → 상세 → 취소', async ({ request }) => {
  // 주문 생성 (201) 후 order.id 확보
  const orderRes = await request.post('/api/user-actions', {
    headers: { Authorization: `Bearer ${token}` },
    data: { action: 'order', items: [{ id: 1, quantity: 1 }], couponCode: 'WELCOME10' }
  });
  expect(orderRes.status()).toBe(201);
  const { order } = await orderRes.json();
  
  // 목록 (본인 주문만, 관리자는 전체)
  const list = await request.get('/api/orders', {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(list.status()).toBe(200);
  
  // 상세 (shipping 포함) — 없는 주문/타인 주문은 404 ORDER_NOT_FOUND
  const detail = await request.get(`/api/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(detail.status()).toBe(200);
  
  // 취소 → 재고 원복, 재취소 시 409 ALREADY_CANCELED
  const cancel = await request.patch(`/api/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { action: 'cancel' }
  });
  expect(cancel.status()).toBe(200);
  expect((await cancel.json()).order.status).toBe('CANCELED');
});
```

### 프로젝트 4: 결제·업로드·배송추적 — 외부 API 목킹 연습 (2일)

새로 추가된 결제(모의 PG)·파일업로드·배송상태/추적 API를 연습합니다. 핵심 학습 목표는 **외부 시스템(결제 게이트웨이, 택배사) 장애를 결정론적으로 재현**하고 클라이언트의 실패 처리를 검증하는 것입니다. 결과는 랜덤이 아니라 **테스트 카드 뒤 4자리** 또는 **`?simulate=` 쿼리**로 정해집니다.

```typescript
// 1) 결제 (POST /api/payment) — 카드 뒤 4자리로 결정론적 결과
//    0000 승인(201 DONE) / 0001 거절(402 PAYMENT_DECLINED)
//    0002 한도초과(402 PAYMENT_LIMIT_EXCEEDED) / 9999 타임아웃(504 PAYMENT_GATEWAY_TIMEOUT)
test('결제 승인과 폴트 주입', async ({ request }) => {
  // 승인
  const ok = await request.post('/api/payment', {
    headers: { Authorization: `Bearer ${token}` },
    data: { cardNumber: '4000000000000000', amount: 129000 }
  });
  expect(ok.status()).toBe(201);
  const pay = await ok.json();
  expect(pay.status).toBe('DONE');
  expect(pay.paymentKey).toMatch(/^PAY-/); // 값 자체는 비결정 — 접두사만 확인

  // 폴트 주입: ?simulate=timeout 으로 결제서버 무응답 재현 → 504
  const timeout = await request.post('/api/payment?simulate=timeout', {
    headers: { Authorization: `Bearer ${token}` },
    data: { cardNumber: '4000000000000000', amount: 129000 }
  });
  expect(timeout.status()).toBe(504);
  expect((await timeout.json()).code).toBe('PAYMENT_GATEWAY_TIMEOUT');
  // → 클라이언트가 이 504 를 잡아 재시도/안내 UI 를 띄우는지 검증하는 것이 포인트

  // 사후검증: GET ?paymentKey= (없으면 404 PAYMENT_NOT_FOUND)
  const verify = await request.get(`/api/payment?paymentKey=${pay.paymentKey}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(verify.status()).toBe(200);
});

// 2) 결제 → 주문 연동 (paymentKey) — 금액 불일치/미승인/중복사용은 402
test('결제 후 주문 연동', async ({ request }) => {
  const pay = await (await request.post('/api/payment', {
    headers: { Authorization: `Bearer ${token}` },
    data: { cardNumber: '4000000000000000', amount: 129000 }
  })).json();

  const order = await request.post('/api/user-actions', {
    headers: { Authorization: `Bearer ${token}` },
    data: { action: 'order', items: [{ id: 1, quantity: 1 }], paymentKey: pay.paymentKey }
  });
  expect(order.status()).toBe(201);
  // 네거티브: 금액 불일치/미승인/중복사용 → 402 PAYMENT_INVALID, 결제 없음 → 402 PAYMENT_REQUIRED
});

// 3) 파일 업로드 (POST /api/upload) — 형식/용량 검증
test('업로드 형식·용량 검증', async ({ request }) => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const ok = await request.post('/api/upload', {
    headers: { Authorization: `Bearer ${token}` },
    data: { kind: 'review', image: png }
  });
  expect(ok.status()).toBe(201);
  // 네거티브: 이미지 아님 400 INVALID_FILE_TYPE, 잘못된 kind 400 INVALID_KIND,
  //           2MB 초과 413 FILE_TOO_LARGE
});

// 4) 배송 상태 전진 + 추적 (PATCH advance, GET /api/tracking) — 외부 택배 API 목킹
test('상태 전진과 배송 추적', async ({ request }) => {
  const { order } = await (await request.post('/api/user-actions', {
    headers: { Authorization: `Bearer ${token}` },
    data: { action: 'order', items: [{ id: 1, quantity: 1 }] }
  })).json();

  // PAID → PREPARING → SHIPPING (SHIPPING 진입 시 운송장 MC+10자리 부여)
  await request.patch(`/api/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${token}` }, data: { action: 'advance' }
  });
  const shipped = await request.patch(`/api/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${token}` }, data: { action: 'advance' }
  });
  const tn = (await shipped.json()).order.trackingNumber;
  expect(tn).toMatch(/^MC\d{10}$/);

  // 배송 추적 (송장번호 경로는 공개) — events: [{ status, label, at, location }]
  const track = await request.get(`/api/tracking?trackingNumber=${tn}`);
  expect(track.status()).toBe(200);
  expect(Array.isArray((await track.json()).events)).toBe(true);
  // 네거티브: 없는 송장/주문 404 TRACKING_NOT_FOUND, 종료 상태 advance 409 INVALID_TRANSITION
});
```

---

## 7. 체화 훈련

**Day 1-2: 기본 패턴 20번 반복.** 손가락이 기억할 때까지 [2단계의 필수 암기 패턴](#-2단계-첫-api-검증-코드-작성-1주)과 아래 [최종 정리 3줄](#-최종-정리)을 반복하세요. (같은 스니펫을 여기 또 붙이지 않습니다 — 위 두 곳을 그대로 쓰면 됩니다.)

---

## 8. API 성능 테스트

```typescript
test('API 응답 시간', async ({ page }) => {
  const startTime = Date.now();
  
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.getByTestId('login-submit-button').click()
  ]);
  
  const responseTime = Date.now() - startTime;
  
  console.log(`응답 시간: ${responseTime}ms`);
  expect(responseTime).toBeLessThan(1000);
});
```

---

## 9. 자주 하는 실수

### 실수 1: API 응답 안 기다림
```typescript
// ❌ 잘못된 코드
await page.click('button');
const response = await page.waitForResponse(...);

// ✅ 올바른 코드
const [response] = await Promise.all([
  page.waitForResponse(...),
  page.click('button')
]);
```

### 실수 2: JSON 파싱 안 함
```typescript
// ❌ 잘못된 코드
expect(response.token).toBeTruthy();

// ✅ 올바른 코드
const data = await response.json();
expect(data.token).toBeTruthy();
```

### 실수 3: 고정 시간 대기(`waitForTimeout`)로 버팀
```typescript
// ❌ 잘못된 코드 — 느리면 실패, 빠르면 시간 낭비 (플래키의 주범)
await page.click('button');
await page.waitForTimeout(3000);      // "3초면 되겠지" → 환경 따라 깨짐
expect(await page.locator('.result').count()).toBe(1);

// ✅ 올바른 코드 — 조건 충족까지 자동 재시도하는 web-first assertion
await page.getByTestId('submit').click();
await expect(page.getByTestId('result')).toBeVisible();  // 뜰 때까지 자동 대기
// 요소가 사라지길 기다릴 때: await page.getByTestId('login-modal').waitFor({ state: 'hidden' });
```
`waitForLoadState('networkidle')`도 같은 이유로 지양하세요. "무언가 나타났다/사라졌다/특정 값이 됐다"를 assert하면 Playwright가 알아서 기다립니다.

### 실수 4: 순수 API인데 굳이 UI를 띄움
```typescript
// ❌ 서버 계약만 볼 건데 page(브라우저) 띄우고 클릭까지... 느리고 불안정
test('상품 목록', async ({ page }) => {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/products')),
    page.goto('/'),
  ]);
  expect(res.status()).toBe(200);
});

// ✅ 순수 API는 request로 직접 (화면 없음 → 훨씬 빠름) — 1.3 참고
test('상품 목록', async ({ request }) => {
  const res = await request.get('/api/products');
  expect(res).toBeOK();
});
```

### 실수 5: CSS 문자열/`#id` 셀렉터 남용
```typescript
// ❌ 깨지기 쉬운 셀렉터 (구조/클래스명 바뀌면 바로 실패)
await page.locator('[data-testid="login-submit-button"]').click();
await page.locator('.header > div:nth-child(2) button').click();

// ✅ 이 앱은 data-testid가 389개로 촘촘하다 → getByTestId / getByRole를 1급으로
await page.getByTestId('login-submit-button').click();
```
셀렉터 사전(실재하는 id/testid 목록)은 [README_QA](README_QA.md)를 정본으로 참고하세요.

---

### 참고: 별도 테스트 레포의 `playwright.config.ts`

이 레포는 **테스트 대상(SUT)**이라 Playwright 코드를 두지 않습니다. 자동화는 별도 테스트 레포에서 작성하며, 아래 config가 `baseURL`(5173) · 재시도 · trace/video · 앱 서버 자동 기동을 잡아줍니다.

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:5173',   // 상대경로 /api/... 가 여기로 붙는다
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  retries: process.env.CI ? 2 : 0,
  webServer: [
    { command: 'npm run start-api', port: 3000, reuseExistingServer: !process.env.CI },
    { command: 'npm run dev',       port: 5173, reuseExistingServer: !process.env.CI },
  ],
});
```

---

## 🎯 최종 정리

### 필수 암기 코드 3줄

```typescript
// 1. API 대기
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/엔드포인트')),
  page.click('button')
]);

// 2. 상태 코드 검증
expect(response.status()).toBe(200);

// 3. 데이터 검증
const data = await response.json();
expect(data.필드).toBe(값);
```

**이 3줄만 손에 익으면 90% 끝!** 🎉

> ✅ 마지막 체크: **순수 API 검증이면 `request`로 직접** 때리는 게 더 빠르고 안정적입니다(→ [1.3](#13-api를-확인하는-두-가지-도구-먼저-이걸-구분하자)). 위 `waitForResponse` 패턴은 "버튼 클릭이 유발한 호출"을 검증할 때 쓰세요. 셀렉터·인증·픽스처의 정본은 [README_QA](README_QA.md)입니다.
