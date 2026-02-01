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
| `/api/login` | POST | ❌ | 로그인 |
| `/api/products` | GET | ❌ | 상품 목록 조회 |
| `/api/products/:id` | GET | ❌ | 상품 상세 조회 |
| `/api/cart` | POST | ✅ | 장바구니 수정 |
| `/api/order` | POST | ✅ | 주문 생성 |
| `/api/admin` | GET | ✅ (ADMIN) | 상품 관리 - 조회 |
| `/api/admin` | POST | ✅ (ADMIN) | 상품 관리 - 추가 |
| `/api/admin` | PUT | ✅ (ADMIN) | 상품 관리 - 수정 |
| `/api/admin` | DELETE | ✅ (ADMIN) | 상품 관리 - 삭제 |

### 새로운 API (검증 연습용)

| API | Method | 인증 | 설명 |
|-----|--------|------|------|
| `/api/search` | GET | ❌ | 상품 검색 (쿼리 파라미터) |
| `/api/reviews` | GET | ❌ | 리뷰 조회 |
| `/api/reviews` | POST | ✅ | 리뷰 작성 |
| `/api/reviews` | PATCH | ✅ | 리뷰 수정 |
| `/api/reviews` | DELETE | ✅ | 리뷰 삭제 |
| `/api/inventory` | GET | ❌ | 재고 조회 |
| `/api/inventory` | HEAD | ❌ | 재고 존재 확인 (헤더만) |
| `/api/status-codes` | GET | ❌ | 상태 코드 연습 |

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
  const token = 'your-jwt-token';
  
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      productId: 1,
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
  const token = 'your-jwt-token';
  
  const body = {
    productId: 1,
    rating: 5,
    comment: '이미 작성한 리뷰입니다.'
  };
  
  // 첫 번째 리뷰 작성
  await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  
  // 같은 상품에 다시 리뷰 작성 시도
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
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
  const token = 'other-user-token';
  
  const response = await fetch('http://localhost:3000/api/reviews', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      id: 1, // 다른 사용자의 리뷰
      comment: '수정 시도'
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
  const response = await fetch('http://localhost:3000/api/cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action: 'add', productId: 1 })
  });
  
  expect(response.status).toBe(401);
  const data = await response.json();
  expect(data.code).toBe('AUTH_NO_TOKEN');
});

// 2. 잘못된 토큰
test('잘못된 토큰 - 401', async () => {
  const response = await fetch('http://localhost:3000/api/cart', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token'
    },
    body: JSON.stringify({ action: 'add', productId: 1 })
  });
  
  expect(response.status).toBe(401);
  const data = await response.json();
  expect(data.code).toBe('AUTH_INVALID_TOKEN');
});

// 3. 권한 부족 (일반 사용자가 관리자 API 호출)
test('권한 부족 - 403', async () => {
  const userToken = 'test-user-token'; // 일반 사용자 토큰
  
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
        password: 'test1234'
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
    const response = await request.post(`${baseURL}/api/reviews`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        productId: 1,
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
          "raw": "{\n  \"username\": \"test\",\n  \"password\": \"test1234\"\n}"
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
