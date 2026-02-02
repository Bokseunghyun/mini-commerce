# API 테스트 컬렉션

## 환경 변수 설정
```
baseUrl=http://localhost:5173
token=your-jwt-token-here
```

## 1. 인증 API

### 1.1 로그인 (성공)
```http
POST {{baseUrl}}/api/login
Content-Type: application/json

{
  "username": "test",
  "password": "test1234"
}
```

### 1.2 로그인 (실패 - 잘못된 비밀번호)
```http
POST {{baseUrl}}/api/login
Content-Type: application/json

{
  "username": "test",
  "password": "wrong"
}
```

### 1.3 admin 로그인
```http
POST {{baseUrl}}/api/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin1234"
}
```

---

## 2. 상품 API

### 2.1 상품 목록 조회
```http
GET {{baseUrl}}/api/products
```

### 2.2 상품 상세 조회
```http
GET {{baseUrl}}/api/products/1
```

### 2.3 존재하지 않는 상품 조회 (404)
```http
GET {{baseUrl}}/api/products/9999
```

---

## 3. 검색 API

### 3.1 기본 검색
```http
GET {{baseUrl}}/api/search?q=블루투스
```

### 3.2 카테고리 필터
```http
GET {{baseUrl}}/api/search?category=전자기기
```

### 3.3 가격 범위 필터
```http
GET {{baseUrl}}/api/search?minPrice=50000&maxPrice=200000
```

### 3.4 복합 필터 + 정렬
```http
GET {{baseUrl}}/api/search?q=블루투스&category=전자기기&minPrice=50000&sort=price-asc
```

### 3.5 잘못된 가격 범위 (400)
```http
GET {{baseUrl}}/api/search?minPrice=200000&maxPrice=50000
```

### 3.6 잘못된 정렬 옵션 (400)
```http
GET {{baseUrl}}/api/search?sort=invalid
```

---

## 4. 리뷰 API

### 4.1 리뷰 조회
```http
GET {{baseUrl}}/api/reviews?productId=1
```

### 4.2 리뷰 작성 (인증 필요)
```http
POST {{baseUrl}}/api/reviews
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": 1,
  "rating": 5,
  "comment": "정말 좋은 상품입니다! 강력 추천합니다."
}
```

### 4.3 리뷰 작성 - 인증 없음 (401)
```http
POST {{baseUrl}}/api/reviews
Content-Type: application/json

{
  "productId": 1,
  "rating": 5,
  "comment": "인증 없이 작성 시도"
}
```

### 4.4 리뷰 작성 - 별점 범위 초과 (400)
```http
POST {{baseUrl}}/api/reviews
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": 1,
  "rating": 10,
  "comment": "별점이 너무 높아요"
}
```

### 4.5 리뷰 작성 - 짧은 코멘트 (400)
```http
POST {{baseUrl}}/api/reviews
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": 1,
  "rating": 5,
  "comment": "짧음"
}
```

### 4.6 리뷰 수정 (PATCH)
```http
PATCH {{baseUrl}}/api/reviews
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "id": 1,
  "rating": 4,
  "comment": "수정된 리뷰입니다. 다시 생각해보니 별 4개가 적당한 것 같아요."
}
```

### 4.7 리뷰 삭제
```http
DELETE {{baseUrl}}/api/reviews
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "id": 1
}
```

### 4.8 존재하지 않는 리뷰 삭제 (404)
```http
DELETE {{baseUrl}}/api/reviews
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "id": 9999
}
```

---

## 5. 재고 API

### 5.1 재고 조회 (GET)
```http
GET {{baseUrl}}/api/inventory?productId=1
```

### 5.2 재고 확인 (HEAD - 헤더만)
```http
HEAD {{baseUrl}}/api/inventory?productId=1
```

### 5.3 재고 없는 상품 조회
```http
GET {{baseUrl}}/api/inventory?productId=3
```

### 5.4 잘못된 상품 ID (400)
```http
GET {{baseUrl}}/api/inventory?productId=abc
```

---

## 6. 위시리스트 API

### 6.1 위시리스트 조회
```http
GET {{baseUrl}}/api/wishlist
Authorization: Bearer {{token}}
```

### 6.2 위시리스트 추가
```http
POST {{baseUrl}}/api/wishlist
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": 1,
  "productName": "프리미엄 무선 블루투스 이어폰",
  "price": 129000,
  "category": "전자기기"
}
```

### 6.3 위시리스트 추가 - 중복 (409)
```http
POST {{baseUrl}}/api/wishlist
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": 1,
  "productName": "프리미엄 무선 블루투스 이어폰",
  "price": 129000,
  "category": "전자기기"
}
```

