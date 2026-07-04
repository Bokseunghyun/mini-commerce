# QA 자동화 테스트 가이드

이 문서는 Mini Commerce 데모 사이트의 QA 자동화 테스트를 위한 가이드입니다.

## 🗺️ 라우트 (전부 딥링크 가능)

`/`, `/login`, `/signup`, `/products`, `/product/:id`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/order-complete`, `/admin`

> **REQ-1 (의도적 제약):** 앱 진입 시 항상 로그아웃 상태로 초기화됩니다(진입 시 localStorage 토큰 제거).
> 따라서 어떤 딥링크로 진입하든 **직후에는 항상 비로그인 상태**이며, 로그인이 필요한 페이지는
> `orders-login-required` / `wishlist-login-required` 등의 안내를 표시합니다.

> **서버 장바구니 (계정 영속):** 장바구니·위시리스트·주문은 클라이언트 상태가 아니라 **서버 DB에 계정 단위로 저장**됩니다.
> 같은 계정으로 다른 브라우저에서 로그인해도 장바구니가 유지되며, localStorage 클리어로는 초기화되지 않습니다.
> 초기화가 필요하면 `POST /api/reset`(전체 시드 복원, 공유 환경 주의) 또는 `cart_update` 수량 0을 사용하세요.

## 📋 테스트 계정

### 일반 사용자
- **Username**: `test`
- **Password**: `1234`
- **Role**: `USER`

### 관리자
- **Username**: `admin`
- **Password**: `1234`
- **Role**: `ADMIN`

### 차단 계정 (negative 테스트용)
- **Username**: `test2`
- **Password**: `1234`
- **Status**: `BLOCKED` → 로그인 시 **403 Forbidden** 반환 (의도적 오류 케이스)

> 회원가입(`/signup`)으로 만든 계정도 로그인 가능합니다 (role: `USER`).
> `POST /api/reset` 실행 시 가입 계정·주문·리뷰가 모두 시드 상태로 복원됩니다.

---

## 🎯 주요 테스트 시나리오

### 1. 인증 테스트

#### 1.1 로그인 테스트
- **성공 케이스**
  - 올바른 계정 정보로 로그인
  - 로그인 후 토큰 저장 확인
  - 로그인 후 홈페이지로 리다이렉트

- **실패 케이스**
  - 잘못된 아이디/비밀번호
  - 빈 입력값
  - 네트워크 오류 시뮬레이션

#### 1.2 로그아웃 테스트
- 로그아웃 버튼 클릭 (`confirm()` 다이얼로그 발생)
- 토큰 삭제 확인
- 홈페이지로 리다이렉트

#### 1.3 회원가입 테스트 (`/signup`)
- **중복확인 플로우**
  - 기존 아이디(`test`)로 `#username-check-btn` 클릭 → `username-check-result`에 "이미 사용 중인 아이디입니다"
  - 새 아이디 → "사용 가능한 아이디입니다"
- **검증 에러 (필드별 `role=alert`)**
  - 아이디 형식 위반(영소문자+숫자 4~12자 아님) → `signup-username-error`
  - 비밀번호 8자 미만 또는 영문/숫자 미포함 → `signup-password-error`
  - 비밀번호 확인 불일치 → `password-confirm-error`
  - 이메일 형식 오류(이메일은 선택 입력) → `signup-email-error`
- **가입 성공 → 로그인**
  - `signup-success` 메시지(in-DOM) 표시 → 약 1초 뒤 `/login` 자동 이동
  - 새 계정으로 로그인 성공 확인
- **API negative**: 중복 아이디 409 `USERNAME_TAKEN` → `signup-error`에 표시

---

### 2. 상품 목록 테스트

#### 2.1 카테고리 필터링
- **전체**: 18개 상품 표시
- **전자기기**: 6개 상품 표시
- **액세서리**: 6개 상품 표시
- **생활**: 6개 상품 표시

#### 2.2 정렬 기능 (`#sort-select`)
- 기본순 (`default`)
- 낮은 가격순 (`price-asc`)
- 높은 가격순 (`price-desc`)
- 이름순 (`name`)
- 할인율순 (`discount`)

#### 2.3 검색 기능
- 상품명 검색
- 설명 검색
- 검색 결과 0개일 때 메시지 표시
- 검색어 초기화

#### 2.4 가격 필터 (`/products` 전용)
- `#min-price` / `#max-price` 입력 후 `apply-price-filter` 클릭
- 최소 > 최대 입력 → `price-filter-error` "최소 가격이 최대 가격보다 클 수 없습니다"
- 음수/숫자 아님 → `price-filter-error` 표시
- 적용 후 `search-result-count`로 결과 개수 검증
- `reset-price-filter`로 초기화

#### 2.5 품절 뱃지
- 씨드 기준 재고 0인 상품 **3, 8, 18**에 `soldout-badge-{id}` 표시 (홈/목록 공통)
- 주문/취소에 따라 재고가 실시간 반영되므로 공유 환경에서는 씨드 초기화(`POST /api/reset`) 후 검증 권장

---

### 3. 장바구니 테스트 (서버 장바구니)

> ⚠️ 장바구니는 **서버 DB에 계정 단위로 저장**됩니다(로그인 필수).
> localStorage에 장바구니가 저장된다는 전제의 기존 테스트는 모두 이 전제로 갱신해야 합니다.

#### 3.1 장바구니 담기 (비로그인)
- "장바구니 담기" 버튼 → 로그인 유도 `confirm()` 다이얼로그 (수락 시 로그인 페이지 이동)

