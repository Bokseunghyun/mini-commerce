# API 검증 완벽 가이드

## 📚 목차
1. [API 목록 및 개요](#api-목록-및-개요)
2. [RESTful API 검증 포인트](#restful-api-검증-포인트)
3. [HTTP 메서드별 테스트](#http-메서드별-테스트)
4. [상태 코드 검증](#상태-코드-검증)
5. [요청/응답 검증](#요청응답-검증)
6. [인증/권한 검증](#인증권한-검증)
7. [실전 테스트 예제](#실전-테스트-예제)

---

## API 목록 및 개요

### 기존 API (CRUD 중심)

| API | Method | 인증 | 설명 |
|-----|--------|------|------|
| `/api/login` | POST | ❌ | 로그인 (회원가입으로 만든 계정도 로그인 가능) |
| `/api/signup` | POST | ❌ | 회원가입 |
| `/api/signup` | GET | ❌ | 아이디 사용 가능 여부 확인 (`?username=`) |
| `/api/products` | GET | ❌ | 상품 목록 조회 |
| `/api/products/:id` | GET | ❌ | 상품 상세 조회 (3/4번 → 500, 16번 → 404는 의도적 연습 케이스) |
| `/api/user-actions` | POST | ✅ | 사용자 액션 통합 (장바구니 추가·수정·삭제 / 주문 / 위시리스트 추가·삭제) |
| `/api/user-actions` | GET | ✅ | 장바구니/위시리스트 조회 (`?type=cart` \| `?type=wishlist`) |
| `/api/admin` | GET | ✅ (ADMIN) | 상품 관리 - 조회 |
| `/api/admin` | POST | ✅ (ADMIN) | 상품 관리 - 추가 |
| `/api/admin` | PUT | ✅ (ADMIN) | 상품 관리 - 수정 |
| `/api/admin` | DELETE | ✅ (ADMIN) | 상품 관리 - 삭제 |

> 📌 관리자 CRUD는 DB(Postgres)에 바로 반영되므로 상품 목록(`/api/products`)/상세(`/api/products/:id`) 조회에 **즉시 반영됩니다**.

> 📌 **참고**: 과거에 있던 `/api/cart`, `/api/order`, `/api/wishlist` 엔드포인트는 `/api/user-actions` 하나로 통합되어 **더 이상 존재하지 않습니다** (호출 시 404). 매핑 상세는 `API_CONSOLIDATION.md` 참고.

### 새로운 API (검증 연습용)

| API | Method | 인증 | 설명 |
|-----|--------|------|------|
| `/api/search` | GET | ❌ | 상품 검색 (쿼리 파라미터) |
| `/api/reviews` | GET | ❌ | 리뷰 조회 |
| `/api/reviews` | POST | ✅ | 리뷰 작성 |
| `/api/reviews` | PATCH | ✅ | 리뷰 수정 |
| `/api/reviews` | DELETE | ✅ | 리뷰 삭제 |
| `/api/inventory` | GET | ❌ | 재고 조회 (주문/취소 시 실시간 반영) |
| `/api/inventory` | HEAD | ❌ | 재고 존재 확인 (헤더만) |
| `/api/coupons` | POST | ❌ | 쿠폰 유효성 검증 + 할인액 계산 |
| `/api/orders` | GET | ✅ | 내 주문 목록 (관리자는 전체 주문) |
| `/api/orders/:id` | GET | ✅ | 주문 상세 조회 (배송지 포함) |
| `/api/orders/:id` | PATCH | ✅ | 주문 취소 (`{ action: 'cancel' }`, 재고 원복) |
| `/api/status-codes` | GET | ❌ | 상태 코드 연습 |
| `/api/reset` | POST | ❌ | 테스트 상태 초기화 (DB TRUNCATE + 재시드 — 서버 재시작으로는 초기화되지 않음) |

---

## RESTful API 검증 포인트

### 1. URL 구조
```
✅ 올바른 예시:
GET    /api/products          # 목록 조회
GET    /api/products/1        # 단일 조회
POST   /api/products          # 생성
PUT    /api/products/1        # 전체 수정
PATCH  /api/products/1        # 부분 수정
DELETE /api/products/1        # 삭제

❌ 잘못된 예시:
GET /api/getProducts
POST /api/createProduct
GET /api/products/delete/1
```

### 2. HTTP 메서드 사용
- **GET**: 조회 (멱등성, 안전)
- **POST**: 생성 (비멱등성)
- **PUT**: 전체 수정 (멱등성)
- **PATCH**: 부분 수정 (멱등성)
- **DELETE**: 삭제 (멱등성)
- **HEAD**: 메타데이터만 조회 (멱등성, 안전)

### 3. 상태 코드 사용
- **2xx**: 성공
  - 200 OK: 성공
  - 201 Created: 생성 성공
  - 204 No Content: 성공 (응답 본문 없음)
- **3xx**: 리다이렉션
  - 301 Moved Permanently
  - 302 Found
  - 304 Not Modified
- **4xx**: 클라이언트 오류
  - 400 Bad Request
  - 401 Unauthorized
  - 403 Forbidden
  - 404 Not Found
  - 409 Conflict
  - 429 Too Many Requests
- **5xx**: 서버 오류
  - 500 Internal Server Error
  - 503 Service Unavailable

---

## HTTP 메서드별 테스트

### GET - 조회

#### 테스트 케이스
```javascript
// 1. 기본 조회
test('GET /api/products - 상품 목록 조회', async () => {
  const response = await fetch('http://localhost:3000/api/products');
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(Array.isArray(data.products)).toBe(true);
  expect(data.products.length).toBeGreaterThan(0);
});

// 2. 단일 조회
test('GET /api/products/1 - 특정 상품 조회', async () => {
  const response = await fetch('http://localhost:3000/api/products/1');
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.id).toBe(1);
  expect(data.name).toBeDefined();
});

// 3. 존재하지 않는 리소스
test('GET /api/products/9999 - 404 반환', async () => {
  const response = await fetch('http://localhost:3000/api/products/9999');
  
  expect(response.status).toBe(404);
  const data = await response.json();
  expect(data.code).toBe('PRODUCT_NOT_FOUND');
});

// 3-1. 의도적 오류 케이스 (연습용 픽스처 — 수정해야 할 버그가 아님)
test('GET /api/products/3 - 의도적 500 반환', async () => {
  // 상품 3, 4번은 항상 500을 반환하도록 설계된 의도적 케이스
  const response = await fetch('http://localhost:3000/api/products/3');
  
  expect(response.status).toBe(500);
  const data = await response.json();
  expect(data.code).toBe('INTERNAL_SERVER_ERROR');
});

test('GET /api/products/16 - 의도적 404 반환', async () => {
  // 상품 16번은 항상 404를 반환하도록 설계된 의도적 케이스
  const response = await fetch('http://localhost:3000/api/products/16');
  
  expect(response.status).toBe(404);
  const data = await response.json();
  expect(data.code).toBe('PRODUCT_NOT_FOUND');
});

// 4. 쿼리 파라미터
test('GET /api/search?q=블루투스 - 검색', async () => {
  const response = await fetch('http://localhost:3000/api/search?q=블루투스');
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.query).toBe('블루투스');
  expect(data.count).toBeGreaterThan(0);
});

// 5. 복합 쿼리
test('GET /api/search - 복합 필터', async () => {
  const params = new URLSearchParams({
    category: '전자기기',
    minPrice: '50000',
    maxPrice: '200000',
    sort: 'price-asc'
  });
  
  const response = await fetch(`http://localhost:3000/api/search?${params}`);
  
  expect(response.status).toBe(200);
  const data = await response.json();
  
  // 모든 상품이 전자기기인지 확인
  data.products.forEach(p => {
    expect(p.category).toBe('전자기기');
    expect(p.price).toBeGreaterThanOrEqual(50000);
    expect(p.price).toBeLessThanOrEqual(200000);
  });
  
  // 가격 오름차순 정렬 확인
  for (let i = 0; i < data.products.length - 1; i++) {
    expect(data.products[i].price).toBeLessThanOrEqual(data.products[i + 1].price);
  }
});
```

### POST - 생성

#### 테스트 케이스
```javascript
// 1. 정상 생성
test('POST /api/reviews - 리뷰 작성', async () => {
  const token = 'your-jwt-token'; // 로그인으로 발급받은 실제 토큰 사용
  
  // 주의: test 계정은 초기 데이터에 상품 1, 2 리뷰가 이미 존재
  // → productId 1로 작성하면 409가 발생하므로 5번 상품 사용 (또는 POST /api/reset 후 실행)
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      productId: 5,
      rating: 5,
      comment: '정말 좋은 상품입니다! 강력 추천합니다.'
    })
  });
  
  expect(response.status).toBe(201);
  const data = await response.json();
  expect(data.review.id).toBeDefined();
  expect(data.review.rating).toBe(5);
});

// 2. 필수 필드 누락
test('POST /api/reviews - 필수 필드 누락 시 400', async () => {
  const token = 'your-jwt-token';
  
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      productId: 1,
      // rating 누락
      comment: '좋아요'
    })
  });
  
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.code).toBe('RATING_REQUIRED');
});

