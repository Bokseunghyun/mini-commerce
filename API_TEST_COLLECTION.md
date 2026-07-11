# API 테스트 컬렉션

> **Playwright 자동화 시:** 이 컬렉션의 요청들은 `page.request` 또는 `request.newContext({ baseURL: 'http://localhost:5173' })`로 그대로 옮길 수 있습니다. 테스트 `baseURL`은 `http://localhost:5173`, 요청은 상대경로 `/api/...`로 보냅니다 — baseURL(5173)이 붙고 vite가 Express(3000)로 프록시합니다. 인증 토큰은 `POST /api/login` 응답 바디 `{ token, user }`에서 얻어 `Authorization: Bearer <token>` 헤더로 보냅니다. 브라우저 컨텍스트에서는 이 토큰이 **localStorage**에 저장되므로 `storageState`로 로그인 세션을 재사용할 수 있습니다. 자세한 패턴은 README_QA.md 참조.

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
  "password": "1234"
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
  "password": "1234"
}
```

### 1.4 차단 계정 로그인 (403 - 의도적 오류)
```http
POST {{baseUrl}}/api/login
Content-Type: application/json

{
  "username": "test2",
  "password": "1234"
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

### 2.4 의도적 500 오류 (상품 3, 4)
```http
GET {{baseUrl}}/api/products/3
```

### 2.5 의도적 404 오류 (상품 16 - 목록엔 있지만 상세 없음)
```http
GET {{baseUrl}}/api/products/16
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

### 5.3 다른 상품 재고 조회
> 씨드 재고는 상품마다 5~30 범위입니다. `X-Stock-Status`/`status` 필드가 `IN_STOCK`(≥5) / `LOW_STOCK`(<5) / `OUT_OF_STOCK`(0)로 갈립니다. `OUT_OF_STOCK`을 보려면 관리자 `PUT /api/admin`으로 재고를 0으로 낮춘 뒤 조회하세요.
```http
GET {{baseUrl}}/api/inventory?productId=3
```

### 5.4 잘못된 상품 ID (400)
```http
GET {{baseUrl}}/api/inventory?productId=abc
```

---

## 6. 위시리스트 API (통합 엔드포인트 /api/user-actions)

> 위시리스트는 통합 엔드포인트 `/api/user-actions` 로 처리합니다.

### 6.1 위시리스트 조회
```http
GET {{baseUrl}}/api/user-actions?type=wishlist
Authorization: Bearer {{token}}
```
응답: `200 { "count": n, "items": [...] }`

### 6.2 위시리스트 추가 (201)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "wishlist_add",
  "productId": 1
}
```
응답: `201 { "message": "위시리스트에 추가되었습니다", "count": n }` (상품 정보는 서버가 DB에서 조회 — productId만 보내면 됨)

### 6.3 위시리스트 추가 - 중복 (409)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "wishlist_add",
  "productId": 1
}
```
응답: `409 { "code": "ALREADY_IN_WISHLIST", ... }`

### 6.4 위시리스트 삭제
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "wishlist_remove",
  "productId": 1
}
```
응답: `200 { "message": "위시리스트에서 삭제되었습니다", "count": n }` (목록에 없으면 `404 { "code": "NOT_IN_WISHLIST" }`)

### 6.5 위시리스트 추가 - 없는 상품 (404)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "wishlist_add",
  "productId": 9999
}
```
응답: `404 { "code": "PRODUCT_NOT_FOUND" }`

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

## 9. 장바구니 API (통합 엔드포인트 /api/user-actions)

> 장바구니는 **서버(DB)가 사용자별로 관리**합니다. `productId` 기준의 `cart_add` / `cart_update` / `cart_remove` 액션을 사용합니다. (모두 인증 필요)

### 9.1 장바구니 담기 (수량 누적)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "cart_add",
  "productId": 1,
  "quantity": 2
}
```
응답: `200 { "message": "장바구니에 추가되었습니다", "cart": [...] }` — 같은 상품을 다시 담으면 수량이 **누적**됨 (quantity 생략 시 1)