#### 3.2 장바구니 담기 (로그인)
- 상품 추가 → 성공 시 `alert('장바구니에 상품이 추가되었습니다.')` (다이얼로그 처리 필요)
- API: `POST /api/user-actions` `{action:'cart_add', productId, quantity}` — 동일 상품 추가 시 수량 누적
- 장바구니 카운트(`cart-badge`) 업데이트

#### 3.3 장바구니 페이지 (`/cart`)
- 빈 장바구니 UI 표시 (`cart-empty`)
- 상품 목록 표시 — testid는 **productId 기준** (`cart-item-{productId}` 등)
- 수량 조절 (최소 1개, `cart_update` 절대값 / 0이면 삭제)
- 개별 상품 삭제 (`cart_remove`, 없는 상품이면 404 `NOT_IN_CART`)
- 총 금액 계산 (`cart-total`)
- "주문하기"(`#checkout-btn`)는 주문을 생성하지 않고 **`/checkout`으로 이동**

#### 3.4 장바구니 영속성 (연습 포인트)
- 같은 계정으로 **다른 브라우저/새 컨텍스트**에서 로그인해도 장바구니 유지 확인
- REQ-1 때문에 `storageState`로 로그인 상태 재사용은 불가 → **로그인 후 서버 상태 검증**으로 대체
- 테스트 간 격리: `POST /api/reset` 또는 `cart_update` 수량 0으로 비우기

---

### 4. 체크아웃 / 주문 테스트 (`/checkout`)

#### 4.1 체크아웃 진입
- 장바구니 `#checkout-btn` → `/checkout` 이동, 주문 상품 행 `checkout-item-{productId}` 표시
- 바로 구매: 상품 상세 `#buy-now-button` → 해당 상품 1건으로 `/checkout` 진입
- 장바구니 비어 있으면 `checkout-empty` 표시

#### 4.2 배송지 검증 에러
- 약관 체크 후 빈 값으로 결제 시도 → `checkout-name-error` / `checkout-phone-error` / `checkout-address-error`
- 휴대폰 형식 오류(예: `010-1234-5678` 형식 아님) → `checkout-phone-error`

#### 4.3 쿠폰 적용/실패
- `#coupon-code` 입력 + `coupon-apply-btn` → 결과는 `coupon-message`에 표시
- **실패(의도적)**: `EXPIRED10` → 400 `COUPON_EXPIRED` "만료된 쿠폰입니다"
- **성공**: `WELCOME10`(10%, 최대 2만) / `SAVE5000`(5천원, 최소주문 3만) / `VIP20`(20%, 최소 10만, 최대 5만)
- 적용 시 `checkout-discount`·`checkout-final` 갱신, `coupon-remove-btn`으로 해제
- 최소 주문금액 미달 → 400 `MIN_ORDER_NOT_MET`, 없는 코드 → 404 `COUPON_NOT_FOUND`

#### 4.4 약관 게이팅 → 주문 → 주문완료
- `#agree-terms` 체크 전 `#place-order-btn` **비활성(disabled)** 확인
- 결제수단 라디오(`#payment-card`/`#payment-bank`/`#payment-kakao`) 선택
- 결제 → 201 응답 → `/order-complete` 이동
- **주문번호 검증**: `order-complete-id`가 `ORD-yyyymmdd-XXXX`(대문자 영숫자 4자리) 형식
- 결제금액(`order-complete-amount`)이 `checkout-final`과 일치 — 가격은 **서버(DB)가 결정**, 클라이언트 가격 무시
- 서버 장바구니 주문 시 장바구니 자동 비움 확인

#### 4.5 주문 negative 케이스
- 상품 3/4 포함 주문 → 422 `ORDER_BLOCKED_PRODUCT` (의도적) → `checkout-error`
- 재고 0(상품 18) 주문 → 409 `INSUFFICIENT_STOCK` (의도적)
- 빈 주문 → 400 `EMPTY_ORDER`

---

### 4-1. 주문내역 테스트 (`/orders`)

- 비로그인 딥링크 → `orders-login-required`, 주문 없음 → `orders-empty`
- `order-item-{orderId}` 행 클릭 → `order-detail-{orderId}` 상세 확장 (배송지 포함)
- **취소 버튼(`order-cancel-{orderId}`)은 확장 후에만 노출**
- 취소 클릭 → `confirm('주문을 취소하시겠습니까?')` 다이얼로그 (리스너 없으면 자동 dismiss 주의)
- 수락 시 상태 전이: `order-status-{orderId}` `결제완료` → `취소됨` + `order-cancel-message` 표시 + **재고 복원**
- 이미 취소된 주문 재취소 → 409 `ALREADY_CANCELED`
- 관리자(admin)는 전체 주문 조회 가능, 타인 주문 상세 조회는 404

---

### 4-2. 위시리스트 테스트 (`/wishlist`)

- 홈/목록 카드의 하트 `wishlist-toggle-{id}` 클릭 → `aria-pressed` `false`→`true` 토글
- 비로그인 하트 클릭 → 로그인 유도 `confirm()`
- 페이지 확인: `#home-wishlist-btn` → `/wishlist` → `wishlist-item-{productId}` 표시
- `wishlist-add-to-cart-{productId}`로 장바구니 담기, `wishlist-remove-{productId}`로 삭제
- 전부 삭제 시 `wishlist-empty`, 비로그인 딥링크 시 `wishlist-login-required`
- API: `wishlist_add` 중복 시 409, `wishlist_remove` 없는 항목 404

---

### 4-3. 상품 상세 테스트 (`/product/:id`)