// 3. 유효성 검사 실패
test('POST /api/reviews - 별점 범위 초과 시 400', async () => {
  const token = 'your-jwt-token';
  
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      productId: 1,
      rating: 10, // 1-5 범위 초과
      comment: '별점이 너무 높아요'
    })
  });
  
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.code).toBe('INVALID_RATING');
});

// 4. 중복 생성 (409 Conflict)
test('POST /api/reviews - 중복 리뷰 시 409', async () => {
  const token = 'your-jwt-token'; // test 계정 토큰
  
  // test 계정은 초기 데이터에 상품 1 리뷰가 이미 존재 → 첫 요청부터 409 발생
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      productId: 1,
      rating: 5,
      comment: '이미 작성한 리뷰입니다.'
    })
  });
  
  expect(response.status).toBe(409);
  const data = await response.json();
  expect(data.code).toBe('REVIEW_ALREADY_EXISTS');
});

// 5. 인증 없이 요청 (401)
test('POST /api/reviews - 토큰 없이 요청 시 401', async () => {
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      productId: 1,
      rating: 5,
      comment: '인증 없이 작성'
    })
  });
  
  expect(response.status).toBe(401);
  const data = await response.json();
  expect(data.code).toBe('AUTH_NO_TOKEN');
});
```

### PATCH - 부분 수정

#### 테스트 케이스
```javascript
// 1. 정상 수정
test('PATCH /api/reviews - 리뷰 수정', async () => {
  const token = 'your-jwt-token';
  
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      id: 1,
      rating: 4, // 별점만 수정
    })
  });
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.review.rating).toBe(4);
});

// 2. 권한 없음 (403)
test('PATCH /api/reviews - 타인 리뷰 수정 시 403', async () => {
  // test 계정 토큰 사용 — 리뷰 2번은 다른 사용자(user123) 소유
  // (admin 계정은 모든 리뷰를 수정할 수 있으므로 403이 발생하지 않음)
  const token = 'test-user-token';
  
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      id: 2, // 다른 사용자(user123)의 리뷰
      comment: '타인 리뷰 수정 시도입니다'
    })
  });
  
  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.code).toBe('FORBIDDEN');
});
```

### DELETE - 삭제

#### 테스트 케이스
```javascript
// 1. 정상 삭제
test('DELETE /api/reviews - 리뷰 삭제', async () => {
  const token = 'your-jwt-token';
  
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      id: 1
    })
  });
  
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.message).toContain('삭제');
});

// 2. 존재하지 않는 리소스 삭제 (404)
test('DELETE /api/reviews - 없는 리뷰 삭제 시 404', async () => {
  const token = 'your-jwt-token';
  
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      id: 9999
    })
  });
  
  expect(response.status).toBe(404);
  const data = await response.json();
  expect(data.code).toBe('REVIEW_NOT_FOUND');
});
```

### HEAD - 메타데이터 조회

#### 테스트 케이스
```javascript
// 1. HEAD 메서드로 재고 확인
test('HEAD /api/inventory - 재고 존재 확인', async () => {
  const response = await fetch('http://localhost:3000/api/inventory?productId=1', {
    method: 'HEAD'
  });
  
  expect(response.status).toBe(200);
  
  // 헤더 검증
  expect(response.headers.get('X-Product-Id')).toBe('1');
  expect(response.headers.get('X-Stock-Count')).toBeDefined();
  expect(response.headers.get('X-Stock-Status')).toBeDefined();
  expect(response.headers.get('ETag')).toBeDefined();
  
  // 본문이 없는지 확인
  const text = await response.text();
  expect(text).toBe('');
});

// 2. GET과 HEAD 비교
test('GET vs HEAD - 헤더는 동일, 본문만 차이', async () => {
  // GET 요청
  const getResponse = await fetch('http://localhost:3000/api/inventory?productId=1');
  const getHeaders = getResponse.headers;
  const getBody = await getResponse.json();
  
  // HEAD 요청
  const headResponse = await fetch('http://localhost:3000/api/inventory?productId=1', {
    method: 'HEAD'
  });
  const headHeaders = headResponse.headers;
  const headBody = await headResponse.text();
  
  // 주요 헤더가 동일한지 확인
  expect(getHeaders.get('X-Stock-Count')).toBe(headHeaders.get('X-Stock-Count'));
  expect(getHeaders.get('ETag')).toBe(headHeaders.get('ETag'));
  
  // GET은 본문 있음, HEAD는 본문 없음
  expect(getBody).toBeDefined();
  expect(headBody).toBe('');
});
```

---

## 상태 코드 검증

### 상태 코드 연습 API 사용법

```javascript
// 원하는 상태 코드 받기
test('특정 상태 코드 받기', async () => {
  // 200 OK
  let response = await fetch('http://localhost:3000/api/status-codes?code=200');
  expect(response.status).toBe(200);
  
  // 404 Not Found
  response = await fetch('http://localhost:3000/api/status-codes?code=404');
  expect(response.status).toBe(404);
  
  // 500 Internal Server Error
  response = await fetch('http://localhost:3000/api/status-codes?code=500');
  expect(response.status).toBe(500);
});

// 리다이렉트 테스트
test('리다이렉트 상태 코드', async () => {
  const response = await fetch('http://localhost:3000/api/status-codes?code=301', {
    redirect: 'manual' // 자동 리다이렉트 방지
  });
  
  expect(response.status).toBe(301);
  expect(response.headers.get('Location')).toBe('https://example.com/new-location');
});

// Rate Limiting 테스트
test('429 Too Many Requests', async () => {
  const response = await fetch('http://localhost:3000/api/status-codes?code=429');
  
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBeDefined();
  expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
});

// 타임아웃 테스트
test('요청 지연 시뮬레이션', async () => {
  const startTime = Date.now();
  
  await fetch('http://localhost:3000/api/status-codes?code=200&delay=2000');
  
  const elapsed = Date.now() - startTime;
  expect(elapsed).toBeGreaterThanOrEqual(2000);
});
```

---

## 요청/응답 검증

### 요청 헤더 검증
```javascript
test('Content-Type 헤더 검증', async () => {
  const response = await fetch('http://localhost:3000/api/products');
  
  expect(response.headers.get('Content-Type')).toContain('application/json');
});

test('CORS 헤더 검증', async () => {
  const response = await fetch('http://localhost:3000/api/products', {
    headers: {
      'Origin': 'http://localhost:5173'
    }
  });
  
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
});