### 9.2 장바구니 수량 변경 (절대값)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "cart_update",
  "productId": 1,
  "quantity": 5
}
```
응답: `200 { "cart": [...] }` — 수량을 **절대값**으로 설정, `quantity: 0`이면 항목 삭제

### 9.3 장바구니 항목 삭제
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "cart_remove",
  "productId": 1
}
```
응답: `200 { "message": "장바구니에서 삭제되었습니다", "cart": [남은 항목] }`

### 9.4 장바구니 삭제 - 없는 상품 (404)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "cart_remove",
  "productId": 17
}
```
응답: `404 { "code": "NOT_IN_CART" }` (장바구니에 담기지 않은 상품)

### 9.5 장바구니 조회
```http
GET {{baseUrl}}/api/user-actions?type=cart
Authorization: Bearer {{token}}
```
응답: `200 { "count": n, "items": [{ "productId": 1, "quantity": 2, "name": "...", "price": 129000, "imageUrl": "...", "stock": 15, ... }], "totalPrice": 258000 }`

---

## 10. 주문 API (통합 엔드포인트 /api/user-actions)

> 주문은 통합 엔드포인트 `/api/user-actions` 의 `action: "order"` 로 처리합니다.
> 가격/상품명은 항상 **서버(DB)가 결정**합니다 — items에는 `{ "id", "quantity" }`만 보내면 되고, 클라이언트가 보낸 가격은 무시됩니다.

### 10.1 주문 생성 (바로구매 - items 지정)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "order",
  "items": [
    { "id": 1, "quantity": 1 }
  ]
}
```
응답: `201 { "message": "주문 완료", "order": { "id": "ORD-yyyymmdd-XXXX", "totalPrice": 129000, "discount": 0, "finalPrice": 129000, "status": "PAID" }, "items": [{ "orderId": "...", "productId": 1, "name": "...", "price": 129000, "quantity": 1 }] }`

### 10.2 주문 생성 (서버 장바구니 전체 주문 - items 생략)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "order"
}
```
응답: `201` — 서버 장바구니의 전체 항목을 주문하고 **장바구니를 비움** (장바구니가 비어 있으면 `400 { "code": "EMPTY_ORDER" }`)

### 10.3 주문 생성 (쿠폰 + 배송지 포함)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "order",
  "items": [
    { "id": 1, "quantity": 1 }
  ],
  "couponCode": "WELCOME10",
  "shipping": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "address": "서울시 강남구",
    "memo": "문 앞에 놓아주세요"
  }
}
```
응답: `201` — `order.discount`에 할인액, `order.finalPrice`에 최종 금액 반영 (쿠폰 오류 시 주문 실패: `404 COUPON_NOT_FOUND` / `400 COUPON_EXPIRED` / `400 MIN_ORDER_NOT_MET`)

### 10.4 주문 생성 - 인증 없음 (401)
```http
POST {{baseUrl}}/api/user-actions
Content-Type: application/json

{
  "action": "order",
  "items": []
}
```

### 10.5 주문 생성 - 재고 부족 (409)
> 씨드 재고는 상품마다 5~30 범위입니다. 409를 재현하려면 재고를 동적으로 초과합니다: (a) `GET /api/inventory?productId=<id>`로 현재 재고를 조회한 뒤 `stock + 1` 수량으로 주문하거나, (b) 관리자 `PUT /api/admin`으로 해당 상품 재고를 0으로 낮춘 뒤 주문합니다.
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "order",
  "items": [
    { "id": 1, "quantity": 99999 }
  ]
}
```
응답: `409 { "code": "INSUFFICIENT_STOCK", "productId": 1, "requestedQuantity": 99999, "availableStock": <현재 재고>, ... }`

### 10.6 주문 생성 - 주문 차단 상품 (422, 의도적 오류: 상품 3, 4)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "order",
  "items": [
    { "id": 3, "quantity": 1 }
  ]
}
```
응답: `422 { "code": "ORDER_BLOCKED_PRODUCT", ... }` (상품 3·4는 주문 차단 픽스처 — 차단 판정이 재고 검증보다 먼저 수행됨)

