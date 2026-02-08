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

## 2. 왜 API 검증이 필요한가?

### 2.1 실무 사례로 이해하기

#### 🐛 사례 1: UI는 성공인데 실제론 실패
```typescript
// 로그인 버튼 클릭
await page.click('#login-submit');

// UI 검증만 함
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
  page.click('#login-submit')
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

// 실제 API 응답:
{
  "success": false,
  "code": "OUT_OF_STOCK",
  "message": "재고가 부족합니다"
}

// 문제:
// - 프론트엔드가 에러 무시하고 완료 페이지로 이동
// - 실제론 주문 안 됨
// - 결제는 되는데 배송은 안 됨 → 환불 처리 필요
```

**API 검증으로 잡는 법:**
```typescript
const [orderResponse] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/order')),
  page.click('text=주문하기')
]);

// 재고 있을 때
if (orderResponse.status() === 200) {
  const data = await orderResponse.json();
  expect(data.orderId).toBeDefined();
  expect(data.success).toBe(true);
}

// 재고 없을 때
if (orderResponse.status() === 409) {  // Conflict
  const error = await orderResponse.json();
  expect(error.code).toBe('OUT_OF_STOCK');
  // UI에 에러 메시지 떠야 함
  await expect(page.locator('text=재고가 부족')).toBeVisible();
}
```

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
expect(requestBody.password.length).toBeGreaterThan(8);
// → "비밀번호도 8자 이상으로 보냈구나"
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
  page.click('#login-submit')
]);
expect(loginResponse.status()).toBe(200);

// 예시 2: 여러 API 동시에 받기
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
// 사례: 페이지 로드 시 3개 API 동시 호출
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
// 사례: 로그인 시 API 응답 + 페이지 이동 동시 발생
const [loginRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/login')),
  page.waitForURL('/dashboard'),  // URL 변경 대기
  page.click('#login-submit')
]);

// API와 UI 모두 검증
expect(loginRes.status()).toBe(200);
await expect(page).toHaveURL('/dashboard');
```

**3️⃣ 여러 요소가 나타나길 기다릴 때**

```typescript
// 사례: 검색 결과가 로딩되면서 여러 요소 나타남
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
// ⚠️ 순서 주의!
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
200  // OK - 조회/수정 성공
201  // Created - 생성 성공
204  // No Content - 삭제 성공

// 클라이언트 에러
400  // Bad Request - 잘못된 요청
401  // Unauthorized - 인증 필요 (토큰 없음)
403  // Forbidden - 권한 없음
404  // Not Found - 못 찾음
409  // Conflict - 충돌 (중복, 재고 부족)

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
    page.click('#login-submit')
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
    page.click('#login-submit')
  ]);
  
  // 에러 상태 코드
  expect(response.status()).toBe(401);
  
  // 에러 메시지 확인
  const data = await response.json();
  expect(data.code).toBe('AUTH_INVALID');
  expect(data.message).toContain('비밀번호');
});
```

#### 패턴 2: 여러 API 순차 검증
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
  // 1. 로그인
  await page.goto('/');
  await page.click('#login-button');
  await page.fill('#username', 'test');
  await page.fill('#password', 'test1234');
  
  const [loginResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  expect(loginResponse.status()).toBe(200);
  const { token } = await loginResponse.json();
  expect(token).toBeTruthy();
  
  // 2. 상품 조회
  const [productsResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.goto('/')
  ]);
  
  expect(productsResponse.status()).toBe(200);
  const { products } = await productsResponse.json();
  expect(products.length).toBeGreaterThan(0);
  
  // 3. 재고 확인
  const inventoryResponse = await page.waitForResponse(
    (res) => res.url().includes('/api/inventory')
  );
  
  const inventory = await inventoryResponse.json();
  
  // 4. 주문
  await page.click('[aria-label*="장바구니"]');
  
  const [orderResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/user-actions') && 
      res.request().method() === 'POST'
    ),
    page.click('text=주문하기')
  ]);
  
  // 재고에 따른 분기 처리
  if (inventory.stock > 0) {
    expect(orderResponse.status()).toBe(200);
    await expect(page.locator('text=주문 완료')).toBeVisible();
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
    page.click('#login-submit')
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
URL: https://example.com/api/login
Response Data: {
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "test",
    "email": "test@example.com"
  }
}
Headers: {
  'content-type': 'application/json',
  'set-cookie': 'session=abc123...'
}
```

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
  
  // 여러 API 동시 호출
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
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/order')),
    page.click('text=주문하기')
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
Error Code: OUT_OF_STOCK
Error Message: 재고가 부족합니다
Full Error: {
  "code": "OUT_OF_STOCK",
  "message": "재고가 부족합니다",
  "productId": 1,
  "requestedQuantity": 5,
  "availableStock": 2
}
Request Method: POST
Request URL: https://example.com/api/order
Request Body: {"productId":1,"quantity":5}
```

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
    page.click('#login-submit')
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
    page.click('#login-submit')
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
    page.click('#login-submit')
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
    page.click('#login-submit')
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

---

## 7. 체화 훈련

**Day 1-2: 기본 패턴 20번 반복**
```typescript
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/엔드포인트')),
  page.click('button')
]);

expect(response.status()).toBe(200);
const data = await response.json();
expect(data.필드).toBe(값);
```

---

## 8. API 성능 테스트

```typescript
test('API 응답 시간', async ({ page }) => {
  const startTime = Date.now();
  
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
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