test('Cache-Control 헤더', async () => {
  const response = await fetch('http://localhost:3000/api/inventory?productId=1');
  
  expect(response.headers.get('Cache-Control')).toBeDefined();
});
```

### 응답 본문 검증
```javascript
test('응답 스키마 검증', async () => {
  const response = await fetch('http://localhost:3000/api/products');
  const data = await response.json();
  
  // 필드 존재 확인
  expect(data.products).toBeDefined();
  expect(Array.isArray(data.products)).toBe(true);
  
  // 첫 번째 상품 스키마 검증
  const product = data.products[0];
  expect(product).toHaveProperty('id');
  expect(product).toHaveProperty('name');
  expect(product).toHaveProperty('price');
  expect(product).toHaveProperty('category');
  
  // 타입 검증
  expect(typeof product.id).toBe('number');
  expect(typeof product.name).toBe('string');
  expect(typeof product.price).toBe('number');
});
```

---

## 인증/권한 검증

### JWT 토큰 검증
```javascript
// 1. 토큰 없이 요청
test('토큰 없이 보호된 API 호출 - 401', async () => {
  const response = await fetch('http://localhost:3000/api/user-actions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'wishlist_add', productId: 1 })
  });
  
  expect(response.status).toBe(401);
  const data = await response.json();
  expect(data.code).toBe('AUTH_NO_TOKEN');
});

// 2. 잘못된 토큰
test('잘못된 토큰 - 401', async () => {
  const response = await fetch('http://localhost:3000/api/user-actions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token'
    },
    body: JSON.stringify({ action: 'wishlist_add', productId: 1 })
  });
  
  expect(response.status).toBe(401);
  const data = await response.json();
  expect(data.code).toBe('AUTH_INVALID_TOKEN');
});

// 3. 권한 부족 (일반 사용자가 관리자 API 호출)
test('권한 부족 - 403', async () => {
  // 일반 사용자(test)로 로그인해서 실제 토큰 획득
  const loginRes = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test', password: '1234' })
  });
  const { token: userToken } = await loginRes.json();
  
  const response = await fetch('http://localhost:3000/api/admin', {
    headers: {
      'Authorization': `Bearer ${userToken}`
    }
  });
  
  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.code).toBe('AUTH_FORBIDDEN');
});
```

---

## 실전 테스트 예제

### 1. 상태 코드 연습 (status-codes API)

status-codes API는 다양한 HTTP 상태 코드를 연습할 수 있도록 설계된 특수 엔드포인트입니다.

#### 사용법
```bash
# 200 OK 테스트
GET /api/status-codes?code=200

# 404 Not Found 테스트
GET /api/status-codes?code=404

# 401 Unauthorized 테스트
GET /api/status-codes?code=401

# 429 Too Many Requests 테스트 (Retry-After 헤더 포함)
GET /api/status-codes?code=429

# 500 Internal Server Error 테스트
GET /api/status-codes?code=500
```

#### Playwright 테스트 예시
```javascript
test('다양한 HTTP 상태 코드 테스트', async ({ request }) => {
  // 200 OK
  const ok = await request.get('http://localhost:3000/api/status-codes?code=200');
  expect(ok.status()).toBe(200);
  
  // 404 Not Found
  const notFound = await request.get('http://localhost:3000/api/status-codes?code=404');
  expect(notFound.status()).toBe(404);
  
  // 429 Too Many Requests
  const tooMany = await request.get('http://localhost:3000/api/status-codes?code=429');
  expect(tooMany.status()).toBe(429);
  expect(tooMany.headers()['retry-after']).toBeDefined();
  
  // 500 Server Error
  const serverError = await request.get('http://localhost:3000/api/status-codes?code=500');
  expect(serverError.status()).toBe(500);
});
```

### 2. 재고 확인 (inventory API)

재고 API는 상품의 재고 정보를 조회하고, HEAD 메서드를 통해 헤더만 확인할 수 있습니다.

#### GET 요청 - 재고 정보 조회
```javascript
test('재고 정보 조회', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/inventory?productId=1');
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  // 응답 본문 검증
  expect(data.productId).toBe(1);
  expect(data.stock).toBeGreaterThanOrEqual(0);
  expect(data.warehouse).toBeDefined();
  expect(data.lastUpdated).toBeDefined();
  expect(data.status).toMatch(/IN_STOCK|LOW_STOCK|OUT_OF_STOCK/);
  
  // 커스텀 헤더 검증
  expect(response.headers()['x-product-id']).toBe('1');
  expect(response.headers()['x-stock-count']).toBeDefined();
  expect(response.headers()['x-warehouse']).toBeDefined();
  expect(response.headers()['x-stock-status']).toBeDefined();
  expect(response.headers()['etag']).toBeDefined();
  expect(response.headers()['cache-control']).toBeDefined();
});
```

#### HEAD 요청 - 메타데이터만 조회
```javascript
test('HEAD 메서드로 재고 확인', async ({ request }) => {
  const response = await request.head('http://localhost:3000/api/inventory?productId=1');
  
  expect(response.ok()).toBeTruthy();
  
  // 본문은 없고 헤더만 존재
  const headers = response.headers();
  expect(headers['x-product-id']).toBe('1');
  expect(headers['x-stock-count']).toBeDefined();
  expect(headers['x-stock-status']).toBeDefined();
  
  // 본문 크기가 0인지 확인
  const body = await response.body();
  expect(body.length).toBe(0);
});
```

#### 재고 부족 시나리오
```javascript
test('재고 부족 상품 확인', async ({ request }) => {
  // productId 3, 8, 18은 재고가 0으로 고정된 상품 (의도적 픽스처)
  // 특히 18번은 재고 부족 네거티브 테스트용으로 항상 재고 0
  const response = await request.get('http://localhost:3000/api/inventory?productId=3');
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  expect(data.stock).toBe(0);
  expect(data.available).toBe(false);
  expect(data.status).toBe('OUT_OF_STOCK');
  expect(response.headers()['x-stock-status']).toBe('OUT_OF_STOCK');
});
```

### 3. 리뷰 시스템 (reviews API)

#### 리뷰 조회
```javascript
test('상품 리뷰 조회', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/reviews?productId=1');
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  // 응답 형식: { count, reviews } (productId는 응답에 포함되지 않음)
  expect(data.count).toBe(data.reviews.length);
  expect(Array.isArray(data.reviews)).toBe(true);
  
  if (data.reviews.length > 0) {
    const review = data.reviews[0];
    expect(review.id).toBeDefined();
    expect(review.productId).toBe(1);
    expect(review.rating).toBeGreaterThanOrEqual(1);
    expect(review.rating).toBeLessThanOrEqual(5);
    expect(review.comment).toBeDefined();
    expect(review.username).toBeDefined();
  }
});
```

#### 리뷰 작성 (인증 필요)
```javascript
test('리뷰 작성', async ({ request }) => {
  // 먼저 로그인하여 토큰 획득
  const loginRes = await request.post('http://localhost:3000/api/login', {
    data: { username: 'test', password: '1234' }
  });
  const { token } = await loginRes.json();
  
  // 리뷰 작성 (test 계정은 상품 1, 2에 초기 리뷰가 있으므로 5번 상품 사용)
  const response = await request.post('http://localhost:3000/api/reviews', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      productId: 5,
      rating: 5,
      comment: '정말 좋은 상품입니다!'
    }
  });
  
  expect(response.status()).toBe(201);
  const data = await response.json();
  
  expect(data.review.id).toBeDefined();
  expect(data.review.productId).toBe(5);
  expect(data.review.rating).toBe(5);
  expect(data.review.comment).toBe('정말 좋은 상품입니다!');
});
```

#### 리뷰 수정 (PATCH)
```javascript
test('리뷰 수정', async ({ request }) => {
  const token = 'your-jwt-token';
  
  const response = await request.patch('http://localhost:3000/api/reviews', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      id: 1,
      rating: 4,
      comment: '수정된 리뷰입니다.'
    }
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  expect(data.review.id).toBe(1);
  expect(data.review.rating).toBe(4);
  expect(data.review.comment).toBe('수정된 리뷰입니다.');
});
```

#### 리뷰 삭제
```javascript
test('리뷰 삭제', async ({ request }) => {
  const token = 'your-jwt-token';
  
  const response = await request.delete('http://localhost:3000/api/reviews', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { id: 1 }
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  expect(data.message).toContain('삭제');
});
```

### 4. 검색 API (search)

#### 기본 검색
```javascript
test('상품 검색', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/search?q=블루투스');
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  expect(data.query).toBe('블루투스');
  expect(data.count).toBeGreaterThan(0);
  expect(Array.isArray(data.products)).toBe(true);
  
  // 모든 상품명에 '블루투스'가 포함되어 있는지 확인
  data.products.forEach(p => {
    expect(p.name.toLowerCase()).toContain('블루투스');
  });
});
```

#### 복합 필터 검색
```javascript
test('카테고리 + 가격 필터 검색', async ({ request }) => {
  const params = new URLSearchParams({
    category: '전자기기',
    minPrice: '50000',
    maxPrice: '200000',
    sort: 'price-asc'
  });
  
  const response = await request.get(`http://localhost:3000/api/search?${params}`);
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  // 필터 조건 검증
  expect(data.filters.category).toBe('전자기기');
  expect(data.filters.minPrice).toBe(50000);
  expect(data.filters.maxPrice).toBe(200000);
  
  // 모든 상품이 조건을 만족하는지 확인
  data.products.forEach(p => {
    expect(p.category).toBe('전자기기');
    expect(p.price).toBeGreaterThanOrEqual(50000);
    expect(p.price).toBeLessThanOrEqual(200000);
  });
  
  // 가격 오름차순 정렬 확인
  for (let i = 0; i < data.products.length - 1; i++) {
    expect(data.products[i].price).toBeLessThanOrEqual(data.products[i + 1].price);
  }
});
```

#### 빈 검색어 오류 테스트
```javascript
test('빈 검색어 입력 시 400 오류', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/search?q=');
  
  expect(response.status()).toBe(400);
  const data = await response.json();
  
  expect(data.code).toBe('EMPTY_QUERY');
  expect(data.message).toContain('검색어');
});
```

### 5. 인증 테스트

#### 로그인
```javascript
test('로그인 성공', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/login', {
    data: {
      username: 'test',
      password: '1234'
    }
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  expect(data.token).toBeDefined();
  expect(data.user).toBeDefined();
  expect(data.user.username).toBe('test');
  expect(data.user.role).toBeDefined();
});
```

#### 로그인 실패
```javascript
test('잘못된 비밀번호로 로그인 시도', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/login', {
    data: {
      username: 'test',
      password: 'wrongpassword'
    }
  });
  
  expect(response.status()).toBe(401);
  const data = await response.json();
  
  // /api/login의 오류 응답은 message만 반환 (code 필드 없음)
  expect(data.message).toContain('비밀번호');
});