- **갤러리**: 이미지 3장 — `gallery-thumb-0..2` 클릭 시 `product-main-image`의 `src` 스왑
- **탭 전환**: `#tab-description` / `#tab-specs` / `#tab-shipping` / `#tab-reviews` — 활성 탭 패널(`tab-panel-*`)만 DOM에 존재
- **스펙**: `spec-row-{i}` 7~8행
- **재고 뱃지**: `stock-badge` = `품절`/`재고 부족`(5개 미만)/`재고 충분` — 품절 시 `#add-to-cart-button`·`#buy-now-button` disabled (상품 18로 검증)
- **리뷰 작성** (로그인 필요, 비로그인 시 `review-login-required`):
  - 별점 위젯 `star-input-1..5` 클릭 → `#review-comment` 10자 이상 → `#review-submit`
  - 결과는 alert가 아닌 **in-DOM `review-form-message`** ("리뷰가 등록되었습니다")
  - 등록 후 `rating-average` / `rating-bar-5..1` 평점 분포 자동 갱신
  - negative: 10자 미만 → 400 `COMMENT_TOO_SHORT`, 같은 상품 중복 작성 → 409 `REVIEW_ALREADY_EXISTS`
- **리뷰 목록**: 정렬 `#review-sort`(latest/rating), 더보기 `review-load-more`, 항목 `review-item-{id}`, 소유자/관리자만 수정·삭제

---

### 5. 관리자 페이지 테스트

#### 5.1 권한 검증
- **비로그인**: 401 에러 (토큰 없음)
- **일반 사용자 (test)**: 403 에러 (권한 없음)
- **관리자 (admin)**: 정상 접근

#### 5.2 상품 추가
- 필수 필드 검증 (상품명, 정가, 할인가)
- 카테고리 선택
- 할인가 < 정가 검증
- 추가 성공 시 목록 업데이트

#### 5.3 상품 수정
- 기존 정보 로드
- 필드 수정
- 저장 후 목록 업데이트

#### 5.4 상품 삭제
- 삭제 확인 팝업
- 삭제 후 목록 업데이트

#### 5.5 상품 활성화/비활성화
- 상태 토글
- UI 업데이트

---

## 🔧 API 엔드포인트

### 인증 / 회원가입
- `POST /api/login` - 로그인
  ```json
  {
    "username": "test",
    "password": "1234"
  }
  ```
- `POST /api/signup` - 회원가입 (201 | 400 `INVALID_USERNAME`/`INVALID_PASSWORD`/`INVALID_EMAIL` | 409 `USERNAME_TAKEN`)
  ```json
  { "username": "qauser01", "password": "password1", "email": "qa@example.com" }
  ```
- `GET /api/signup?username=x` - 아이디 중복확인 (응답: `{ "username", "available" }`)

### 상품 / 검색 / 재고
- `GET /api/products[?category=]` - 상품 목록 조회 (18개+)
- `GET /api/products/:id` - 상품 상세 조회 (3, 4 → 500 / 16 → 404 의도적 오류)
- `GET /api/search?q=&category=&minPrice=&maxPrice=&sort=` - 검색 (sort: `price-asc`|`price-desc`|`name`|`discount`)
- `GET|HEAD /api/inventory?productId=` - 재고 조회 (`X-Stock-Count`/`ETag` 헤더, 주문/취소 시 실시간 반영)

### 사용자 액션 통합 API (구 cart/order/wishlist)
> ⚠️ `/api/cart`, `/api/order`, `/api/wishlist` 는 삭제되었습니다 (호출 시 404).
> 모두 `/api/user-actions` 하나로 통합되었으며 body의 `action` 필드로 분기합니다.
> 상세 이력은 [API_CONSOLIDATION.md](API_CONSOLIDATION.md) 참고. 인증(Bearer 토큰) 필수.
> **장바구니/위시리스트/주문은 모두 서버 DB에 계정 단위로 저장**됩니다.

- `POST /api/user-actions` - 장바구니
  ```json
  { "action": "cart_add", "productId": 1, "quantity": 2 }
  ```
  ```json
  { "action": "cart_update", "productId": 1, "quantity": 3 }
  ```
  ```json
  { "action": "cart_remove", "productId": 1 }
  ```
  - `cart_add`: 수량 누적 / `cart_update`: 절대값(0 = 삭제) / `cart_remove`: 없는 상품이면 404 `NOT_IN_CART`
- `POST /api/user-actions` - 주문 생성 (201 | 재고 부족 409 `INSUFFICIENT_STOCK` | 상품 3/4 포함 422 `ORDER_BLOCKED_PRODUCT` | 빈 주문 400 `EMPTY_ORDER`)
  ```json
  {
    "action": "order",
    "items": [{ "id": 1, "quantity": 2 }],
    "couponCode": "WELCOME10",
    "shipping": { "name": "홍길동", "phone": "010-1234-5678", "address": "서울시 ...", "memo": "" }
  }
  ```
  - `items` 생략 시 **서버 장바구니 전체 주문 + 장바구니 비움**
  - 가격은 서버(DB)가 결정 — 클라이언트가 보낸 가격은 무시됨
  - 응답(201): `{ "order": { "id": "ORD-yyyymmdd-XXXX", "totalPrice", "discount", "finalPrice", "status": "PAID" }, "items": [...] }`
- `POST /api/user-actions` - 위시리스트 추가 (201, 중복 409) / 삭제 (200, 없으면 404)
  ```json
  { "action": "wishlist_add", "productId": 1 }
  ```
  ```json
  { "action": "wishlist_remove", "productId": 1 }
  ```
- `GET /api/user-actions?type=cart` - 장바구니 조회 (응답: `{ "count", "items": [{ "productId", "name", "price", "imageUrl", "quantity", "stock" }], "totalPrice" }`)
- `GET /api/user-actions?type=wishlist` - 위시리스트 조회 (응답: `{ "count": n, "items": [...] }`)