### 6.4 위시리스트 삭제
```http
DELETE {{baseUrl}}/api/wishlist
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": 1
}
```

### 6.5 위시리스트 조회 (정렬)
```http
GET {{baseUrl}}/api/wishlist?sort=name
Authorization: Bearer {{token}}
```

---

## 7. 상태 코드 테스트 API

### 7.1 200 OK
```http
GET {{baseUrl}}/api/status-codes?code=200
```

### 7.2 201 Created
```http
GET {{baseUrl}}/api/status-codes?code=201
```

### 7.3 400 Bad Request
```http
GET {{baseUrl}}/api/status-codes?code=400
```

### 7.4 401 Unauthorized
```http
GET {{baseUrl}}/api/status-codes?code=401
```

### 7.5 403 Forbidden
```http
GET {{baseUrl}}/api/status-codes?code=403
```

### 7.6 404 Not Found
```http
GET {{baseUrl}}/api/status-codes?code=404
```

### 7.7 429 Too Many Requests
```http
GET {{baseUrl}}/api/status-codes?code=429
```

### 7.8 500 Internal Server Error
```http
GET {{baseUrl}}/api/status-codes?code=500
```

### 7.9 리다이렉트 (301)
```http
GET {{baseUrl}}/api/status-codes?code=301
```

### 7.10 지연 시뮬레이션 (2초)
```http
GET {{baseUrl}}/api/status-codes?code=200&delay=2000
```

---

## 8. 관리자 API

### 8.1 상품 목록 조회 (관리자)
```http
GET {{baseUrl}}/api/admin
Authorization: Bearer {{adminToken}}
```

### 8.2 상품 추가
```http
POST {{baseUrl}}/api/admin
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "name": "테스트 상품",
  "category": "전자기기",
  "originalPrice": 100000,
  "discountedPrice": 80000,
  "discountRate": 20
}
```

### 8.3 상품 수정
```http
PUT {{baseUrl}}/api/admin
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "id": 1,
  "name": "수정된 상품명",
  "originalPrice": 150000,
  "discountedPrice": 120000
}
```

### 8.4 상품 삭제
```http
DELETE {{baseUrl}}/api/admin
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "id": 1
}
```

### 8.5 일반 사용자로 관리자 API 접근 (403)
```http
GET {{baseUrl}}/api/admin
Authorization: Bearer {{token}}
```

---

## 9. 장바구니 API

### 9.1 장바구니 추가
```http
POST {{baseUrl}}/api/cart
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "add",
  "productId": 1,
  "quantity": 2
}
```

### 9.2 장바구니 삭제
```http
POST {{baseUrl}}/api/cart
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "remove",
  "index": 0
}
```

---

## 10. 주문 API

### 10.1 주문 생성
```http
POST {{baseUrl}}/api/order
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "items": [
    {
      "id": 1,
      "name": "프리미엄 무선 블루투스 이어폰",
      "price": 129000,
      "quantity": 1
    }
  ]
}
```

### 10.2 주문 생성 - 인증 없음 (401)
```http
POST {{baseUrl}}/api/order
Content-Type: application/json

{
  "items": []
}
```

---

## 테스트 시나리오

### 시나리오 1: 일반 사용자 플로우
1. 로그인 (test/test1234)
2. 상품 목록 조회
3. 상품 검색
4. 상품 상세 조회
5. 위시리스트 추가
6. 리뷰 작성
7. 장바구니 추가
8. 주문 생성

### 시나리오 2: 관리자 플로우
1. 로그인 (admin/admin1234)
2. 관리자 페이지 조회
3. 상품 추가
4. 상품 수정
5. 상품 삭제

### 시나리오 3: 에러 케이스
1. 잘못된 로그인
2. 인증 없이 보호된 API 접근
3. 일반 사용자가 관리자 API 접근
4. 잘못된 요청 본문
5. 존재하지 않는 리소스 접근
6. 중복 생성 시도

### 시나리오 4: HTTP 메서드 검증
1. GET - 조회 (멱등성, 안전)
2. POST - 생성 (비멱등성)
3. PATCH - 부분 수정 (멱등성)
4. DELETE - 삭제 (멱등성)
5. HEAD - 메타데이터만 (멱등성, 안전)

### 시나리오 5: 상태 코드 검증
1. 2xx - 성공
2. 3xx - 리다이렉트
3. 4xx - 클라이언트 오류
4. 5xx - 서버 오류