// 차단된 계정 (의도적 케이스)
test('차단 계정(test2)으로 로그인 시도 시 403', async ({ request }) => {
  // test2 계정은 BLOCKED 상태로 설계된 의도적 연습 케이스
  const response = await request.post('http://localhost:3000/api/login', {
    data: {
      username: 'test2',
      password: '1234'
    }
  });
  
  expect(response.status()).toBe(403);
  const data = await response.json();
  
  expect(data.message).toContain('차단');
});
```

#### 토큰 없이 보호된 API 호출
```javascript
test('토큰 없이 리뷰 작성 시도', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/reviews', {
    data: {
      productId: 1,
      rating: 5,
      comment: '인증 없이 작성'
    }
  });
  
  expect(response.status()).toBe(401);
  const data = await response.json();
  
  expect(data.code).toBe('AUTH_NO_TOKEN');
});
```

### 6. 관리자 권한 테스트

#### 일반 사용자가 관리자 API 호출
```javascript
test('일반 사용자가 관리자 페이지 접근 시 403', async ({ request }) => {
  // 일반 사용자로 로그인
  const loginRes = await request.post('http://localhost:3000/api/login', {
    data: { username: 'test', password: '1234' }
  });
  const { token } = await loginRes.json();
  
  // 관리자 API 호출
  const response = await request.get('http://localhost:3000/api/admin', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  expect(response.status()).toBe(403);
  const data = await response.json();
  
  expect(data.code).toBe('AUTH_FORBIDDEN');
});
```

#### 관리자로 API 호출
```javascript
test('관리자 권한으로 API 접근', async ({ request }) => {
  // 관리자로 로그인
  const loginRes = await request.post('http://localhost:3000/api/login', {
    data: { username: 'admin', password: '1234' }
  });
  const { token } = await loginRes.json();
  
  // 관리자 API 호출
  const response = await request.get('http://localhost:3000/api/admin', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  
  // 응답 형식: { user, products }
  expect(data.user.role).toBe('ADMIN');
  expect(Array.isArray(data.products)).toBe(true);
});
```

### 7. 사용자 액션 통합 (user-actions API)

과거의 `/api/cart`, `/api/order`, `/api/wishlist`는 `POST /api/user-actions` 하나로 통합되었습니다 (구 엔드포인트 호출 시 404). 요청 본문의 `action` 필드로 기능을 구분합니다. **모든 요청에 인증(Bearer 토큰)이 필요합니다.**

> ⚠️ **계약 변경**: 장바구니는 이제 **서버(DB)가 관리**합니다. 과거의 클라이언트 배열 기반 계약(`cart` 배열 + `index`로 삭제)은 폐기되었고, `productId` 기준의 `cart_add` / `cart_update` / `cart_remove` 액션을 사용합니다.

| action | 요청 본문 | 기능 | 성공 응답 |
|--------|-----------|------|-----------|
| `cart_add` | `{ productId, quantity? }` | 장바구니 담기 (기존 수량에 **누적**, quantity 생략 시 1) | 200 `{ message, cart }` |
| `cart_update` | `{ productId, quantity }` | 수량 **절대값** 설정 (0이면 항목 삭제) | 200 `{ cart }` |
| `cart_remove` | `{ productId }` | 장바구니 항목 삭제 | 200 `{ message, cart }` |
| `order` | `{ items?, couponCode?, shipping? }` | 주문 생성 (items 생략 시 서버 장바구니 전체 주문) | **201** `{ message, order, items }` |
| `wishlist_add` | `{ productId }` | 위시리스트 추가 | 201 `{ message, count }` |
| `wishlist_remove` | `{ productId }` | 위시리스트 삭제 | 200 `{ message, count }` |

조회는 GET으로:
- `GET /api/user-actions?type=cart` → 200 `{ count, items, totalPrice }` (items 각 항목: `{ productId, quantity, name, price, imageUrl, stock, ... }`)
- `GET /api/user-actions?type=wishlist` → 200 `{ count, items }`
- `type` 누락 시 400 `TYPE_REQUIRED`, 지원하지 않는 type이면 400 `INVALID_TYPE`

#### 공통 오류 케이스
```javascript
// 토큰 없이 호출 → 401
test('user-actions - 토큰 없이 호출 시 401', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/user-actions', {
    data: { action: 'order', items: [] }
  });
  
  expect(response.status()).toBe(401);
  const data = await response.json();
  expect(data.code).toBe('AUTH_NO_TOKEN');
});

// action 누락 → 400
test('user-actions - action 누락 시 400', async ({ request }) => {
  const loginRes = await request.post('http://localhost:3000/api/login', {
    data: { username: 'test', password: '1234' }
  });
  const { token } = await loginRes.json();
  
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {}
  });
  
  expect(response.status()).toBe(400);
  const data = await response.json();
  expect(data.code).toBe('ACTION_REQUIRED');
  expect(data.availableActions).toEqual([
    'cart_add', 'cart_update', 'cart_remove',
    'wishlist_add', 'wishlist_remove', 'order'
  ]);
});