### 쿠폰
- `POST /api/coupons` - 쿠폰 검증 `{ "code", "orderAmount" }`
  - 200 `{ valid, code, type, amount, discount, finalAmount }`
  - 404 `COUPON_NOT_FOUND` | 400 `COUPON_EXPIRED`(EXPIRED10, 의도적) | 400 `MIN_ORDER_NOT_MET` | 400 `INVALID_AMOUNT`
  - 쿠폰: `WELCOME10`(10%, 최대 2만) / `SAVE5000`(5천원, 최소 3만) / `VIP20`(20%, 최소 10만, 최대 5만) / `EXPIRED10`(만료)

### 리뷰
- `GET /api/reviews?productId=&sort=(latest|rating)&limit=&offset=` - 조회 (`count`는 전체 개수)
- `POST /api/reviews` (인증) `{ productId, rating, comment }` → 201 | 400 `COMMENT_TOO_SHORT`(10자) | 409 `REVIEW_ALREADY_EXISTS`
- `PATCH`/`DELETE /api/reviews` - 소유자 또는 admin만

### 주문 조회/취소
- `GET /api/orders` (인증) - 본인 주문 목록 (admin은 전체 + username)
- `GET /api/orders/:id` - 상세 (shipping 포함, 타인 주문은 404)
- `PATCH /api/orders/:id` `{ "action": "cancel" }` → 200 (재고 복원) | 409 `ALREADY_CANCELED`

### 초기화
- `POST /api/reset` - **DB 초기화** (모든 테이블 truncate 후 시드 재삽입 — 상품/계정/리뷰/위시리스트/장바구니/주문/쿠폰 전부 복원)
  ```json
  // 응답 (200)
  { "message": "모든 데이터가 초기화되었습니다", "reset": ["products", "users", "reviews", "wishlists", "carts", "orders", "coupons"] }
  ```
  > 공유 배포 환경에서는 **모든 사용자**의 데이터가 초기화되므로 주의해서 사용하세요.

### 관리자
- `GET /api/admin` - 상품 목록 조회 (관리자)
- `POST /api/admin` - 상품 추가
  ```json
  {
    "name": "새 상품",
    "category": "전자기기",
    "originalPrice": 100000,
    "discountedPrice": 80000,
    "discountRate": 20
  }
  ```
- `PUT /api/admin` - 상품 수정
  ```json
  {
    "id": 1,
    "name": "수정된 상품명",
    "originalPrice": 120000,
    "discountedPrice": 90000,
    "discountRate": 25
  }
  ```
- `DELETE /api/admin` - 상품 삭제
  ```json
  {
    "id": 1
  }
  ```

---

## 🏷️ 주요 Test ID / Selector

### 홈페이지
- `[data-testid="home-page"]` - 홈페이지 컨테이너
- `[data-testid="logo"]` - 로고 (클릭 시 홈으로)
- `[data-testid="search-input"]` - 검색 입력창
- `[data-testid="search-button"]` - 검색 버튼
- `[data-testid="cart-button"]` (= `#home-cart-btn`) - 장바구니 버튼
- `[data-testid="cart-badge"]` - 장바구니 카운트
- `[data-testid="signup-button"]` (= `#home-signup-btn`) - 회원가입 버튼 (비로그인 시에만)
- `[data-testid="wishlist-button"]` (= `#home-wishlist-btn`) - 위시리스트 버튼 (로그인 시에만)
- `[data-testid="orders-button"]` (= `#home-orders-btn`) - 주문내역 버튼 (로그인 시에만)
- `[data-testid="admin-button"]` (= `#home-admin-btn`) - 관리자 버튼 (**항상 표시**, 권한 체크는 클릭 후 발생 — 의도적)
- `[data-testid="logout-button"]` (= `#home-logout`) - 로그아웃 버튼
- `[data-testid="login-button"]` (= `#home-login`) - 로그인 버튼
- `[data-testid="category-전체"]` - 전체 카테고리
- `[data-testid="category-전자기기"]` - 전자기기 카테고리
- `[data-testid="category-액세서리"]` - 액세서리 카테고리
- `[data-testid="category-생활"]` - 생활 카테고리
- `[data-testid="sort-select"]` (= `#sort-select`) - 정렬 셀렉트
- `[data-testid="product-card-{id}"]` - 상품 카드
- `[data-testid="wishlist-toggle-{id}"]` - 위시리스트 하트 토글 (`aria-pressed`)
- `[data-testid="soldout-badge-{id}"]` - 품절 뱃지 (씨드 기준 3/8/18)
- `[data-testid="view-detail-btn-{id}"]` - 상품 상세보기
- `[data-testid="add-to-cart-btn-{id}"]` - 장바구니 담기

### 로그인 페이지
- `[data-testid="login-page"]` - 로그인 페이지
- `[data-testid="username-input"]` (= `#login-username`) - 아이디 입력
- `[data-testid="password-input"]` (= `#login-password`) - 비밀번호 입력
- `[data-testid="login-submit-button"]` (= `#login-submit`) - 로그인 버튼
- `[data-testid="login-error"]` (= `#login-error`) - 로그인 에러 메시지

### 회원가입 페이지 (`/signup`)
- `#signup-username` - 아이디 입력
- `#username-check-btn` - 중복확인 버튼
- `[data-testid="username-check-result"]` - 중복확인 결과
- `#signup-password` / `#signup-password-confirm` / `#signup-email` - 비밀번호 / 확인 / 이메일(선택)
- `[data-testid="signup-username-error"]` / `[data-testid="signup-password-error"]` / `[data-testid="password-confirm-error"]` / `[data-testid="signup-email-error"]` - 필드별 에러 (`role=alert`)
- `#signup-submit` (data-testid: `signup-submit-button`) - 가입 버튼
- `[data-testid="signup-error"]` / `[data-testid="signup-success"]` - API 에러 / 성공 메시지