---

## 11. 데이터 초기화 API

### 11.1 전체 데이터 초기화 (테스트 사전조건 세팅용)

모든 상태는 Postgres(DB)에 저장되므로 **서버 재시작으로는 초기화되지 않습니다**. 초기화는 이 API로 수행합니다 (전체 테이블 TRUNCATE 후 시드 복원 — 가입 계정/주문/리뷰/장바구니 등 전부 시드 상태로 되돌아감).

```http
POST {{baseUrl}}/api/reset
```
응답: `200 { "message": "모든 데이터가 초기화되었습니다", "reset": [...] }` — `reset` 배열은 9개(`products, users, reviews, wishlists, carts, orders, coupons, payments, user_coupons`)입니다. 배열 원소/순서를 `toEqual`로 강하게 단언하기보다 `status 200` + `message` 위주로 검증하세요.

---

## 12. 회원가입 API

> 가입한 계정은 즉시 `POST /api/login`으로 로그인할 수 있습니다 (role: USER).

### 12.1 회원가입 (성공 - 201)
```http
POST {{baseUrl}}/api/signup
Content-Type: application/json

{
  "username": "newuser1",
  "password": "password1",
  "email": "new@example.com"
}
```
응답: `201 { "message": "회원가입이 완료되었습니다", "user": { "username": "newuser1", "role": "USER" } }` (email은 선택 입력)

### 12.2 아이디 사용 가능 여부 확인 (GET)
```http
GET {{baseUrl}}/api/signup?username=newuser1
```
응답: `200 { "username": "newuser1", "available": true }` (형식 오류면 `400 INVALID_USERNAME`)

### 12.3 회원가입 - 아이디 형식 오류 (400)
```http
POST {{baseUrl}}/api/signup
Content-Type: application/json

{
  "username": "AB",
  "password": "password1"
}
```
응답: `400 { "code": "INVALID_USERNAME" }` (영문 소문자+숫자 4~12자)

### 12.4 회원가입 - 비밀번호 정책 위반 (400)
```http
POST {{baseUrl}}/api/signup
Content-Type: application/json

{
  "username": "newuser2",
  "password": "ab"
}
```
응답: `400 { "code": "INVALID_PASSWORD" }` (4자 이상, 조합 무관)

### 12.5 회원가입 - 이메일 형식 오류 (400)
```http
POST {{baseUrl}}/api/signup
Content-Type: application/json

{
  "username": "newuser2",
  "password": "password1",
  "email": "not-an-email"
}
```
응답: `400 { "code": "INVALID_EMAIL" }`

### 12.6 회원가입 - 중복 아이디 (409)
```http
POST {{baseUrl}}/api/signup
Content-Type: application/json

{
  "username": "test",
  "password": "password1"
}
```
응답: `409 { "code": "USERNAME_TAKEN" }`

---

## 13. 쿠폰 API

> 시드 쿠폰 4종: `WELCOME10`(10%, 최대 할인 20,000원), `SAVE5000`(5,000원 정액, 최소주문 30,000원), `VIP20`(20%, 최소주문 100,000원, 최대 할인 50,000원), `EXPIRED10`(만료 — 의도적 픽스처). 인증 불필요.

### 13.1 쿠폰 검증 - WELCOME10 (200)
```http
POST {{baseUrl}}/api/coupons
Content-Type: application/json

{
  "code": "WELCOME10",
  "orderAmount": 100000
}
```
응답: `200 { "valid": true, "code": "WELCOME10", "type": "percent", "amount": 10, "discount": 10000, "finalAmount": 90000 }` (orderAmount 500000이면 최대 한도가 적용되어 discount 20000)