// 지원하지 않는 action → 400
test('user-actions - 잘못된 action 시 400', async ({ request }) => {
  const loginRes = await request.post('http://localhost:3000/api/login', {
    data: { username: 'test', password: '1234' }
  });
  const { token } = await loginRes.json();
  
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'cart_clear' } // 존재하지 않는 action
  });
  
  expect(response.status()).toBe(400);
  const data = await response.json();
  expect(data.code).toBe('UNSUPPORTED_ACTION');
});
```

#### 주문 (action: 'order')

가격/상품명은 항상 **서버(DB)가 결정**합니다. 클라이언트가 보낸 가격은 무시되므로 items에는 `{ id, quantity }`만 보내면 됩니다.
`items`를 생략하면 **서버 장바구니 전체**를 주문하고, 주문 성공 시 장바구니가 비워집니다. `couponCode`(쿠폰 적용), `shipping`(배송지 `{ name, phone, address, memo }`)은 선택입니다.

```javascript
// 주문 성공 → 201 Created
test('주문 성공', async ({ request }) => {
  const loginRes = await request.post('http://localhost:3000/api/login', {
    data: { username: 'test', password: '1234' }
  });
  const { token } = await loginRes.json();
  
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      action: 'order',
      items: [{ id: 1, quantity: 2 }],
      shipping: { name: '홍길동', phone: '010-1234-5678', address: '서울시 강남구', memo: '문 앞' }
    }
  });
  
  expect(response.status()).toBe(201);
  const data = await response.json();
  expect(data.message).toBe('주문 완료');
  // 주문 정보는 order 객체로 반환됨
  expect(data.order.id).toMatch(/^ORD-\d{8}-[A-Z0-9]{4}$/);
  expect(data.order.totalPrice).toBe(258000);
  expect(data.order.discount).toBe(0);
  expect(data.order.finalPrice).toBe(258000);
  expect(data.order.status).toBe('PAID');
  // items: [{ orderId, productId, name, price, quantity }]
  expect(data.items[0].productId).toBe(1);
});

// 장바구니 전체 주문 (items 생략) → 201, 주문 후 장바구니 비워짐
test('장바구니 주문 후 장바구니가 비워진다', async ({ request }) => {
  // 사전조건: cart_add로 상품을 담아둔 상태
  await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'cart_add', productId: 1, quantity: 1 }
  });
  
  const orderRes = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'order' }  // items 생략 → 서버 장바구니 주문
  });
  expect(orderRes.status()).toBe(201);
  
  const cartRes = await request.get('http://localhost:3000/api/user-actions?type=cart', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const cart = await cartRes.json();
  expect(cart.count).toBe(0);
});

// 쿠폰 적용 주문 → 201 (order.discount에 할인액 반영)
test('쿠폰 적용 주문', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      action: 'order',
      items: [{ id: 1, quantity: 1 }],  // 129,000원
      couponCode: 'WELCOME10'           // 10% 할인 (최대 20,000원)
    }
  });
  
  expect(response.status()).toBe(201);
  const data = await response.json();
  expect(data.order.totalPrice).toBe(129000);
  expect(data.order.discount).toBe(12900);
  expect(data.order.finalPrice).toBe(116100);
});
// 쿠폰 오류 시 주문 자체가 실패: 없는 쿠폰 404 COUPON_NOT_FOUND,
// 만료 쿠폰 400 COUPON_EXPIRED, 최소주문금액 미달 400 MIN_ORDER_NOT_MET

// 빈 주문 → 400 (items: [] 또는 items 생략 + 빈 장바구니)
test('빈 주문 시 400', async ({ request }) => {
  // 토큰 획득 생략 (위와 동일)
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'order', items: [] }
  });
  
  expect(response.status()).toBe(400);
  const data = await response.json();
  expect(data.code).toBe('EMPTY_ORDER');
});

// 재고 초과 주문 → 409 (18번 상품은 항상 재고 0 — 의도적 픽스처)
test('재고 부족 상품 주문 시 409', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      action: 'order',
      items: [{ id: 18, quantity: 1 }]
    }
  });
  
  expect(response.status()).toBe(409);
  const data = await response.json();
  expect(data.code).toBe('INSUFFICIENT_STOCK');
  expect(data.productId).toBe(18);
  expect(data.requestedQuantity).toBe(1);
  expect(data.availableStock).toBe(0);
});

// 주문 차단 상품 → 422 (3, 4번 상품은 주문 차단 — 의도적 케이스)
test('주문 차단 상품 포함 시 422', async ({ request }) => {
  // 차단 판정은 재고 검증보다 먼저 수행되므로 재고 0인 3번도 422가 반환됨
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      action: 'order',
      items: [{ id: 4, quantity: 1 }]
    }
  });
  
  expect(response.status()).toBe(422);
  const data = await response.json();
  expect(data.code).toBe('ORDER_BLOCKED_PRODUCT');
});
```

#### 장바구니 (cart_add / cart_update / cart_remove / GET)
```javascript
// 장바구니는 서버(DB)가 사용자별로 관리한다 — productId 기준으로 담기/수정/삭제
// 담기 → 200 (같은 상품을 다시 담으면 수량이 누적됨)
test('장바구니 담기', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'cart_add', productId: 1, quantity: 2 }
  });
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.message).toBe('장바구니에 추가되었습니다');
  expect(data.cart.find((it) => it.productId === 1).quantity).toBe(2);
});
// 오류 케이스: productId 누락 → 400 PRODUCT_ID_REQUIRED,
// 잘못된 productId → 400 INVALID_PRODUCT_ID, 없는 상품 → 404 PRODUCT_NOT_FOUND,
// quantity가 1 미만/정수 아님 → 400 INVALID_QUANTITY

// 수량 변경 (절대값) → 200, quantity: 0이면 항목 삭제
test('장바구니 수량 변경', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'cart_update', productId: 1, quantity: 5 }
  });
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.cart.find((it) => it.productId === 1).quantity).toBe(5); // 누적이 아닌 절대값
});

// 조회 → 200 { count, items, totalPrice }
test('장바구니 조회', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/user-actions?type=cart', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.count).toBe(data.items.length);
  expect(data.totalPrice).toBeGreaterThanOrEqual(0);
});

// 삭제 → 200 (장바구니에 없는 상품이면 404 NOT_IN_CART)
test('장바구니 항목 삭제', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'cart_remove', productId: 1 }
  });
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.message).toBe('장바구니에서 삭제되었습니다');
  expect(data.cart.find((it) => it.productId === 1)).toBeUndefined();
});

test('장바구니에 없는 상품 삭제 시 404', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'cart_remove', productId: 17 } // 장바구니에 없는 상품
  });
  
  expect(response.status()).toBe(404);
  const data = await response.json();
  expect(data.code).toBe('NOT_IN_CART');
});
```

#### 위시리스트 (wishlist_add / wishlist_remove / GET)
```javascript
// 추가 → 201 (응답: { message, count })
test('위시리스트 추가', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      action: 'wishlist_add',
      productId: 1
    }
  });
  
  expect(response.status()).toBe(201);
  const data = await response.json();
  expect(data.message).toBe('위시리스트에 추가되었습니다');
  expect(data.count).toBe(1);
});
// 오류 케이스: productId 누락 → 400 PRODUCT_ID_REQUIRED,
// 없는 상품 → 404 PRODUCT_NOT_FOUND, 중복 추가 → 409 ALREADY_IN_WISHLIST

// 조회 → 200 { count, items }
test('위시리스트 조회', async ({ request }) => {
  const response = await request.get(
    'http://localhost:3000/api/user-actions?type=wishlist',
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.count).toBe(data.items.length);
});

// 삭제 → 200 (위시리스트에 없는 상품이면 404 NOT_IN_WISHLIST)
test('위시리스트 삭제', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'wishlist_remove', productId: 1 }
  });
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.message).toBe('위시리스트에서 삭제되었습니다');
});
```

### 8. 상태 초기화 (reset API) — 테스트 반복성

모든 데이터는 Postgres(DB)에 저장되므로 **서버 재시작으로는 초기화되지 않습니다**. 초기화는 `POST /api/reset`으로 수행합니다 — 전체 테이블을 TRUNCATE 후 시드 데이터로 재시드합니다. 테스트를 반복 실행할 때 사전조건(clean state)을 만들기 위한 용도이며, 인증이 필요 없습니다.

```javascript
test('상태 초기화', async ({ request }) => {
  const response = await request.post('http://localhost:3000/api/reset');
  
  expect(response.status()).toBe(200);
  const data = await response.json();
  
  expect(data.message).toBe('모든 데이터가 초기화되었습니다');
  expect(data.reset).toEqual([
    'products', 'users', 'reviews', 'wishlists', 'carts', 'orders', 'coupons'
  ]);
});