### 장바구니 페이지 (`/cart`, 서버 장바구니)
- `#cart-page` - 장바구니 페이지
- `[data-testid="cart-item-{productId}"]` - 장바구니 항목 (**productId 기준**)
- `[data-testid="cart-increase-{productId}"]` - 수량 증가
- `[data-testid="cart-decrease-{productId}"]` - 수량 감소
- `[data-testid="cart-qty-{productId}"]` - 수량 표시
- `[data-testid="cart-subtotal-{productId}"]` - 상품별 소계
- `[data-testid="cart-remove-{productId}"]` - 상품 삭제
- `[data-testid="cart-soldout-{productId}"]` - 품절 표시
- `#select-all-checkbox` - 전체 선택
- `[data-testid="cart-total"]` - 총 금액
- `[data-testid="checkout-button"]` (= `#checkout-btn`) - 주문하기 (**`/checkout`으로 이동**, 주문 생성 아님)
- `[data-testid="cart-empty"]` - 빈 장바구니 표시

### 체크아웃 페이지 (`/checkout`)
- `[data-testid="checkout-item-{productId}"]` - 주문 상품 행
- `#checkout-name` / `#checkout-phone` / `#checkout-address` / `#checkout-memo` - 배송지 입력
- `[data-testid="checkout-name-error"]` / `[data-testid="checkout-phone-error"]` / `[data-testid="checkout-address-error"]` - 배송지 검증 에러
- `#coupon-code` - 쿠폰 코드 입력
- `[data-testid="coupon-apply-btn"]` / `[data-testid="coupon-message"]` / `[data-testid="coupon-remove-btn"]` - 쿠폰 적용/결과/해제
- `#payment-card` / `#payment-bank` / `#payment-kakao` - 결제수단 라디오
- `#agree-terms` - 약관 동의 체크박스 (체크 전 결제 버튼 비활성)
- `#place-order-btn` - 결제 버튼
- `[data-testid="checkout-subtotal"]` / `[data-testid="checkout-discount"]` / `[data-testid="checkout-final"]` - 금액 요약
- `[data-testid="checkout-error"]` / `[data-testid="checkout-empty"]` - 주문 실패 에러 / 빈 장바구니

### 주문내역 페이지 (`/orders`)
- `[data-testid="order-item-{orderId}"]` - 주문 행 (클릭 = 상세 확장 토글)
- `[data-testid="order-detail-{orderId}"]` - 확장된 상세 영역 (배송지 포함)
- `[data-testid="order-cancel-{orderId}"]` - 취소 버튼 (**확장 후에만 노출**, `confirm()` 발생)
- `[data-testid="order-status-{orderId}"]` - 상태 뱃지 (`결제완료`/`취소됨`, `data-status` 속성)
- `[data-testid="order-cancel-message"]` - 취소 결과 메시지
- `[data-testid="orders-empty"]` / `[data-testid="orders-login-required"]` - 빈 목록 / 로그인 필요

### 위시리스트 페이지 (`/wishlist`)
- `[data-testid="wishlist-item-{productId}"]` - 위시리스트 행
- `[data-testid="wishlist-add-to-cart-{productId}"]` - 장바구니 담기
- `[data-testid="wishlist-remove-{productId}"]` - 삭제
- `[data-testid="wishlist-empty"]` / `[data-testid="wishlist-login-required"]` - 빈 목록 / 로그인 필요

### 상품 상세 페이지 (`/product/:id`)
- `[data-testid="product-main-image"]` - 메인 이미지
- `[data-testid="gallery-thumb-0"]` ~ `gallery-thumb-2` - 갤러리 썸네일 (`aria-pressed`)
- `#tab-description` / `#tab-specs` / `#tab-shipping` / `#tab-reviews` - 탭 버튼
- `[data-testid="tab-panel-description"]` 등 `tab-panel-*` - 탭 패널 (활성 탭만 DOM에 존재)
- `[data-testid="spec-row-{i}"]` - 스펙 행 (7~8행)
- `[data-testid="stock-badge"]` - 재고 뱃지 (`품절`/`재고 부족`/`재고 충분`)
- `#add-to-cart-button` / `#buy-now-button` - 장바구니/바로구매 (품절 시 둘 다 disabled)
- `[data-testid="rating-average"]` / `[data-testid="rating-bar-5"]` ~ `rating-bar-1` - 평점 요약/분포
- `[data-testid="star-input-1"]` ~ `star-input-5` - 리뷰 별점 위젯
- `#review-comment` / `#review-submit` - 리뷰 코멘트(10자 이상) / 등록
- `[data-testid="review-form-message"]` - 리뷰 등록 결과 (in-DOM, alert 아님)
- `#review-sort` (`latest`/`rating`) / `[data-testid="review-load-more"]` / `[data-testid="review-item-{id}"]` - 정렬/더보기/리뷰 항목

### 상품 목록 페이지 (`/products`)
- `#sort-select` - 정렬 (`default`/`price-asc`/`price-desc`/`name`/`discount`)
- `#min-price` / `#max-price` - 가격 필터 입력
- `[data-testid="apply-price-filter"]` / `[data-testid="reset-price-filter"]` - 필터 적용/초기화
- `[data-testid="price-filter-error"]` - 필터 검증 에러
- `[data-testid="search-result-count"]` - 검색/필터 결과 개수
- 상품 카드/하트/품절 뱃지는 홈과 동일 (`product-card-{id}`, `wishlist-toggle-{id}`, `soldout-badge-{id}` 등)