### 13.2 쿠폰 검증 - SAVE5000 (200)
```http
POST {{baseUrl}}/api/coupons
Content-Type: application/json

{
  "code": "SAVE5000",
  "orderAmount": 50000
}
```
응답: `200 { "valid": true, "type": "fixed", "discount": 5000, "finalAmount": 45000, ... }`

### 13.3 쿠폰 검증 - 최소주문금액 미달 (400)
```http
POST {{baseUrl}}/api/coupons
Content-Type: application/json

{
  "code": "VIP20",
  "orderAmount": 50000
}
```
응답: `400 { "code": "MIN_ORDER_NOT_MET" }` (VIP20은 최소주문 100,000원)

### 13.4 쿠폰 검증 - 만료된 쿠폰 (400, 의도적 픽스처)
```http
POST {{baseUrl}}/api/coupons
Content-Type: application/json

{
  "code": "EXPIRED10",
  "orderAmount": 50000
}
```
응답: `400 { "code": "COUPON_EXPIRED" }`

### 13.5 쿠폰 검증 - 존재하지 않는 쿠폰 (404)
```http
POST {{baseUrl}}/api/coupons
Content-Type: application/json

{
  "code": "NOSUCHCODE",
  "orderAmount": 50000
}
```
응답: `404 { "code": "COUPON_NOT_FOUND" }`

### 13.6 쿠폰 검증 - 잘못된 주문 금액 (400)
```http
POST {{baseUrl}}/api/coupons
Content-Type: application/json

{
  "code": "WELCOME10",
  "orderAmount": 0
}
```
응답: `400 { "code": "INVALID_AMOUNT" }`

---

## 14. 주문 내역 API

> 모두 인증 필요. 일반 사용자는 본인 주문만, 관리자는 전체 주문(+ `username` 포함)을 조회합니다.

### 14.1 내 주문 목록 조회
```http
GET {{baseUrl}}/api/orders
Authorization: Bearer {{token}}
```
응답: `200 { "count": n, "orders": [{ "id": "ORD-yyyymmdd-XXXX", "status": "PAID", "totalPrice": ..., "discount": ..., "finalPrice": ..., "couponCode": ..., "createdAt": ..., "items": [...] }] }`

### 14.2 주문 상세 조회
```http
GET {{baseUrl}}/api/orders/ORD-20260704-AB12
Authorization: Bearer {{token}}
```
응답: `200 { "order": { ..., "shipping": { "name", "phone", "address", "memo" }, "items": [...] } }`

### 14.3 주문 상세 - 없는 주문/타인 주문 (404)
```http
GET {{baseUrl}}/api/orders/ORD-19700101-XXXX
Authorization: Bearer {{token}}
```
응답: `404 { "code": "ORDER_NOT_FOUND" }` (타인 주문도 존재 여부를 숨기기 위해 404)

### 14.4 주문 취소
```http
PATCH {{baseUrl}}/api/orders/ORD-20260704-AB12
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "cancel"
}
```
응답: `200 { "message": "주문이 취소되었습니다", "order": { "status": "CANCELED", ... } }` — 주문 상품 **재고가 원복**됨 (`/api/inventory`로 확인 가능)

### 14.5 주문 취소 - 이미 취소된 주문 (409)
```http
PATCH {{baseUrl}}/api/orders/ORD-20260704-AB12
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "cancel"
}
```
응답: `409 { "code": "ALREADY_CANCELED" }`

---

## 15. 결제 API (payment)