// 테스트 스위트에서의 활용 예: 매 테스트 전에 상태 리셋
test.beforeEach(async ({ request }) => {
  await request.post('http://localhost:3000/api/reset');
});
```

- POST 이외의 메서드 → 405 `METHOD_NOT_ALLOWED`
- 복원 범위 (7종): admin CRUD/주문으로 변경된 **상품·재고**, 회원가입으로 생성된 계정을 삭제하고 시드 계정(test/admin/test2)만 남기는 **users**, **리뷰**, **위시리스트**, **장바구니**, **주문/주문 항목**, **쿠폰**(만료 픽스처 EXPIRED10 포함)
- 관리자 CRUD와 리셋 결과는 DB에 반영되므로 상품 목록/상세 조회에 즉시 반영됨
- 사이트는 여러 사람이 공유하는 연습 환경이므로, 리셋하면 **다른 사용자의 데이터(가입 계정/주문/리뷰 등)도 함께 초기화**된다는 점에 유의

### 9. 회원가입 (signup API)

`POST /api/signup`으로 계정을 생성합니다. **가입한 계정은 즉시 `POST /api/login`으로 로그인할 수 있습니다** (role은 USER). `GET /api/signup?username=x`로 아이디 사용 가능 여부를 미리 확인할 수 있습니다 (UI의 중복확인 버튼이 사용).

| 케이스 | 상태 코드 | code |
|--------|-----------|------|
| 가입 성공 | 201 | - (`{ message, user: { username, role } }`) |
| 아이디 형식 오류 (영문 소문자+숫자 4~12자 아님) | 400 | `INVALID_USERNAME` |
| 비밀번호 정책 위반 (8자 미만 또는 영문/숫자 미포함) | 400 | `INVALID_PASSWORD` |
| 이메일 형식 오류 (email은 선택 입력) | 400 | `INVALID_EMAIL` |
| 이미 사용 중인 아이디 | 409 | `USERNAME_TAKEN` |

```javascript
// 가입 성공 → 201, 곧바로 로그인 가능
test('회원가입 후 로그인', async ({ request }) => {
  await request.post('http://localhost:3000/api/reset'); // clean state

  const signupRes = await request.post('http://localhost:3000/api/signup', {
    data: { username: 'newuser1', password: 'password1', email: 'new@example.com' }
  });
  expect(signupRes.status()).toBe(201);
  const signup = await signupRes.json();
  expect(signup.message).toBe('회원가입이 완료되었습니다');
  expect(signup.user).toEqual({ username: 'newuser1', role: 'USER' });

  // 가입한 계정으로 즉시 로그인 가능
  const loginRes = await request.post('http://localhost:3000/api/login', {
    data: { username: 'newuser1', password: 'password1' }
  });
  expect(loginRes.status()).toBe(200);
  const { token } = await loginRes.json();
  expect(token).toBeTruthy();
});

// 아이디 중복 확인 (GET)
test('아이디 사용 가능 여부 확인', async ({ request }) => {
  // 시드 계정 test는 사용 불가
  const taken = await request.get('http://localhost:3000/api/signup?username=test');
  expect(taken.status()).toBe(200);
  expect((await taken.json()).available).toBe(false);

  // 미사용 아이디는 사용 가능
  const free = await request.get('http://localhost:3000/api/signup?username=freshuser');
  expect(free.status()).toBe(200);
  expect((await free.json()).available).toBe(true);

  // 형식이 잘못된 아이디는 400
  const bad = await request.get('http://localhost:3000/api/signup?username=AB');
  expect(bad.status()).toBe(400);
  expect((await bad.json()).code).toBe('INVALID_USERNAME');
});