### 주문완료 페이지 (`/order-complete`)
- `[data-testid="order-complete-id"]` - 주문번호 (`ORD-yyyymmdd-XXXX`)
- `[data-testid="order-complete-amount"]` - 결제금액
- `[data-testid="go-orders-btn"]` - 주문내역 보기 버튼

### 관리자 페이지 (`/admin`)
- `[data-testid="admin-row-{id}"]` - 상품 행
- `[data-testid="edit-btn-{id}"]` - 수정 버튼
- `[data-testid="toggle-btn-{id}"]` - 활성화/비활성화
- `[data-testid="delete-btn-{id}"]` - 삭제 버튼

---

## 🐛 예상 에러 케이스

### 1. 인증 에러
- `AUTH_NO_TOKEN` (401) - 토큰이 없을 때
- `AUTH_INVALID_TOKEN` (401) - 토큰이 유효하지 않을 때
- `AUTH_FORBIDDEN` (403) - 권한이 없을 때

### 2. 상품 에러
- 존재하지 않는 상품 조회 (404)
- 상품 3, 4 상세 조회 → 500 / 상품 16 → 404 (의도적)
- 가격이 0원인 상품 장바구니 담기 (클라이언트 알림)

### 3. 주문/쿠폰/리뷰 에러 (의도적 케이스 포함)
- 상품 3/4 포함 주문 → 422 `ORDER_BLOCKED_PRODUCT`
- 재고 부족(상품 18 재고 0) → 409 `INSUFFICIENT_STOCK`
- 빈 주문 → 400 `EMPTY_ORDER`
- 이미 취소된 주문 재취소 → 409 `ALREADY_CANCELED`
- 만료 쿠폰 `EXPIRED10` → 400 `COUPON_EXPIRED` / 최소 주문금액 미달 → 400 `MIN_ORDER_NOT_MET` / 없는 쿠폰 → 404 `COUPON_NOT_FOUND`
- 리뷰 10자 미만 → 400 `COMMENT_TOO_SHORT` / 중복 작성 → 409 `REVIEW_ALREADY_EXISTS`
- 회원가입 중복 아이디 → 409 `USERNAME_TAKEN` / 형식 오류 → 400 `INVALID_USERNAME`/`INVALID_PASSWORD`/`INVALID_EMAIL`

### 4. 관리자 에러
- 필수 필드 누락 (400)
- 할인가 > 정가 (400)
- 존재하지 않는 상품 수정/삭제 (404)

---

## 💡 자동화 테스트 팁

### 1. 테스트 순서
1. 로그인/회원가입 테스트 (인증 토큰 획득)
2. 상품 목록 테스트 (정렬/가격 필터/품절 뱃지)
3. 상품 상세 테스트 (갤러리/탭/리뷰)
4. 장바구니 테스트 (서버 장바구니)
5. 체크아웃/주문 테스트 (쿠폰/약관/주문완료)
6. 주문내역/위시리스트 테스트
7. 관리자 기능 테스트 (admin 계정)
8. 로그아웃 테스트

### 2. 데이터 초기화
- **localStorage/세션 클리어만으로는 초기화되지 않습니다** — 장바구니·위시리스트·주문·리뷰·가입 계정은 서버 DB에 저장됩니다
- 서버 데이터 초기화: `POST /api/reset` (모든 데이터 시드 복원 — 공유 배포 환경에서는 다른 사용자에게도 영향)
- 개별 정리: `cart_update` 수량 0(장바구니), `wishlist_remove`, 주문 취소, 리뷰 삭제
- REQ-1 덕분에 앱 진입 시 토큰은 자동 제거되므로 로그인 상태 클리어는 별도로 필요 없음

### 3. 대기 시간
- API 응답 대기 (네트워크 지연 고려)
- UI 렌더링 대기
- 애니메이션 완료 대기

### 4. 스크린샷
- 에러 발생 시 자동 스크린샷
- 주요 단계별 스크린샷
- 비교 테스트용 기준 스크린샷

---

## 📊 테스트 체크리스트

### UI 테스트
- [ ] 로고 클릭 시 홈으로 이동
- [ ] 카테고리별 상품 필터링
- [ ] 검색 기능
- [ ] 정렬 기능 (`#sort-select`)
- [ ] 가격 필터 (에러 케이스 포함, `/products`)
- [ ] 품절 뱃지 (상품 3/8/18) 및 상세 페이지 버튼 disabled
- [ ] 회원가입 (중복확인 → 검증 에러 → 가입 → 로그인)
- [ ] 체크아웃 (배송지 검증 → 쿠폰 → 약관 게이팅 → 주문완료 주문번호)
- [ ] 주문내역 (행 확장 → 취소 confirm → 상태 전이)
- [ ] 위시리스트 (하트 토글 `aria-pressed` → 페이지 확인 → 삭제)
- [ ] 상품 상세 (갤러리 스왑, 탭 전환, 리뷰 작성 → 평점 분포 갱신)
- [ ] 장바구니 뱃지 카운트
- [ ] 서버 장바구니 영속성 (다른 브라우저에서 로그인 후 유지 확인)
- [ ] 빈 상태 UI (검색 결과 없음, 장바구니/위시리스트/주문내역 비어있음)
- [ ] 반응형 레이아웃