> 모의 PG(이니시스 스타일). 인증 필요. 결과는 **카드번호 뒤 4자리** 또는 `?simulate=` 쿼리로 결정론적으로 정해집니다. `paymentKey`는 `PAY-<uuid>` 형태이며, 결과는 카드/simulate로만 정해지므로 `status`/`code`로 검증합니다. **외부 API 목킹 연습**: 9999 카드/`?simulate=`로 결제서버 장애를 재현하고 클라이언트 실패 처리를 검증.

### 15.1 결제 승인 (뒤 4자리 0000 → 201)
```http
POST {{baseUrl}}/api/payment
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "cardNumber": "4000-1234-5678-0000",
  "cardExpiry": "12/28",
  "cardCvc": "123",
  "amount": 129000,
  "orderName": "테스트 주문"
}
```
응답: `201 { "paymentKey": "PAY-...", "status": "DONE", "method": "CARD", "cardLast4": "0000", "amount": 129000 }`

### 15.2 결제 거절 (뒤 4자리 0001 → 402)
```http
POST {{baseUrl}}/api/payment
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "cardNumber": "4000000000000001",
  "amount": 10000
}
```
응답: `402 { "code": "PAYMENT_DECLINED" }`

### 15.3 결제 한도초과 (뒤 4자리 0002 → 402)
```http
POST {{baseUrl}}/api/payment
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "cardNumber": "4000000000000002",
  "amount": 10000
}
```
응답: `402 { "code": "PAYMENT_LIMIT_EXCEEDED" }`

### 15.4 결제서버 타임아웃 (뒤 4자리 9999 → 504, 약 500ms 지연)
```http
POST {{baseUrl}}/api/payment
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "cardNumber": "4000000000009999",
  "amount": 10000
}
```
응답: `504 { "code": "PAYMENT_GATEWAY_TIMEOUT" }` — 외부 PG 무응답 시뮬레이션(짧은 지연 후 응답)

### 15.5 폴트 주입 - 강제 거절 (?simulate=decline)
```http
POST {{baseUrl}}/api/payment?simulate=decline
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "cardNumber": "4000000000000000",
  "amount": 10000
}
```
응답: `402 { "code": "PAYMENT_DECLINED" }` — 카드와 무관하게 결과 강제 (`limit`→402 `PAYMENT_LIMIT_EXCEEDED`, `timeout`→504 `PAYMENT_GATEWAY_TIMEOUT`, `error`→500 `PAYMENT_ERROR`)

### 15.6 결제 오류 강제 (?simulate=error → 500)
```http
POST {{baseUrl}}/api/payment?simulate=error
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "cardNumber": "4000000000000000",
  "amount": 10000
}
```
응답: `500 { "code": "PAYMENT_ERROR" }`

### 15.7 잘못된 카드번호 (400)
```http
POST {{baseUrl}}/api/payment
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "cardNumber": "1234",
  "amount": 10000
}
```
응답: `400 { "code": "INVALID_CARD" }` (공백/하이픈 제거 후 숫자 12~19자리가 아니면). 금액이 양의 정수가 아니면 `400 { "code": "INVALID_AMOUNT" }`

### 15.8 결제 사후검증 (GET ?paymentKey=)
```http
GET {{baseUrl}}/api/payment?paymentKey=PAY-xxxxxxxx
Authorization: Bearer {{token}}
```
응답: `200 { "id": "PAY-...", "orderId": null, "username": "...", "method": "CARD", "cardLast4": "0000", "amount": 129000, "status": "DONE", "fault": null, "createdAt": "..." }` (없는 키 → `404 { "code": "PAYMENT_NOT_FOUND" }`, 키 누락 → `400 { "code": "PAYMENT_KEY_REQUIRED" }`)