// 네거티브 케이스 모음
test('회원가입 유효성 검증', async ({ request }) => {
  // 아이디 형식 오류 (대문자 포함) → 400
  let res = await request.post('http://localhost:3000/api/signup', {
    data: { username: 'NewUser', password: 'password1' }
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('INVALID_USERNAME');

  // 비밀번호 정책 위반 (숫자 없음) → 400
  res = await request.post('http://localhost:3000/api/signup', {
    data: { username: 'newuser2', password: 'onlyletters' }
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('INVALID_PASSWORD');

  // 이메일 형식 오류 → 400
  res = await request.post('http://localhost:3000/api/signup', {
    data: { username: 'newuser2', password: 'password1', email: 'not-an-email' }
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('INVALID_EMAIL');

  // 중복 아이디 (시드 계정 test) → 409
  res = await request.post('http://localhost:3000/api/signup', {
    data: { username: 'test', password: 'password1' }
  });
  expect(res.status()).toBe(409);
  expect((await res.json()).code).toBe('USERNAME_TAKEN');
});
```

### 10. 쿠폰 검증 (coupons API)

`POST /api/coupons`에 `{ code, orderAmount }`를 보내면 쿠폰 유효성과 할인액을 계산해 줍니다 (인증 불필요). 주문(`action: 'order'`의 `couponCode`)과 동일한 규칙을 사용합니다.

**시드 쿠폰 4종:**

| 코드 | 타입 | 할인 | 조건 | 비고 |
|------|------|------|------|------|
| `WELCOME10` | percent | 10% | 최소주문 없음, **최대 할인 20,000원** | |
| `SAVE5000` | fixed | 5,000원 | **최소주문 30,000원** | |
| `VIP20` | percent | 20% | **최소주문 100,000원**, 최대 할인 50,000원 | |
| `EXPIRED10` | percent | 10% | - | **만료된 쿠폰 (의도적 픽스처)** |

| 케이스 | 상태 코드 | code |
|--------|-----------|------|
| 유효한 쿠폰 | 200 | - (`{ valid, code, type, amount, discount, finalAmount }`) |
| 존재하지 않는 쿠폰 | 404 | `COUPON_NOT_FOUND` |
| 만료된 쿠폰 (EXPIRED10) | 400 | `COUPON_EXPIRED` |
| 최소주문금액 미달 | 400 | `MIN_ORDER_NOT_MET` |
| orderAmount가 0 이하/숫자 아님 | 400 | `INVALID_AMOUNT` |

```javascript
// 정률 쿠폰 + 최대 할인 한도
test('WELCOME10 - 10% 할인, 최대 20,000원', async ({ request }) => {
  // 100,000원 주문 → 10% = 10,000원 할인
  let res = await request.post('http://localhost:3000/api/coupons', {
    data: { code: 'WELCOME10', orderAmount: 100000 }
  });
  expect(res.status()).toBe(200);
  let data = await res.json();
  expect(data).toMatchObject({
    valid: true, code: 'WELCOME10', type: 'percent', amount: 10,
    discount: 10000, finalAmount: 90000
  });

  // 500,000원 주문 → 10% = 50,000원이지만 최대 한도 20,000원까지만
  res = await request.post('http://localhost:3000/api/coupons', {
    data: { code: 'WELCOME10', orderAmount: 500000 }
  });
  data = await res.json();
  expect(data.discount).toBe(20000);
  expect(data.finalAmount).toBe(480000);
});

// 정액 쿠폰 + 최소주문금액
test('SAVE5000 - 5,000원 할인, 최소주문 30,000원', async ({ request }) => {
  // 조건 충족 → 200
  let res = await request.post('http://localhost:3000/api/coupons', {
    data: { code: 'SAVE5000', orderAmount: 30000 }
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).discount).toBe(5000);

  // 최소주문금액 미달 → 400
  res = await request.post('http://localhost:3000/api/coupons', {
    data: { code: 'SAVE5000', orderAmount: 29999 }
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('MIN_ORDER_NOT_MET');
});

// VIP20 - 20% 할인, 최소주문 100,000원, 최대 할인 50,000원
test('VIP20 검증', async ({ request }) => {
  const res = await request.post('http://localhost:3000/api/coupons', {
    data: { code: 'VIP20', orderAmount: 200000 }
  });
  expect(res.status()).toBe(200);
  expect((await res.json()).discount).toBe(40000); // 20% = 40,000 (한도 이내)
});

// 만료 쿠폰(의도적 픽스처) / 없는 쿠폰
test('쿠폰 네거티브 케이스', async ({ request }) => {
  let res = await request.post('http://localhost:3000/api/coupons', {
    data: { code: 'EXPIRED10', orderAmount: 50000 }
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('COUPON_EXPIRED');

  res = await request.post('http://localhost:3000/api/coupons', {
    data: { code: 'NOSUCHCODE', orderAmount: 50000 }
  });
  expect(res.status()).toBe(404);
  expect((await res.json()).code).toBe('COUPON_NOT_FOUND');

  res = await request.post('http://localhost:3000/api/coupons', {
    data: { code: 'WELCOME10', orderAmount: 0 }
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).code).toBe('INVALID_AMOUNT');
});
```

### 11. 주문 내역/상세/취소 (orders API)

모든 요청에 인증(Bearer 토큰)이 필요합니다. 일반 사용자는 **본인 주문만** 조회되고, 관리자는 전체 주문을 조회하며 각 주문에 `username`이 포함됩니다.

| 요청 | 성공 | 네거티브 |
|------|------|----------|
| `GET /api/orders` | 200 `{ count, orders }` | 401 (토큰 없음/무효) |
| `GET /api/orders/:id` | 200 `{ order }` (shipping/items 포함) | 404 `ORDER_NOT_FOUND` (없는 주문·**타인 주문도 404**) |
| `PATCH /api/orders/:id` `{ action: 'cancel' }` | 200 `{ message, order }` (status CANCELED, **재고 원복**) | 409 `ALREADY_CANCELED`, 400 `UNSUPPORTED_ACTION` |

```javascript
// 주문 목록 조회
test('내 주문 목록 조회', async ({ request }) => {
  const loginRes = await request.post('http://localhost:3000/api/login', {
    data: { username: 'test', password: '1234' }
  });
  const { token } = await loginRes.json();

  // 사전조건: 주문 1건 생성
  const orderRes = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'order', items: [{ id: 1, quantity: 1 }] }
  });
  const { order } = await orderRes.json();

  const response = await request.get('http://localhost:3000/api/orders', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.count).toBeGreaterThan(0);
  // 각 주문: { id, status, totalPrice, discount, finalPrice, couponCode, createdAt, items }
  const mine = data.orders.find((o) => o.id === order.id);
  expect(mine.status).toBe('PAID');
});

// 주문 상세 조회 (shipping 포함)
test('주문 상세 조회', async ({ request }) => {
  const response = await request.get(`http://localhost:3000/api/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  expect(response.status()).toBe(200);
  const { order } = await response.json();
  expect(order.id).toBe(orderId);
  expect(order.shipping).toBeDefined();       // { name, phone, address, memo }
  expect(Array.isArray(order.items)).toBe(true);
});

// 없는 주문 / 타인 주문 → 동일하게 404 (존재 여부 비노출)
test('없는 주문 조회 시 404', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/orders/ORD-19700101-XXXX', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  expect(response.status()).toBe(404);
  expect((await response.json()).code).toBe('ORDER_NOT_FOUND');
});

// 주문 취소 → 200 + 재고 원복, 재취소 → 409
test('주문 취소 및 재고 원복', async ({ request }) => {
  // 취소 전 재고 확인
  const before = await (await request.get('http://localhost:3000/api/inventory?productId=1')).json();

  const cancelRes = await request.patch(`http://localhost:3000/api/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'cancel' }
  });
  expect(cancelRes.status()).toBe(200);
  const canceled = await cancelRes.json();
  expect(canceled.message).toBe('주문이 취소되었습니다');
  expect(canceled.order.status).toBe('CANCELED');

  // 재고가 주문 수량만큼 원복됨
  const after = await (await request.get('http://localhost:3000/api/inventory?productId=1')).json();
  expect(after.stock).toBe(before.stock + 1);

  // 이미 취소된 주문 재취소 → 409
  const again = await request.patch(`http://localhost:3000/api/orders/${orderId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
    data: { action: 'cancel' }
  });
  expect(again.status()).toBe(409);
  expect((await again.json()).code).toBe('ALREADY_CANCELED');
});
```

---

## 추가 검증 포인트

### 1. 에러 응답 형식 일관성
대부분의 API 에러 응답은 다음 형식을 따릅니다:
```json
{
  "message": "에러 메시지",
  "code": "ERROR_CODE"
}
```

> ⚠️ 예외: `/api/login`의 오류 응답은 `message`만 반환하고 `code` 필드가 없습니다. (형식 일관성 검증 연습 포인트)

### 2. CORS 헤더
모든 API는 CORS를 지원합니다:
```javascript
test('CORS 헤더 검증', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/products', {
    headers: { 'Origin': 'http://localhost:5173' }
  });
  
  expect(response.headers()['access-control-allow-origin']).toBeDefined();
});
```

### 3. 재고 초과 주문 방지
재고보다 많은 수량을 주문하면 `POST /api/user-actions`(action: 'order')가 409를 반환합니다:
```javascript
test('재고 초과 주문 방지', async ({ request }) => {
  // 로그인하여 토큰 획득
  const loginRes = await request.post('http://localhost:3000/api/login', {
    data: { username: 'test', password: '1234' }
  });
  const { token } = await loginRes.json();
  
  // 1. 현재 재고 확인 (상품 1번: 초기 재고 15)
  const invRes = await request.get('http://localhost:3000/api/inventory?productId=1');
  const { stock } = await invRes.json();
  
  // 2. 재고보다 많은 수량으로 주문 시도 (가격/이름은 서버가 DB에서 결정하므로 id, quantity만 전달)
  const response = await request.post('http://localhost:3000/api/user-actions', {
    headers: { 'Authorization': `Bearer ${token}` },
    data: {
      action: 'order',
      items: [{ id: 1, quantity: stock + 1 }]
    }
  });
  
  // 3. 409 Conflict + 재고 상세 정보 확인
  expect(response.status()).toBe(409);
  const data = await response.json();
  expect(data.code).toBe('INSUFFICIENT_STOCK');
  expect(data.availableStock).toBe(stock);
});
```

---

## 📝 QA 자동화 체크리스트

### 기본 API 검증
- [ ] 모든 API 엔드포인트 호출 가능
- [ ] 올바른 HTTP 메서드 사용
- [ ] 정상 응답 시 올바른 상태 코드 반환
- [ ] 오류 시 적절한 상태 코드 반환
- [ ] 에러 응답에 code와 message 포함

### 상태 코드 연습
- [ ] status-codes API로 200, 404, 401, 429, 500 테스트
- [ ] 429 응답에 Retry-After 헤더 포함 확인

### 재고 관리
- [ ] inventory API로 재고 조회 가능
- [ ] HEAD 메서드로 헤더만 조회 가능
- [ ] 커스텀 헤더 (X-Product-Id, X-Stock-Count 등) 검증
- [ ] ETag 및 Cache-Control 헤더 확인
- [ ] 재고 초과 주문 시 409 (INSUFFICIENT_STOCK) 확인

### 리뷰 시스템
- [ ] 리뷰 조회 (GET)
- [ ] 리뷰 작성 (POST) - 인증 필요
- [ ] 리뷰 수정 (PATCH) - 인증 필요
- [ ] 리뷰 삭제 (DELETE) - 인증 필요
- [ ] 필수 필드 누락 시 400 오류
- [ ] 별점 범위 초과 시 400 오류

### 검색 기능
- [ ] 기본 검색 동작
- [ ] 카테고리 필터 동작
- [ ] 가격 범위 필터 동작
- [ ] 정렬 기능 동작
- [ ] 빈 검색어 입력 시 400 오류

### 인증/권한
- [ ] 로그인 성공 (test/1234, admin/1234)
- [ ] 로그인 실패 (잘못된 비밀번호) 시 401
- [ ] 차단 계정(test2/1234) 로그인 시 403 (의도적 케이스)
- [ ] 토큰 없이 보호된 API 호출 시 401
- [ ] 일반 사용자가 관리자 API 호출 시 403
- [ ] 관리자 권한으로 API 접근 성공

### 사용자 액션 통합 (user-actions)
- [ ] 주문 성공 (action=order) 201 및 order 객체(id/totalPrice/discount/finalPrice/status) 확인
- [ ] items 생략 시 서버 장바구니 주문 + 주문 후 장바구니 비워짐
- [ ] couponCode 적용 시 discount/finalPrice 반영
- [ ] 빈 주문 시 400 (EMPTY_ORDER)
- [ ] 재고 초과 주문 시 409 (INSUFFICIENT_STOCK)
- [ ] 주문 차단 상품(3/4번) 주문 시 422 (의도적 케이스)
- [ ] 장바구니 담기(cart_add, 수량 누적)/수량 변경(cart_update, 절대값)/삭제(cart_remove)
- [ ] 장바구니에 없는 상품 삭제 시 404 (NOT_IN_CART)
- [ ] GET ?type=cart 조회 (count/items/totalPrice)
- [ ] 위시리스트 추가(201)/조회(200)/삭제(200)
- [ ] action 누락/미지원 action 시 400
- [ ] 토큰 없이 호출 시 401

### 회원가입
- [ ] 가입 성공 201 및 가입 계정으로 로그인 가능
- [ ] 아이디/비밀번호/이메일 형식 오류 시 400
- [ ] 중복 아이디 409 (USERNAME_TAKEN), GET ?username= 중복 확인

### 쿠폰
- [ ] WELCOME10/SAVE5000/VIP20 할인 계산 (최대 할인 한도, 최소주문금액)
- [ ] EXPIRED10 → 400 COUPON_EXPIRED (의도적 픽스처)
- [ ] 없는 쿠폰 404, 잘못된 금액 400

### 주문 내역/취소
- [ ] GET /api/orders 본인 주문만 조회 (관리자는 전체 + username)
- [ ] GET /api/orders/:id 상세 (shipping 포함), 타인/없는 주문 404
- [ ] PATCH 취소 시 200 + 재고 원복, 재취소 409 (ALREADY_CANCELED)

### 상태 초기화
- [ ] POST /api/reset 200 및 reset 목록(7종) 확인
- [ ] 리셋 후 상품/사용자/리뷰/위시리스트/장바구니/주문/쿠폰이 시드 상태로 복원
- [ ] 서버 재시작만으로는 초기화되지 않음(DB 영속) 확인

---

**이 가이드를 참고하여 체계적인 API 테스트를 수행하세요!**

### Playwright 예제

```javascript
import { test, expect } from '@playwright/test';

test.describe('API 검증 테스트', () => {
  let baseURL = 'http://localhost:3000';
  let token;

  test.beforeAll(async ({ request }) => {
    // 로그인하여 토큰 획득
    const response = await request.post(`${baseURL}/api/login`, {
      data: {
        username: 'test',
        password: '1234'
      }
    });
    
    const data = await response.json();
    token = data.token;
  });

  test('상품 검색 API - 쿼리 파라미터', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/search`, {
      params: {
        q: '블루투스',
        category: '전자기기',
        minPrice: '50000',
        sort: 'price-asc'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data.query).toBe('블루투스');
    expect(data.filters.category).toBe('전자기기');
    expect(data.count).toBeGreaterThan(0);
    
    // 모든 상품이 조건을 만족하는지 확인
    data.products.forEach(p => {
      expect(p.name).toContain('블루투스');
      expect(p.category).toBe('전자기기');
      expect(p.price).toBeGreaterThanOrEqual(50000);
    });
  });

  test('리뷰 작성 API - POST', async ({ request }) => {
    // test 계정은 상품 1, 2에 초기 리뷰가 있으므로 5번 상품 사용
    const response = await request.post(`${baseURL}/api/reviews`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        productId: 5,
        rating: 5,
        comment: 'Playwright로 작성한 리뷰입니다. 정말 좋은 상품이에요!'
      }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    
    expect(data.review.id).toBeDefined();
    expect(data.review.rating).toBe(5);
    expect(data.review.username).toBe('test');
  });

  test('재고 확인 API - HEAD 메서드', async ({ request }) => {
    const response = await request.head(`${baseURL}/api/inventory?productId=1`);

    expect(response.ok()).toBeTruthy();
    
    // 헤더 검증
    const headers = response.headers();
    expect(headers['x-product-id']).toBe('1');
    expect(headers['x-stock-count']).toBeDefined();
    expect(headers['x-stock-status']).toBeDefined();
  });

  test('상태 코드 연습 API', async ({ request }) => {
    // 404 테스트
    const notFound = await request.get(`${baseURL}/api/status-codes?code=404`);
    expect(notFound.status()).toBe(404);
    
    // 429 테스트
    const tooMany = await request.get(`${baseURL}/api/status-codes?code=429`);
    expect(tooMany.status()).toBe(429);
    expect(tooMany.headers()['retry-after']).toBeDefined();
  });
});
```

### Postman/Newman 예제

```javascript
// Postman 컬렉션 예시
{
  "info": {
    "name": "Mini Commerce API Tests"
  },
  "item": [
    {
      "name": "로그인",
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test('Status code is 200', function () {",
              "    pm.response.to.have.status(200);",
              "});",
              "",
              "pm.test('응답에 토큰 포함', function () {",
              "    var jsonData = pm.response.json();",
              "    pm.expect(jsonData.token).to.exist;",
              "    pm.environment.set('token', jsonData.token);",
              "});"
            ]
          }
        }
      ],
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"username\": \"test\",\n  \"password\": \"1234\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/login",
          "host": ["{{baseUrl}}"],
          "path": ["api", "login"]
        }
      }
    },
    {
      "name": "상품 검색",
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test('검색 결과 존재', function () {",
              "    var jsonData = pm.response.json();",
              "    pm.expect(jsonData.count).to.be.above(0);",
              "});",
              "",
              "pm.test('모든 상품이 필터 조건 만족', function () {",
              "    var jsonData = pm.response.json();",
              "    jsonData.products.forEach(function(product) {",
              "        pm.expect(product.category).to.equal('전자기기');",
              "    });",
              "});"
            ]
          }
        }
      ],
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{baseUrl}}/api/search?category=전자기기&sort=price-asc",
          "host": ["{{baseUrl}}"],
          "path": ["api", "search"],
          "query": [
            {"key": "category", "value": "전자기기"},
            {"key": "sort", "value": "price-asc"}
          ]
        }
      }
    }
  ]
}
```

---

## 📝 체크리스트

### RESTful API 기본
- [ ] URL은 명사 사용
- [ ] HTTP 메서드 적절히 사용
- [ ] 상태 코드 의미에 맞게 반환
- [ ] JSON 형식 응답
- [ ] 에러 시 일관된 형식

### 요청 검증
- [ ] 필수 파라미터 누락 시 400
- [ ] 타입 불일치 시 400
- [ ] 범위 초과 시 400
- [ ] 잘못된 형식 시 400

### 응답 검증
- [ ] 성공 시 올바른 데이터
- [ ] 일관된 응답 구조
- [ ] 에러 시 code 포함
- [ ] 페이지네이션 (필요 시)

### 인증/권한
- [ ] 토큰 없이 요청 시 401
- [ ] 잘못된 토큰 시 401
- [ ] 권한 부족 시 403
- [ ] 토큰 만료 처리

### HTTP 메서드
- [ ] GET - 조회만, 부작용 없음
- [ ] POST - 생성, 201 반환
- [ ] PUT/PATCH - 수정, 200 반환
- [ ] DELETE - 삭제, 200/204 반환
- [ ] HEAD - 메타데이터만

### 상태 코드
- [ ] 200 - 성공
- [ ] 201 - 생성 성공
- [ ] 400 - 잘못된 요청
- [ ] 401 - 인증 필요
- [ ] 403 - 권한 없음
- [ ] 404 - 리소스 없음
- [ ] 409 - 충돌
- [ ] 500 - 서버 오류

---

**이 가이드로 완벽한 API 테스트를 수행하세요!**