### API 테스트
- [ ] 로그인 API (성공/실패/차단 계정 403)
- [ ] 회원가입 API (성공 201 / 검증 400 / 중복 409 / 중복확인 GET)
- [ ] 상품 목록/검색 조회
- [ ] 상품 상세 조회 (3, 4 → 500 / 16 → 404 포함)
- [ ] user-actions API (cart_add/cart_update/cart_remove / order / wishlist)
- [ ] 쿠폰 API (성공 / EXPIRED10 400 / MIN_ORDER_NOT_MET 400 / 404)
- [ ] 리뷰 API (작성/COMMENT_TOO_SHORT/REVIEW_ALREADY_EXISTS)
- [ ] 주문 조회/취소 API (취소 시 재고 복원, ALREADY_CANCELED 409)
- [ ] 재고 API (inventory, 주문/취소 후 실시간 반영)
- [ ] 관리자 CRUD API (DB 반영 — 목록/상세 즉시 반영)
- [ ] reset API (데이터 초기화)

### 권한 테스트
- [ ] 비로그인 시 로그인 유도 (confirm 다이얼로그)
- [ ] 일반 사용자 관리자 API 403 (버튼은 항상 표시, 클릭 후 권한 체크 — 의도적)
- [ ] 관리자 권한 검증
- [ ] 타인 주문 조회 404 / 타인 리뷰 수정·삭제 403

### 에러 처리
- [ ] 네트워크 오류
- [ ] API 에러 응답
- [ ] 유효성 검사 실패
- [ ] 토큰 만료

---

## 🚀 시작하기

### 로컬 환경
> 모든 데이터가 Postgres(DB)에 저장되므로 `DATABASE_URL` 없이는 데이터 엔드포인트가
> 503 `DB_NOT_CONFIGURED`를 반환합니다. `.env`에 `DATABASE_URL`을 설정하고 최초 1회
> `npm run db:init`(스키마 생성 + 시드)을 실행하세요.

```bash
npm install
npm run db:init    # 최초 1회: DB 스키마 + 시드 (DATABASE_URL 필요)
npm run start-api  # API 서버 (port 3000) - 별도 터미널
npm run dev        # 프론트엔드 (port 5173)
```

### Vercel 배포
```bash
vercel --prod
```
> Vercel 프로젝트 Storage 탭에서 Neon(Postgres) 연결 시 `DATABASE_URL`이 자동 주입됩니다.
> 배포된 사이트는 여러 사람이 공유하는 연습 환경이므로 `POST /api/reset` 사용에 주의하세요.

### 환경 변수
```
DATABASE_URL=postgres://...   # 필수 (없으면 데이터 API 503)
VITE_API_BASE_URL=https://your-domain.vercel.app
JWT_SECRET=your-secret-key
```

---

## 🎓 Playwright 테스트 코드 예제 (TypeScript)

### 초보자를 위한 기본 개념 설명

Playwright는 웹 애플리케이션을 자동으로 테스트하는 도구입니다. 브라우저를 실제로 열고, 사용자처럼 클릭하고, 입력하고, 결과를 확인할 수 있습니다.

#### 주요 용어 설명
- **`test()`**: 하나의 테스트 케이스를 정의합니다.
- **`page`**: 브라우저의 한 탭을 의미합니다. 여기서 모든 동작을 수행합니다.
- **`await`**: 비동기 작업(API 호출, 페이지 이동 등)이 완료될 때까지 기다립니다.
- **`expect()`**: 결과를 검증합니다. 예상한 값과 실제 값이 일치하는지 확인합니다.
- **`locator()`**: HTML 요소를 찾는 방법입니다. ID, 클래스, 텍스트 등으로 찾을 수 있습니다.

### 예제 1: 로그인 성공 테스트

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 올바른 아이디/비밀번호로 로그인이 성공하는지 확인합니다
test('로그인 성공 - 올바른 계정 정보 입력', async ({ page }) => {
  // 1. 메인 페이지로 이동합니다
  await page.goto('/');
  
  // 2. 로그인 버튼을 찾아서 클릭합니다
  // '#home-login'은 HTML에서 id="home-login"인 요소를 의미합니다
  await page.click('#home-login');
  
  // 3. 아이디 입력창에 'test'를 입력합니다
  await page.fill('#login-username', 'test');
  
  // 4. 비밀번호 입력창에 '1234'를 입력합니다
  await page.fill('#login-password', '1234');
  
  // 5. 로그인 제출 버튼을 클릭합니다
  await page.click('#login-submit');
  
  // 6. 로그인이 성공하면 로그아웃 버튼이 보여야 합니다
  // toBeVisible()은 해당 요소가 화면에 보이는지 확인합니다
  await expect(page.locator('#home-logout')).toBeVisible();
});
```

### 예제 2: 로그인 실패 테스트

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 잘못된 계정 정보로 로그인이 실패하는지 확인합니다
test('로그인 실패 - 잘못된 계정 정보', async ({ page }) => {
  // 1. 메인 페이지로 이동
  await page.goto('/');
  
  // 2. 로그인 페이지로 이동
  await page.click('#home-login');
  
  // 3. 존재하지 않는 아이디와 비밀번호 입력
  await page.fill('#login-username', 'wronguser');
  await page.fill('#login-password', 'wrongpass');
  
  // 4. 로그인 시도
  await page.click('#login-submit');
  
  // 5. 에러 메시지가 표시되는지 확인
  // toContainText()는 해당 요소에 특정 텍스트가 포함되어 있는지 확인합니다
  await expect(page.locator('#login-error'))
    .toContainText('아이디 또는 비밀번호');
});
```