### 15.9 결제 → 주문 연동 (paymentKey 전달)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "order",
  "items": [
    { "id": 1, "quantity": 1 }
  ],
  "paymentKey": "PAY-xxxxxxxx"
}
```
응답: `201` — 결제 **상태 DONE + 금액 일치 + 미사용** 검증 후 주문에 `paymentKey/paymentMethod/cardLast4` 저장. 위반 시: 결제 없음 `402 PAYMENT_REQUIRED`, 미승인/금액불일치/중복사용 `402 PAYMENT_INVALID`. `paymentKey` 생략 시 결제 없이 주문 성공.

---

## 16. 파일 업로드 API (upload)

> 인증 필요. 실제 저장 없이 data URL 이미지의 **형식/용량만 검증하고 에코**하는 모의 엔드포인트.

### 16.1 이미지 업로드 (201)
```http
POST {{baseUrl}}/api/upload
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "kind": "review",
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
}
```
응답: `201 { "url": "data:image/png;base64,...", "kind": "review" }` (검증 통과한 data URL 을 그대로 에코)

### 16.2 잘못된 파일 형식 (400)
```http
POST {{baseUrl}}/api/upload
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "kind": "avatar",
  "image": "data:text/plain;base64,aGVsbG8="
}
```
응답: `400 { "code": "INVALID_FILE_TYPE" }` (허용: `data:image/png|jpeg|webp|gif;base64,...`)

### 16.3 잘못된 kind (400)
```http
POST {{baseUrl}}/api/upload
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "kind": "banner",
  "image": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```
응답: `400 { "code": "INVALID_KIND", "availableKinds": ["review", "avatar"] }`

### 16.4 용량 초과 (413, 2MB 초과)
```http
POST {{baseUrl}}/api/upload
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "kind": "review",
  "image": "data:image/png;base64,<2MB 초과 base64>"
}
```
응답: `413 { "code": "FILE_TOO_LARGE" }`

### 16.5 아바타 설정 (set_avatar)
```http
POST {{baseUrl}}/api/user-actions
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "set_avatar",
  "image": "data:image/png;base64,iVBORw0KGgoAAA..."
}
```
응답: `200 { "message": "프로필 이미지가 변경되었습니다", "avatarUrl": "data:image/png;base64,..." }` (조회: `GET /api/user-actions?type=profile` → `{ "username", "role", "email", "avatarUrl", "defaultAddress" }`)

### 16.6 리뷰 이미지 첨부 (images[])
```http
POST {{baseUrl}}/api/reviews
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "productId": 5,
  "rating": 5,
  "comment": "사진 첨부 리뷰 테스트입니다",
  "images": ["data:image/png;base64,iVBORw0KGgoAAA...", "https://example.com/photo.jpg"]
}
```
응답: `201` — `images` 최대 3개, 각 항목은 data URL 이미지 또는 http(s) URL. 초과/무효 항목 → `400 { "code": "INVALID_REVIEW_IMAGE" }`. `GET /api/reviews` 는 `images[]` 를 반환.

---

## 17. 배송 상태 전진/지정 API (orders advance · set_status)

> 인증 필요. 상태 흐름: **PAID → PREPARING → SHIPPING → DELIVERED** (+ CANCELED). `SHIPPING` 진입 시 운송장 `MC`+10자리 부여(결정론적).

### 17.1 상태 전진 (advance)
```http
PATCH {{baseUrl}}/api/orders/ORD-20260705-AB12
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "advance"
}
```
응답: `200 { "message": "주문 상태가 변경되었습니다: PREPARING", "order": { "status": "PREPARING", ... } }` (SHIPPING 진입 시 `order.trackingNumber`가 `MC##########` 형태로 채워짐)

### 17.2 종료 상태에서 전진 (409 INVALID_TRANSITION)
```http
PATCH {{baseUrl}}/api/orders/ORD-20260705-AB12
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "advance"
}
```
응답: `409 { "code": "INVALID_TRANSITION", "currentStatus": "DELIVERED" }` (DELIVERED/CANCELED 등 종료 상태에서 전진 시도)

### 17.3 상태 명시 지정 (관리자 전용, set_status)
```http
PATCH {{baseUrl}}/api/orders/ORD-20260705-AB12
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "action": "set_status",
  "status": "DELIVERED"
}
```
응답: `200 { "message": "주문 상태가 변경되었습니다: DELIVERED", "order": { ... } }` (비관리자 → `403 { "code": "AUTH_FORBIDDEN" }`, 허용되지 않은 상태 → `400 { "code": "INVALID_STATUS" }`)

---

## 18. 배송 추적 API (tracking)

> 모의 택배 API. `?trackingNumber=` 경로는 **공개**(단, 해당 송장의 주문이 존재해야 함), `?orderId=` 경로는 **인증 필요**(본인 주문만, 관리자는 전체). **외부 API 목킹 연습** 대상.

### 18.1 송장번호로 조회 (공개)
```http
GET {{baseUrl}}/api/tracking?trackingNumber=MC1234567890
```
응답: `200 { "trackingNumber": "MC1234567890", "status": "SHIPPING", "events": [{ "status": "PAID", "label": "결제완료", "at": "...", "location": "온라인" }, ...] }` (events 는 주문 상태·주문시각 기반 결정론적 타임라인)

### 18.2 주문 ID로 조회 (인증)
```http
GET {{baseUrl}}/api/tracking?orderId=ORD-20260705-AB12
Authorization: Bearer {{token}}
```
응답: `200 { "trackingNumber", "status", "events" }` (본인 주문만; 없는/타인 주문 → `404 { "code": "TRACKING_NOT_FOUND" }`)

### 18.3 없는 송장번호 (404)
```http
GET {{baseUrl}}/api/tracking?trackingNumber=MC0000000000
```
응답: `404 { "code": "TRACKING_NOT_FOUND" }`

### 18.4 파라미터 누락 (400)
```http
GET {{baseUrl}}/api/tracking
```
응답: `400 { "code": "TRACKING_QUERY_REQUIRED" }`

---

## 테스트 시나리오

### 시나리오 1: 일반 사용자 플로우
1. 회원가입 (`POST /api/signup`) 후 가입 계정으로 로그인 — 또는 시드 계정 로그인 (test/1234)
2. 상품 목록 조회
3. 상품 검색
4. 상품 상세 조회
5. 위시리스트 추가 (`POST /api/user-actions`, action: wishlist_add)
6. 리뷰 작성
7. 장바구니 담기 (`POST /api/user-actions`, action: cart_add) 후 조회 (`GET ?type=cart`)
8. 쿠폰 검증 (`POST /api/coupons`, WELCOME10)
9. 결제 (`POST /api/payment`, 카드 0000 → 201 DONE) 후 사후검증 (`GET /api/payment?paymentKey=`)
10. 주문 생성 (`POST /api/user-actions`, action: order — items 생략 시 장바구니 주문, couponCode/shipping/paymentKey 포함 가능)
11. 주문 목록/상세 확인 (`GET /api/orders`, `GET /api/orders/:id`)
12. 배송 상태 전진 (`PATCH /api/orders/:id`, action: advance — SHIPPING 진입 시 운송장 부여) 후 배송 추적 (`GET /api/tracking?trackingNumber=`)
13. 주문 취소 (`PATCH /api/orders/:id`, action: cancel) 후 재고 원복 확인 (`GET /api/inventory`)

### 시나리오 2: 관리자 플로우
1. 로그인 (admin/1234)
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
1. GET - 조회 (안전·멱등)
2. POST - 생성 (비멱등)
3. PATCH - 부분 수정 (이 앱에선 상태 전이/취소라 재호출 시 409가 날 수 있으므로 각 호출의 상태 코드를 개별로 검증)
4. DELETE - 삭제 (재삭제 시 404)
5. HEAD - 메타데이터만 (안전·멱등)

### 시나리오 5: 상태 코드 검증
1. 2xx - 성공
2. 3xx - 리다이렉트
3. 4xx - 클라이언트 오류
4. 5xx - 서버 오류