### 예제 3: 카테고리 필터링 테스트

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 카테고리 버튼을 클릭했을 때 상품이 제대로 필터링되는지 확인합니다
test('카테고리 필터 - 전자기기 선택', async ({ page }) => {
  // 1. 메인 페이지로 이동
  await page.goto('/');
  
  // 2. '전자기기' 카테고리 버튼 클릭
  await page.click('[data-testid="category-전자기기"]');
  
  // 3. 페이지에 표시된 모든 상품 카드를 찾습니다
  // locator().all()은 조건에 맞는 모든 요소를 배열로 반환합니다
  const productCards = await page.locator('[data-testid^="product-card-"]').all();
  
  // 4. 전자기기 카테고리는 6개의 상품이 있어야 합니다
  // toBe()는 정확히 같은 값인지 확인합니다
  expect(productCards.length).toBe(6);
});
```

### 예제 4: 장바구니 담기 테스트 (로그인 필요)

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 로그인 후 상품을 장바구니에 담고 확인하는 전체 과정을 테스트합니다
// 주의: 장바구니는 서버(DB)에 계정 단위로 저장되므로, 이전 테스트에서 담은 상품이
// 남아 있을 수 있습니다. 필요하면 테스트 시작 전에 POST /api/reset으로 초기화하세요.
test('장바구니 담기 - 로그인 후 상품 추가', async ({ page }) => {
  // 1. 로그인 과정
  await page.goto('/');
  await page.click('#home-login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // 2. 첫 번째 상품의 '장바구니 담기' 버튼 클릭
  // 성공 시 alert('장바구니에 상품이 추가되었습니다.')가 발생하므로 다이얼로그를 처리합니다
  page.once('dialog', (dialog) => dialog.accept());
  await page.click('[data-testid="add-to-cart-btn-1"]');
  
  // 3. 장바구니 카운트 배지가 '1'을 표시하는지 확인
  await expect(page.locator('[data-testid="cart-badge"]'))
    .toHaveText('1');
  
  // 4. 장바구니 페이지로 이동
  await page.click('[data-testid="cart-button"]');
  
  // 5. 장바구니 페이지가 로드되었는지 확인
  await expect(page.locator('#cart-page')).toBeVisible();
  
  // 6. 장바구니에 상품 1(productId 기준 testid)이 있는지 확인
  await expect(page.locator('[data-testid="cart-item-1"]')).toBeVisible();
});
```

### 예제 5: 관리자 권한 테스트

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 일반 사용자와 관리자의 권한 차이를 확인합니다
// 주의(의도적 설계): 관리자 버튼(#home-admin-btn)은 권한과 무관하게 항상 표시되고,
// 권한 체크는 관리자 페이지 진입 후 API(401/403)에서 발생합니다.
test('권한 테스트 - 일반 사용자는 관리자 API에서 403', async ({ page }) => {
  // 1. 일반 사용자로 로그인
  await page.goto('/');
  await page.click('#home-login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // 2. 관리자 버튼은 일반 사용자에게도 보입니다 (의도적)
  await expect(page.locator('[data-testid="admin-button"]')).toBeVisible();
  
  // 3. 일반 사용자 토큰으로 관리자 API 호출 시 403이 발생해야 합니다
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.get('/api/admin', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(403);
});

test('권한 테스트 - 관리자는 관리자 페이지 정상 접근', async ({ page }) => {
  // 1. 관리자 계정으로 로그인
  await page.goto('/');
  await page.click('#home-login');
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // 2. 관리자 버튼 클릭 → 상품 관리 목록이 보여야 합니다
  await page.click('#home-admin-btn');
  await expect(page.locator('[data-testid="admin-row-1"]')).toBeVisible();
});
```

### 예제 6: API 직접 호출 테스트

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 UI 없이 API를 직접 호출하여 테스트합니다
test('API 테스트 - 존재하지 않는 상품 조회 시 404 에러', async ({ page }) => {
  // page.request.get()을 사용하면 API를 직접 호출할 수 있습니다
  const response = await page.request.get('/api/products/99');
  
  // HTTP 상태 코드가 404인지 확인
  expect(response.status()).toBe(404);
  
  // 응답 본문(body)을 JSON으로 파싱
  const body = await response.json();
  
  // 에러 코드가 'PRODUCT_NOT_FOUND'인지 확인
  expect(body.code).toBe('PRODUCT_NOT_FOUND');
});

test('API 테스트 - 인증 없이 관리자 API 호출 시 401 에러', async ({ page }) => {
  // 인증 토큰 없이 관리자 API 호출
  const response = await page.request.get('/api/admin');
  
  // 401 Unauthorized 에러가 발생해야 합니다
  expect(response.status()).toBe(401);
  
  const body = await response.json();
  expect(body.code).toBe('AUTH_NO_TOKEN');
});
```

### 테스트 실행 방법

> 아래 명령은 자동화 코드를 작성하는 **별도 저장소(자동화 프로젝트)** 에서 실행합니다.
> 본 저장소는 테스트 대상(SUT)이며 테스트 코드(tests/ 디렉터리)를 포함하지 않습니다.

```bash
# Playwright 설치 (자동화 프로젝트에서)
npm init playwright@latest

# 모든 테스트 실행
npx playwright test

# 특정 파일만 실행 (자동화 프로젝트 내 경로 예시)
npx playwright test tests/login.spec.ts

# UI 모드로 실행 (디버깅에 유용)
npx playwright test --ui

# 헤드풀 모드로 실행 (브라우저가 실제로 보임)
npx playwright test --headed
```

### 디버깅 팁

1. **스크린샷 찍기**: 테스트 중 특정 시점의 화면을 저장
   ```typescript
   await page.screenshot({ path: 'screenshot.png' });
   ```

2. **대기 시간 추가**: 요소가 나타날 때까지 기다리기
   ```typescript
   await page.waitForSelector('#my-element');
   ```

3. **콘솔 로그 확인**: 브라우저 콘솔의 메시지 캡처
   ```typescript
   page.on('console', msg => console.log(msg.text()));
   ```

4. **네트워크 요청 감시**: API 호출 모니터링
   ```typescript
   page.on('request', request => console.log(request.url()));
   ```
