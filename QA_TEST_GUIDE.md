# QA 자동화 테스트 가이드

이 문서는 Mini Commerce 데모 사이트의 QA 자동화 테스트를 위한 가이드입니다.

## 🗺️ 라우트

`/`, `/product/:id`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/profile`(로그인 필요), `/tracking`(공개), `/order-complete`, `/admin`

> 상품 목록·정렬·가격필터 시나리오와 셀렉터는 모두 **홈(`/`)** 을 기준으로 서술합니다.

> **로그인/회원가입은 모달로 처리됩니다.** 계정 드롭다운에서 열리며 성공해도 **URL은 `/` 그대로**입니다.
> 검증은 **로그인 모달(`login-modal`)이 사라짐** 또는 **로그인 상태 UI**(계정 메뉴에 `usermenu-logout` 노출)로 합니다.

> **인증 & 세션:** 로그인 정보(`token`/`role`/`username`)는 **localStorage**에 저장됩니다
> (근거: `src/App.jsx` `handleLogin`). 따라서 로그인은 **새로고침·탭 닫기·
> 브라우저 재시작 후에도 유지**되고 **탭 간 공유**되며, Playwright `storageState`로 **재사용할 수 있습니다**
> (아래 "storageState 재사용" 참고). 단 JWT 자체는 **1시간 후 만료**되어 이후 인증요청은 서버가 401로 거절합니다.
> 명시적 토큰 제거는 **로그아웃/주문완료(`restartApp`)** 에서 일어납니다.
> 서버는 set-cookie를 쓰지 않고 로그인 응답 바디 `{ token, user }`로 JWT를 줍니다.

> **서버 장바구니 (계정 영속):** 장바구니·위시리스트·주문은 클라이언트 상태가 아니라 **서버 DB에 계정 단위로 저장**됩니다.
> 같은 계정으로 다른 브라우저에서 로그인해도 장바구니가 유지되며, localStorage 클리어로는 초기화되지 않습니다.
> 초기화가 필요하면 `POST /api/reset`(전체 시드 복원, 공유 환경 주의) 또는 `cart_update` 수량 0을 사용하세요.

### storageState로 로그인 재사용 (표준 패턴)

Playwright의 `storageState`는 쿠키 + **localStorage**(origins)를 직렬화합니다(sessionStorage는 직렬화하지 않음).
이 앱은 인증을 localStorage에 두므로 표준 setup-project 패턴을 그대로 쓸 수 있습니다.

```ts
// auth.setup.ts — 한 번만 로그인해서 세션을 파일로 저장
import { test as setup, expect } from '@playwright/test';
const authFile = '.auth/user.json';

setup('로그인', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();   // 계정 드롭다운 열기
  await page.getByTestId('usermenu-login').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-modal')).toBeHidden();  // 리다이렉트 아님, 모달 닫힘으로 검증
  await page.context().storageState({ path: authFile });        // localStorage 포함 저장 → 재사용
});
```

```ts
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  { name: 'chromium', dependencies: ['setup'],
    use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' } },
]
```

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
- **Status**: `BLOCKED` → 로그인 시 **403 Forbidden** 반환 (negative 검증용 픽스처)

> 회원가입(계정 드롭다운 → `usermenu-signup` 모달)으로 만든 계정도 로그인 가능합니다 (role: `USER`).
> `POST /api/reset` 실행 시 가입 계정·주문·리뷰가 모두 시드 상태로 복원됩니다.

---

## 🎯 주요 테스트 시나리오

### 1. 인증 테스트

> 로그인/회원가입 UI는 계정 드롭다운(`user-menu-trigger`) → `usermenu-login`/`usermenu-signup`으로 엽니다.

#### 1.1 로그인 테스트
- **성공 케이스**
  - 올바른 계정 정보로 로그인
  - 로그인 후 localStorage에 토큰 저장 확인 (`localStorage.getItem('token')`)
  - **성공 검증은 모달 닫힘/로그인 UI로**: `login-modal`이 사라지고 계정 메뉴에 `usermenu-logout`이 노출됨 (URL은 그대로 `/`)

- **실패 케이스**
  - 잘못된 아이디/비밀번호 → `login-error`
  - 빈 입력값
  - 차단 계정 `test2` → 403 (아래 테스트 계정 참고)

#### 1.2 로그아웃 테스트
- 계정 드롭다운 → `usermenu-logout` 클릭 (`confirm()` 다이얼로그 발생)
- localStorage 토큰 삭제 확인
- 검증은 계정 메뉴에 로그인 항목(`usermenu-login`)이 다시 노출되는지로 합니다

#### 1.3 회원가입 테스트 (계정 드롭다운 → `usermenu-signup`, 모달)
- **중복확인 플로우**
  - 기존 아이디(`test`)로 `#username-check-btn` 클릭 → `username-check-result`에 "이미 사용 중인 아이디입니다"
  - 새 아이디 → "사용 가능한 아이디입니다"
- **검증 에러 (필드별 `role=alert`)**
  - 아이디 형식 위반(영소문자+숫자 4~12자 아님) → `signup-username-error`
  - 비밀번호 4자 미만 → `signup-password-error`
  - 비밀번호 확인 불일치 → `password-confirm-error`
  - 이메일 형식 오류(이메일은 선택 입력) → `signup-email-error`
- **가입 성공 → 로그인**
  - `signup-success` 메시지(in-DOM) 표시 후 **로그인 모달로 전환**됨 (URL은 그대로 `/`)
  - 새 계정으로 로그인 성공 확인
- **API negative**: 중복 아이디 409 `USERNAME_TAKEN` → `signup-error`에 표시

---

### 2. 상품 목록 테스트 (홈 `/` 기준)

> 목록/정렬/검색/가격필터는 모두 **홈(`/`)** 에서 수행합니다.

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

#### 2.4 가격 필터 (홈 `/`)
- `#min-price` / `#max-price` 입력 후 `apply-price-filter` 클릭
- 최소 > 최대 입력 → `price-filter-error` "최소 가격이 최대 가격보다 클 수 없습니다"
- 음수/숫자 아님 → `price-filter-error` 표시
- 적용 후 `search-result-count`로 결과 개수 검증
- `reset-price-filter`로 초기화

#### 2.5 품절 뱃지
- **씨드 재고는 전부 12개**입니다. 품절 상태를 검증하려면 재고를 **동적으로 0으로 만든 뒤** 확인하세요:
  관리자 `PUT /api/admin`으로 특정 상품 재고를 0으로 낮추거나, 주문으로 재고를 소진합니다.
- 품절 상태는 `soldout-badge`(모든 카드 공통 testid) 노출과 구매버튼 disabled로 검증합니다. 특정 상품의 뱃지를 보려면 카드를 상품명으로 스코핑하세요: `page.getByTestId('product-card').filter({ hasText: '상품명' }).getByTestId('soldout-badge')`.
- 재고는 주문/취소에 따라 실시간 반영되므로 공유 환경에서는 검증 전후로 씨드 초기화(`POST /api/reset`)를 권장합니다.

---

### 3. 장바구니 테스트 (서버 장바구니)

> ⚠️ 장바구니는 **서버 DB에 계정 단위로 저장**됩니다(로그인 필수).

#### 3.1 장바구니 담기 (비로그인)
- "장바구니 담기" 버튼 → 로그인 유도 `confirm()` 다이얼로그 (수락 시 로그인 모달 오픈, 페이지 이동 아님)

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
- 인증이 localStorage에 저장되므로 `storageState`로 로그인 상태를 **재사용할 수 있습니다** (위 "storageState 재사용" 참고). 서버 장바구니 상태도 함께 검증하세요.
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
- **실패**: `EXPIRED10` → 400 `COUPON_EXPIRED` "만료된 쿠폰입니다"
- **성공**: `WELCOME10`(10%, 최대 2만) / `SAVE5000`(5천원, 최소주문 3만) / `VIP20`(20%, 최소 10만, 최대 5만)
- 적용 시 `checkout-discount`·`checkout-final` 갱신, `coupon-remove-btn`으로 해제
- 최소 주문금액 미달 → 400 `MIN_ORDER_NOT_MET`, 없는 코드 → 404 `COUPON_NOT_FOUND`

#### 4.4 약관 게이팅 → 카드 결제 → 주문완료
- `#agree-terms` 체크 전 `#place-order-btn` **비활성(disabled)** 확인
- 결제수단 라디오 3종: `#payment-card`(카드, 기본 동작)/`#payment-bank`(라벨 "무통장입금", 선택 시 `payment-bank-warn` 경고 노출)/`#payment-inicis`(이니시스 샌드박스). 안내는 `payment-method-notice`
- **카드 입력폼(카드 선택 시에만 렌더)**: `#card-number`(끝 4자리 `0000`=승인), `#card-expiry`(MM/YY), `#card-cvc`(3자리)
- `#place-order-btn` 라벨은 `{금액}원 결제하기`, 클릭 시 `POST /api/payment`(승인) → `POST /api/user-actions`(주문 생성) → `/order-complete` 이동
- **주문번호 검증**: `order-complete-id`가 `ORD-yyyymmdd-XXXX`(대문자 영숫자 4자리) 형식
- 결제금액(`order-complete-amount`)이 `checkout-final`과 일치 — 가격은 **서버(DB)가 결정**, 클라이언트 가격 무시
- 서버 장바구니 주문 시 장바구니 자동 비움 확인

#### 4.5 결제 실패 재현 (테스트 카드 · 외부 PG 목킹)
카드번호 **끝 4자리로 결과가 결정론적**으로 정해집니다(앞자리 임의). 실패 시 `payment-error`(`role=alert`)에 서버 메시지가 뜨고 **주문은 생성되지 않으며** URL은 `/checkout`에 머뭅니다.
- `…0001` → 402 `PAYMENT_DECLINED` (카드 거절)
- `…0002` → 402 `PAYMENT_LIMIT_EXCEEDED` (한도 초과)
- `…9999` → 504 `PAYMENT_GATEWAY_TIMEOUT` (~500ms 지연; 진행 중 `payment-processing` 스피너 후 실패)
- 형식 오류(숫자 12~19자리 아님) → 400 `INVALID_CARD`, 금액 ≤ 0 → 400 `INVALID_AMOUNT`
- **외부 PG 목킹:** `page.route('**/api/payment', r => r.fulfill({status:504,...}))`로 응답을 가로채 강제 실패 주입 → `payment-error` 처리 검증
- **서버 폴트 주입:** `POST /api/payment?simulate=decline|limit|timeout|error` (카드 무관, `error`→500 `PAYMENT_ERROR`)
- 결제 사후조회: `GET /api/payment?paymentKey=...` → 없으면 404 `PAYMENT_NOT_FOUND` (`paymentKey`=`PAY-<uuid>`는 비결정 값, 값 단언 금지)

#### 4.6 주문 negative 케이스
- 상품 3/4 포함 주문 → 422 `ORDER_BLOCKED_PRODUCT` → `checkout-error`
- 재고 부족 → 409 `INSUFFICIENT_STOCK`. 현재 재고를 조회해 `stock+1` 수량으로 주문하거나 관리자 `PUT /api/admin`으로 재고를 0으로 낮춘 뒤 재현합니다.
- 빈 주문 → 400 `EMPTY_ORDER`

---

### 4-1. 주문내역 테스트 (`/orders`)

- 비로그인 딥링크 → `orders-login-required`, 주문 없음 → `orders-empty`
- `order-item-{orderId}` 행 클릭 → `order-detail-{orderId}` 상세 확장 (배송지 포함)
- **상태 뱃지 5종** `order-status-{orderId}` (`data-status` 속성): `결제완료`(PAID) / `상품준비중`(PREPARING) / `배송중`(SHIPPING) / `배송완료`(DELIVERED) / `취소됨`(CANCELED)
- **상태 진행** `order-advance-btn-{orderId}` (확장 후 노출) → 다음 단계로 전이 (`PATCH .../advance`). `배송중` 진입 시 송장번호(`order-tracking-number-{orderId}`, `MC`+10자리) 발급. 종료 상태(DELIVERED/CANCELED)에선 버튼 미노출, API는 409 `INVALID_TRANSITION`
- **배송조회** `order-track-btn-{orderId}`(SHIPPING/DELIVERED만) + 인라인 타임라인 `tracking-timeline-{orderId}` → `tracking-event-{orderId}-{i}`
- **취소 버튼(`order-cancel-{orderId}`)은 PAID/PREPARING에서만 노출**, 클릭 시 `confirm('주문을 취소하시겠습니까?')` 다이얼로그 (리스너 없으면 자동 dismiss 주의)
- 수락 시 상태 전이 → `취소됨` + `order-cancel-message` 표시 + **재고 복원**
- 이미 취소된 주문 재취소 → 409 `ALREADY_CANCELED`
- 관리자(admin)는 전체 주문 조회 + `set_status`로 임의 상태 지정(비관리자 403), 타인 주문 상세 조회는 404

---

### 4-2. 위시리스트 테스트 (`/wishlist`)

- 홈 카드의 하트 `wishlist-toggle`(모든 카드 공통 testid — 카드 스코핑 필요) 클릭 → `aria-pressed` `false`→`true` 토글
- 비로그인 하트 클릭 → 로그인 유도 `confirm()`
- 페이지 확인: 계정 드롭다운(`user-menu-trigger`) → `usermenu-wishlist` → `/wishlist` → `wishlist-item-{productId}` 표시
- `wishlist-add-to-cart-{productId}`로 장바구니 담기, `wishlist-remove-{productId}`로 삭제
- 전부 삭제 시 `wishlist-empty`, 비로그인 딥링크 시 `wishlist-login-required`
- API: `wishlist_add` 중복 시 409, `wishlist_remove` 없는 항목 404

---

### 4-3. 상품 상세 테스트 (`/product/:id`)

- **갤러리**: 이미지 3장 — `gallery-thumb-0..2` 클릭 시 `product-main-image`의 `src` 스왑
- **탭 전환**: `#tab-description` / `#tab-specs` / `#tab-shipping` / `#tab-reviews` — 활성 탭 패널(`tab-panel-*`)만 DOM에 존재
- **스펙**: `spec-row-{i}` 7~8행
- **재고 뱃지**: `stock-badge` = `품절`/`재고 부족`(5개 미만)/`재고 충분` — 품절 시 `#add-to-cart-button`·`#buy-now-button` disabled. 품절 검증은 관리자 `PUT /api/admin`으로 재고를 0으로 낮춘 상품으로 재현
- **리뷰 작성** (로그인 필요, 비로그인 시 `review-login-required`):
  - 별점 위젯 `star-input-1..5` 클릭 → `#review-comment` 10자 이상 → `#review-submit`
  - 결과는 alert가 아닌 **in-DOM `review-form-message`** ("리뷰가 등록되었습니다")
  - 등록 후 `rating-average` / `rating-bar-5..1` 평점 분포 자동 갱신
  - negative: 10자 미만 → 400 `COMMENT_TOO_SHORT`. 같은 상품에 여러 번 작성해도 항상 201로 성공합니다
  - **이미지 첨부(최대 3장)**: `image-upload-input-review`(파일 입력) → 썸네일 `review-upload-thumb-{i}` / 제거 `review-upload-remove-{i}`, 형식/용량 에러 `image-upload-error`
- **리뷰 목록**: 정렬 `#review-sort`(latest/rating), 더보기 `review-load-more`, 항목 `review-item-{id}`, 소유자/관리자만 수정·삭제
- **리뷰별 첨부 이미지**: `review-images-{reviewId}` → `review-image-{reviewId}-{i}`

---

### 4-4. 파일 업로드 테스트 (모의 · 검증+에코)

공통 `ImageUpload` 컴포넌트가 리뷰/아바타에서 재사용됩니다. 허용: `data:image/png|jpeg|webp|gif;base64,...`, 최대 2MB. 실제 저장 없이 검증 통과한 값을 그대로 돌려줍니다(`POST /api/upload`).
- 파일 입력 `image-upload-input-{review|avatar}` — Playwright `setInputFiles()`로 실제 파일 업로드
- 정상 → 201 `{ url, kind }`, 미리보기 `image-upload-preview`
- **negative(에러는 `image-upload-error`)**: 이미지 아님/미지원 형식 → 400 `INVALID_FILE_TYPE`, 2MB 초과 → 413 `FILE_TOO_LARGE`, `kind` 오류 → 400 `INVALID_KIND`
- 형식/용량 에러는 API를 직접 호출(`page.request.post('/api/upload', ...)`)해 검증하는 편이 빠릅니다
- 인증 필요 (401 `AUTH_NO_TOKEN`)

---

### 4-5. 배송조회 테스트 (`/tracking`, 공개)

로그인 불필요한 **공개** 페이지. 모의 택배 API(`GET /api/tracking`)가 주문 상태/주문시각 기반으로 이벤트 타임라인을 결정적으로 생성합니다.
- 서브페이지 공통 헤더의 배송조회(`site-nav-tracking`) 또는 딥링크(`/tracking`)로 진입 (공개)
- `#tracking-number-input`에 송장번호 입력 + `#tracking-search-btn`
- **없는 송장** → `tracking-not-found`(`role=alert`) / 404 `TRACKING_NOT_FOUND`
- **유효 송장**(배송중 이상 주문의 `MC`+10자리) → `tracking-result` / 상태 `tracking-status` / 이벤트 `tracking-event-{i}`(순번 0부터)
- **외부 택배 API 목킹**: `page.route('**/api/tracking**', ...)`로 응답을 가로채 임의 상태/이벤트 주입 후 UI 렌더 검증
- `?orderId=` 경로는 인증 필요 + 본인 주문만(타인/없는 주문은 존재 비노출 위해 404)

---

### 4-6. 내정보 테스트 (`/profile`, 로그인 필요)

- 비로그인 딥링크 → `profile-login-required`
- 계정 드롭다운(`user-menu-trigger`) → `usermenu-profile`(로그인 시)로 진입, 루트 `profile-page`
- **아바타**: `image-upload-input-avatar` 업로드 → `POST /api/user-actions {action:'set_avatar'}` → `profile-avatar` 갱신 + `profile-avatar-message`(in-DOM). 없으면 이니셜 폴백
- **주소검색**: `address-search-btn` → 카카오(다음) 우편번호 위젯을 외부 스크립트(`postcode.v2.js`)로 동적 로드, `address-search-layer`에 마운트
- **스크립트 차단 폴백(목킹 연습)**: `page.route('**/*postcode*', r => r.abort())` → `address-search-fallback`(`role=alert`) 수동입력 노출 → `address-search-manual-zonecode`/`-manual-address`/`-manual-submit`
- 선택 결과는 `profile-zonecode`/`profile-address`에 반영

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
- `GET /api/products/:id` - 상품 상세 조회 (3, 4 → 500 / 16 → 404 검증용 픽스처)
- `GET /api/search?q=&category=&minPrice=&maxPrice=&sort=` - 검색 (sort: `price-asc`|`price-desc`|`name`|`discount`)
- `GET|HEAD /api/inventory?productId=` - 재고 조회 (`X-Stock-Count`/`ETag` 헤더, 주문/취소 시 실시간 반영)

### 사용자 액션 통합 API
> 장바구니/주문/위시리스트는 모두 `/api/user-actions` 하나로 처리하며 body의 `action` 필드로 분기합니다.
> 인증(Bearer 토큰) 필수.
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
  - 404 `COUPON_NOT_FOUND` | 400 `COUPON_EXPIRED`(EXPIRED10) | 400 `MIN_ORDER_NOT_MET` | 400 `INVALID_AMOUNT`
  - 쿠폰: `WELCOME10`(10%, 최대 2만) / `SAVE5000`(5천원, 최소 3만) / `VIP20`(20%, 최소 10만, 최대 5만) / `EXPIRED10`(만료)

### 리뷰
- `GET /api/reviews?productId=&sort=(latest|rating)&limit=&offset=` - 조회 (`count`는 전체 개수)
- `POST /api/reviews` (인증) `{ productId, rating, comment }` → 201 | 400 `COMMENT_TOO_SHORT`(10자). 같은 상품 재작성도 항상 201
- `PATCH`/`DELETE /api/reviews` - 소유자 또는 admin만

### 주문 조회/취소/상태전이
- `GET /api/orders` (인증) - 본인 주문 목록 (admin은 전체 + username)
- `GET /api/orders/:id` - 상세 (shipping 포함, 타인 주문은 404)
- `PATCH /api/orders/:id`
  - `{ "action": "cancel" }` → 200 (재고 복원, PAID/PREPARING만) | 409 `ALREADY_CANCELED` | 409 `CANCEL_NOT_ALLOWED`
  - `{ "action": "advance" }` → 200 다음 상태로 (PAID→PREPARING→SHIPPING[송장 발급]→DELIVERED) | 409 `INVALID_TRANSITION`(종료 상태)
  - `{ "action": "set_status", "status": "SHIPPING" }` (ADMIN) → 200 | 403 | 400 `INVALID_STATUS`

### 결제 (모의 PG · 이니시스 스타일)
- `POST /api/payment` (인증) `{ cardNumber, cardExpiry?, cardCvc?, amount, orderName? }`
  - 결과는 **카드 끝 4자리로 결정**: `…0000`(그 외 포함) 201 `{ paymentKey:'PAY-<uuid>', status:'DONE', method:'CARD', cardLast4, amount }` | `…0001` 402 `PAYMENT_DECLINED` | `…0002` 402 `PAYMENT_LIMIT_EXCEEDED` | `…9999` 504 `PAYMENT_GATEWAY_TIMEOUT`(~500ms)
  - 400 `INVALID_CARD`(숫자 12~19자리 아님) | 400 `INVALID_AMOUNT`(≤0/비정수)
  - 폴트 주입: `?simulate=decline|limit|timeout|error` (카드 무관, `error`→500 `PAYMENT_ERROR`)
- `GET /api/payment?paymentKey=` (인증) → 200 결제 레코드 | 404 `PAYMENT_NOT_FOUND`
- 주문 연동: `POST /api/user-actions {action:'order', ..., paymentKey?}` — `paymentKey` 주면 상태 DONE + 금액 일치 + 미사용 검증 후 주문에 저장 (402 `PAYMENT_REQUIRED`/`PAYMENT_INVALID`). 생략 시 결제 없이도 주문 성공(하위호환)

### 파일 업로드 (모의 · 검증+에코)
- `POST /api/upload` (인증) `{ kind:'review'|'avatar', image: dataURL }` → 201 `{ url, kind }` | 400 `INVALID_FILE_TYPE` | 400 `INVALID_KIND` | 413 `FILE_TOO_LARGE`(2MB 초과)
- 아바타: `POST /api/user-actions {action:'set_avatar', image}` → 200 `{avatarUrl}`; `GET /api/user-actions?type=profile` → `{avatarUrl,...}`; login 응답에도 `user.avatarUrl` 포함
- 리뷰 이미지: `POST/PATCH /api/reviews`에 `images: string[]`(최대 3, dataURL/http URL) → 400 `INVALID_REVIEW_IMAGE`; `GET`은 `images[]` 반환

### 배송 추적 (모의 택배)
- `GET /api/tracking?trackingNumber=` (공개, 송장 주문 존재해야) 또는 `?orderId=` (인증) → 200 `{ trackingNumber, status, events:[{status,label,at,location}] }` | 404 `TRACKING_NOT_FOUND`
- events는 주문 상태/주문시각 기반 결정적 타임라인 — 외부 API 목킹 연습 대상

### 초기화
- `POST /api/reset` - **DB 초기화** (모든 테이블 truncate 후 시드 재삽입 — 상품/계정/리뷰/위시리스트/장바구니/주문/쿠폰 전부 복원)
  ```json
  // 응답 (200) — reset 배열은 9개 (원소/순서를 toEqual로 강하게 단언하기보다 status 200 + message 위주로 검증 권장)
  { "message": "모든 데이터가 초기화되었습니다",
    "reset": ["products", "users", "reviews", "wishlists", "carts", "orders", "coupons", "payments", "user_coupons"] }
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

### 홈페이지 (실재하는 셀렉터만)

> 홈 헤더의 id는 `#home-admin-btn`(관리자), `#home-cart-btn`(장바구니)입니다.
> 로그인/로그아웃/회원가입/위시리스트/주문/내정보는 **계정 드롭다운(`user-menu-trigger`) 경유**로 접근합니다.

- `[data-testid="home-page"]` - 홈페이지 컨테이너
- `[data-testid="logo"]` - 로고 (클릭 시 홈으로)
- `[data-testid="search-input"]` - 검색 입력창
- `[data-testid="search-button"]` - 검색 버튼
- `[data-testid="cart-button"]` (= `#home-cart-btn`) - 장바구니 버튼
- `[data-testid="cart-badge"]` - 장바구니 카운트
- `[data-testid="admin-button"]` (= `#home-admin-btn`) - 관리자 버튼 (**항상 표시**, 권한 체크는 클릭 후 API에서 발생)
- **계정 드롭다운**: `user-menu-trigger`(열기) → 항목 `usermenu-login` / `usermenu-signup` / `usermenu-logout` / `usermenu-wishlist` / `usermenu-orders` / `usermenu-profile`
- **서브페이지 공통 헤더**: `site-nav-tracking`(배송조회, 공개) / `site-nav-cart`(장바구니 이동)
- `[data-testid="category-전체"]` - 전체 카테고리
- `[data-testid="category-전자기기"]` - 전자기기 카테고리
- `[data-testid="category-액세서리"]` - 액세서리 카테고리
- `[data-testid="category-생활"]` - 생활 카테고리
- `[data-testid="sort-select"]` (= `#sort-select`) - 정렬 셀렉트
- **홈 상품카드 (모든 카드가 동일 testid를 공유 — 특정하려면 스코핑 필요)**: 셀렉터 전략 연습을 위해 상품 카드와 서브요소에는 상품 id 접미사가 없습니다. 아래 값은 카드 전부에 동일하게 붙으므로 상품명·접근성 이름·카테고리·위치로 원하는 카드를 먼저 스코핑하세요 (아래 "동일 testid 카드에서 원하는 상품 고르기" 참고).
  - `[data-testid="product-card"]` - 상품 카드 (`role="listitem"`, `data-product-category`/`data-product-index` 보유)
  - `[data-testid="product-name"]` - 상품명 (`title` 속성 = 상품명)
  - `[data-testid="price"]` / `[data-testid="original-price"]` - 판매가 / 정가
  - `[data-testid="discount-badge"]` - 할인율 뱃지
  - `[data-testid="soldout-badge"]` - 품절 뱃지 (재고를 0으로 낮추면 노출)
  - `[data-testid="wishlist-toggle"]` - 위시리스트 하트 토글 (`aria-pressed`, aria-label `{상품명} 위시리스트에 추가/제거`)
  - `[data-testid="view-detail-btn"]` - 상품 상세보기 (aria-label `{상품명} 상품 상세`; 홈 카드에는 담기 버튼이 없고 상세로만 이동)

### 로그인 (모달 — 독립 페이지 아님)
> 계정 드롭다운 `user-menu-trigger` → `usermenu-login`으로 엽니다. 성공 시 URL 이동 없이 모달만 닫힙니다.
- `[data-testid="login-modal"]` - 로그인 모달 컨테이너 (닫힘으로 로그인 성공 검증)
- `[data-testid="username-input"]` - 아이디 입력
- `[data-testid="password-input"]` - 비밀번호 입력
- `[data-testid="login-submit-button"]` - 로그인 버튼
- `[data-testid="login-error"]` - 로그인 에러 메시지

### 회원가입 (모달 — 계정 드롭다운 → `usermenu-signup`)
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
- `#payment-card` / `#payment-bank`(라벨 "무통장입금") / `#payment-inicis`(이니시스 샌드박스) - 결제수단 라디오 3종. `#payment-bank` 선택 시 `[data-testid="payment-bank-warn"]` 경고, `[data-testid="payment-method-notice"]` 안내 존재
- `#card-number`(testid `card-number-input`) / `#card-expiry`(`card-expiry-input`) / `#card-cvc`(`card-cvc-input`) - 카드 입력폼 (**카드 선택 시에만 렌더**, 끝 4자리로 결과 결정)
- `[data-testid="test-card-guide"]` - 테스트 카드 안내 (접이식 `-toggle`/`-body`, 행 `test-card-row-0000`/`-0001`/`-0002`/`-9999`)
- `#agree-terms` - 약관 동의 체크박스 (체크 전 결제 버튼 비활성)
- `#place-order-btn` - 결제 버튼 (라벨 `{금액}원 결제하기`)
- `[data-testid="payment-processing"]` - 결제 진행 스피너 (`role=status`) / `[data-testid="payment-error"]` - 결제 실패 (`role=alert`, 주문 미생성)
- `[data-testid="checkout-subtotal"]` / `[data-testid="checkout-discount"]` / `[data-testid="checkout-final"]` - 금액 요약
- `[data-testid="checkout-error"]` / `[data-testid="checkout-empty"]` - 주문 실패 에러 / 빈 장바구니

### 주문내역 페이지 (`/orders`)
- `[data-testid="order-item-{orderId}"]` - 주문 행 (클릭 = 상세 확장 토글)
- `[data-testid="order-detail-{orderId}"]` - 확장된 상세 영역 (배송지 포함)
- `[data-testid="order-status-{orderId}"]` - 상태 뱃지 5종 (`결제완료`/`상품준비중`/`배송중`/`배송완료`/`취소됨`, `data-status` 속성)
- `[data-testid="order-advance-btn-{orderId}"]` - 상태 진행 (다음 단계로, 종료 상태에선 미노출)
- `[data-testid="order-cancel-{orderId}"]` - 취소 버튼 (**PAID/PREPARING만**, `confirm()` 발생)
- `[data-testid="order-track-btn-{orderId}"]` - 배송조회 (SHIPPING/DELIVERED만) / `[data-testid="order-tracking-number-{orderId}"]` - 송장번호(`MC`+10자리)
- `[data-testid="tracking-timeline-{orderId}"]` → `[data-testid="tracking-event-{orderId}-{i}"]` - 인라인 배송 타임라인
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
- `[data-testid="image-upload-input-review"]` - 리뷰 이미지 첨부 (최대 3장) / 썸네일 `review-upload-thumb-{i}` / 제거 `review-upload-remove-{i}`
- `[data-testid="review-images-{reviewId}"]` → `[data-testid="review-image-{reviewId}-{i}"]` - 리뷰별 첨부 이미지
- `#review-sort` (`latest`/`rating`) / `[data-testid="review-load-more"]` / `[data-testid="review-item-{id}"]` - 정렬/더보기/리뷰 항목

### 상품 목록/정렬/가격필터 (홈 `/`)
- `#sort-select` - 정렬 (`default`/`price-asc`/`price-desc`/`name`/`discount`)
- `#min-price` / `#max-price` - 가격 필터 입력
- `[data-testid="apply-price-filter"]` / `[data-testid="reset-price-filter"]` - 필터 적용/초기화
- `[data-testid="price-filter-error"]` - 필터 검증 에러
- `[data-testid="search-result-count"]` - 검색/필터 결과 개수
- 상품 카드/하트/품절 뱃지: `product-card`, `wishlist-toggle`, `soldout-badge` — **모든 카드가 동일 testid를 공유**하므로 상품명·접근성 이름·카테고리·위치로 카드를 스코핑한 뒤 사용합니다 (홈페이지 섹션 및 "동일 testid 카드에서 원하는 상품 고르기" 참고).

### 주문완료 페이지 (`/order-complete`)
- `[data-testid="order-complete-id"]` - 주문번호 (`ORD-yyyymmdd-XXXX`)
- `[data-testid="order-complete-amount"]` - 결제금액
- `[data-testid="go-orders-btn"]` - 주문내역 보기 버튼

### 내정보 페이지 (`/profile`, 로그인 필요)
- `[data-testid="profile-page"]` - 페이지 루트 (진입: `user-menu-trigger` → `usermenu-profile`) / `[data-testid="profile-login-required"]` - 비로그인 딥링크 안내
- `[data-testid="profile-avatar"]` - 아바타(없으면 이니셜 폴백) / `[data-testid="profile-avatar-message"]` - 결과 메시지(in-DOM)
- `[data-testid="image-upload-input-avatar"]` - 아바타 업로드 (file input)
- `[data-testid="address-search-btn"]` - 주소검색 열기 / `[data-testid="address-search-layer"]` - 위젯 마운트 레이어
- `[data-testid="address-search-fallback"]` - 스크립트 차단 시 수동입력 폴백 (`role=alert`) → `address-search-manual-zonecode`/`-manual-address`/`-manual-submit`
- `[data-testid="profile-zonecode"]` / `[data-testid="profile-address"]` - 선택된 우편번호 / 주소

### 배송조회 페이지 (`/tracking`, 공개)
- `#tracking-number-input` / `#tracking-search-btn` - 송장번호 입력 / 조회
- `[data-testid="tracking-result"]` - 결과 컨테이너 / `[data-testid="tracking-result-number"]` - 결과 송장번호
- `[data-testid="tracking-status"]` - 상태 뱃지 / `[data-testid="tracking-event-{i}"]` - 이벤트 타임라인(순번 0부터)
- `[data-testid="tracking-not-found"]` - 없는 송장 (`role=alert`)

### 파일 업로드 공통 컴포넌트 (ImageUpload)
- `[data-testid="image-upload-input-{review|avatar}"]` - 파일 입력
- `[data-testid="image-upload-loading"]` - 업로드 중 / `[data-testid="image-upload-error"]` - 형식/용량 에러 / `[data-testid="image-upload-preview"]` - 미리보기

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
- 상품 3, 4 상세 조회 → 500 / 상품 16 → 404 (검증용 픽스처)
- 가격이 0원인 상품 장바구니 담기 (클라이언트 알림)

### 3. 주문/쿠폰/리뷰 에러
- 상품 3/4 포함 주문 → 422 `ORDER_BLOCKED_PRODUCT`
- 재고 부족 → 409 `INSUFFICIENT_STOCK` (재고를 동적으로 0/부족 상태로 만들어 재현)
- 빈 주문 → 400 `EMPTY_ORDER`
- 이미 취소된 주문 재취소 → 409 `ALREADY_CANCELED` / 취소 불가 상태 → 409 `CANCEL_NOT_ALLOWED` / 종료 상태 advance → 409 `INVALID_TRANSITION`
- 만료 쿠폰 `EXPIRED10` → 400 `COUPON_EXPIRED` / 최소 주문금액 미달 → 400 `MIN_ORDER_NOT_MET` / 없는 쿠폰 → 404 `COUPON_NOT_FOUND`
- 리뷰 10자 미만 → 400 `COMMENT_TOO_SHORT` / 같은 상품 재작성도 항상 201 / 리뷰 이미지 무효·초과 → 400 `INVALID_REVIEW_IMAGE`
- 회원가입 중복 아이디 → 409 `USERNAME_TAKEN` / 형식 오류 → 400 `INVALID_USERNAME`/`INVALID_PASSWORD`/`INVALID_EMAIL`

### 3-1. 결제/업로드/배송추적 에러
- 결제 거절 `…0001` → 402 `PAYMENT_DECLINED` / 한도 `…0002` → 402 `PAYMENT_LIMIT_EXCEEDED` / 타임아웃 `…9999` → 504 `PAYMENT_GATEWAY_TIMEOUT`
- 카드 형식 오류 → 400 `INVALID_CARD` / 금액 오류 → 400 `INVALID_AMOUNT` / `?simulate=error` → 500 `PAYMENT_ERROR` / 없는 결제키 → 404 `PAYMENT_NOT_FOUND`
- 주문 결제검증 실패 → 402 `PAYMENT_REQUIRED`/`PAYMENT_INVALID`
- 업로드 형식 오류 → 400 `INVALID_FILE_TYPE` / 2MB 초과 → 413 `FILE_TOO_LARGE` / kind 오류 → 400 `INVALID_KIND`
- 배송추적 없는 송장/타인 주문 → 404 `TRACKING_NOT_FOUND`

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
5. 체크아웃/주문 테스트 (쿠폰/약관/카드 결제/주문완료)
6. 결제 실패·파일 업로드·배송추적·내정보 테스트 (신규)
7. 주문내역(상태 진행)/위시리스트 테스트
8. 관리자 기능 테스트 (admin 계정)
9. 로그아웃 테스트 (계정 드롭다운 → `usermenu-logout`)

### 2. 데이터 초기화
- 장바구니·위시리스트·주문·리뷰·가입 계정은 서버 DB에 저장되므로, 서버 데이터 초기화로 정리합니다: `POST /api/reset` (모든 데이터 시드 복원 — 공유 배포 환경에서는 다른 사용자에게도 영향)
- 개별 정리: `cart_update` 수량 0(장바구니), `wishlist_remove`, 주문 취소, 리뷰 삭제
- **테스트 격리**: 데이터가 서버 DB에 계정 단위로 영속되므로 `beforeEach`에서 `POST /api/reset`으로 초기화하거나, 병렬(fullyParallel) 실행 시 테스트별 **고유 계정**(`signup`)으로 격리합니다.
  ```ts
  test.beforeEach(async ({ request }) => { await request.post('/api/reset'); });
  // 병렬 시: const username = `u${Date.now()}_${test.info().parallelIndex}`;
  ```
- 로그인 상태는 localStorage에 영속되므로, `storageState`(setup 프로젝트)로 재사용하거나 로그아웃/`reset`으로 정리합니다.

### 3. 대기 시간 — web-first assertion 권장

- 조건 충족까지 자동 재시도하는 web-first assertion으로 대기하는 것을 권장합니다(고정 `page.waitForTimeout` 대비 안정적):
  ```ts
  await expect(locator).toBeVisible();          // 나타날 때까지 대기
  await expect(locator).toHaveText('1');        // 텍스트 일치까지 대기
  await locator.waitFor({ state: 'hidden' });   // 사라질 때까지 대기 (예: login-modal)
  ```
- 네트워크 검증은 UI 유발 호출을 대상으로 `page.waitForResponse(...)`를 씁니다.
- **dialog 처리**: 비로그인 보호 동작의 `confirm()`, 주문/취소의 `alert()`는 리스너가 없으면 자동 dismiss되어 흐름이 끊깁니다. `page.on('dialog', d => d.accept())` 또는 단발 `page.once('dialog', ...)`로 처리하세요.

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
- [ ] 가격 필터 (에러 케이스 포함, 홈 `/`)
- [ ] 품절 뱃지 (재고를 0으로 낮춘 상품) 및 상세 페이지 버튼 disabled
- [ ] 회원가입 (중복확인 → 검증 에러 → 가입 → 로그인)
- [ ] 체크아웃 (배송지 검증 → 쿠폰 → 약관 게이팅 → 카드 결제 → 주문완료 주문번호)
- [ ] 결제 실패 재현 (테스트 카드 0001/0002/9999 → `payment-error`, 주문 미생성 + 외부 PG 목킹)
- [ ] 파일 업로드 (리뷰 이미지 썸네일 / 아바타 / 형식·용량 에러 `image-upload-error`)
- [ ] 주문내역 (행 확장 → 상태 진행 advance → 취소 confirm → 상태 뱃지 5종)
- [ ] 배송조회 (`/tracking` 송장 조회 / 없는 송장 `tracking-not-found` + 외부 택배 API 목킹)
- [ ] 내정보 (`/profile` 아바타 / 주소검색 폴백 `address-search-fallback`)
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
- [ ] 상품 상세 조회 (3, 4 → 500 / 16 → 404)
- [ ] user-actions API (cart_add/cart_update/cart_remove / order / wishlist)
- [ ] 쿠폰 API (성공 / EXPIRED10 400 / MIN_ORDER_NOT_MET 400 / 404)
- [ ] 리뷰 API (작성 201/COMMENT_TOO_SHORT 400 — 재작성도 201)
- [ ] 주문 조회/취소/상태전이 API (취소 시 재고 복원, ALREADY_CANCELED 409, advance → INVALID_TRANSITION)
- [ ] 결제 API (승인 201 / 거절·한도 402 / 타임아웃 504 / `?simulate=` 폴트주입 / paymentKey 사후조회)
- [ ] 업로드 API (201 / INVALID_FILE_TYPE 400 / FILE_TOO_LARGE 413)
- [ ] 배송추적 API (송장 조회 200 / TRACKING_NOT_FOUND 404 / orderId 인증)
- [ ] 재고 API (inventory, 주문/취소 후 실시간 반영)
- [ ] 관리자 CRUD API (DB 반영 — 목록/상세 즉시 반영)
- [ ] reset API (데이터 초기화)

### 권한 테스트
- [ ] 비로그인 시 로그인 유도 (confirm 다이얼로그)
- [ ] 일반 사용자 관리자 API 403 (버튼은 항상 표시, 클릭 후 권한 체크)
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
> **⚠️ 신규 기능 배포 후 1회:** 스키마가 늘었으므로(payments 테이블, users.avatar_url, reviews.images, orders.tracking_number/payment_key/payment_method/card_last4) Neon에 `npm run db:migrate`(비파괴 — 기존 데이터 유지)를 실행해야 결제/업로드/배송추적 엔드포인트가 500 없이 동작합니다. 데이터를 초기화해도 되면 `npm run db:init`.

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
- **`getByTestId()`**: `data-testid` 속성으로 요소를 찾습니다. 이 앱은 `data-testid`가 389개로 촘촘히 박혀 있으므로 **`getByTestId`/`getByRole`를 1급(우선) 셀렉터**로 안심하고 쓰세요. `#id`/`.class`/nth-child 남용은 지양합니다.

> **로그인 UI 요점**: 로그인/회원가입은 **모달**입니다. `user-menu-trigger`(계정 드롭다운)를 열고 `usermenu-login`으로 진입하며, 성공은 **모달 닫힘(`login-modal` hidden)** 으로 검증합니다.

### 홈 상품카드: 동일 testid에서 원하는 상품 고르기

홈(`/`) 상품카드는 **셀렉터 전략 연습을 위해 모든 카드가 같은 `data-testid`를 공유**합니다(카드마다 `product-card`/`product-name`/`price`/`view-detail-btn`/`wishlist-toggle` 등이 전부 같은 값이고 상품 id 접미사가 없습니다). 그래서 **원하는 카드를 먼저 좁힌(scoping) 뒤** 그 안의 버튼을 눌러야 합니다.

```ts
// 1) 상품명 텍스트로 카드를 스코핑 → 그 카드 안에서 버튼은 유일
const card = page.getByTestId('product-card')
  .filter({ hasText: '스마트 워치 헬스 트래커 방수 기능' });
await card.getByTestId('view-detail-btn').click();
await card.getByTestId('wishlist-toggle').click();

// 2) 접근성 이름으로 바로 클릭 (권장 — 사용자가 보는 이름 그대로)
await page.getByRole('button', { name: '스마트 워치 헬스 트래커 방수 기능 상품 상세' }).click();

// 3) 위치(nth) — 정렬 순서를 알 때
await page.getByTestId('product-card').nth(2).getByTestId('view-detail-btn').click();

// 4) 카테고리로 좁힌 뒤 상품명으로 특정
await page.locator('[data-product-category="전자기기"]')
  .filter({ hasText: '4K 웹캠' })
  .getByTestId('view-detail-btn').click();
```

> ⚠️ 안티패턴: `await page.getByTestId('view-detail-btn').click()` 처럼 카드 스코핑 없이 쓰면 카드가 모두 매칭되어(홈 기본 표시 19개) Playwright strict mode 위반(에러)이 납니다. 반드시 상품명·접근성 이름·카테고리·위치 중 하나로 카드를 특정하세요.

### 예제 1: 로그인 성공 테스트

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 올바른 아이디/비밀번호로 로그인이 성공하는지 확인합니다
test('로그인 성공 - 올바른 계정 정보 입력', async ({ page }) => {
  // 1. 메인 페이지로 이동합니다
  await page.goto('/');

  // 2. 계정 드롭다운을 열고 로그인 항목을 클릭합니다 (로그인은 모달로 열립니다)
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();

  // 3. 아이디/비밀번호 입력
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');

  // 4. 로그인 제출
  await page.getByTestId('login-submit-button').click();

  // 5. 성공 검증: 로그인 모달이 닫히는지로 확인합니다 (URL은 그대로 '/')
  await expect(page.getByTestId('login-modal')).toBeHidden();

  // 6. 추가로 로그인 상태 UI 확인: 계정 메뉴에 로그아웃 항목이 노출됩니다
  await page.getByTestId('user-menu-trigger').click();
  await expect(page.getByTestId('usermenu-logout')).toBeVisible();
});
```

### 예제 2: 로그인 실패 테스트

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 잘못된 계정 정보로 로그인이 실패하는지 확인합니다
test('로그인 실패 - 잘못된 계정 정보', async ({ page }) => {
  // 1. 메인 페이지로 이동
  await page.goto('/');

  // 2. 로그인 모달 열기
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();

  // 3. 존재하지 않는 아이디와 비밀번호 입력
  await page.getByTestId('username-input').fill('wronguser');
  await page.getByTestId('password-input').fill('wrongpass');

  // 4. 로그인 시도
  await page.getByTestId('login-submit-button').click();

  // 5. 에러 메시지가 표시되는지 확인 (모달은 열린 채 유지됩니다)
  await expect(page.getByTestId('login-error'))
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
  await page.getByTestId('category-전자기기').click();

  // 3. 홈 상품카드는 모두 같은 data-testid('product-card')를 공유합니다.
  //    필터가 적용되면 화면에 남은 카드 수가 곧 결과 개수입니다.
  const cards = page.getByTestId('product-card');

  // 4. 전자기기 카테고리는 6개의 상품이 있어야 합니다
  //    toHaveCount는 조건 충족까지 자동 재시도하는 web-first assertion입니다.
  await expect(cards).toHaveCount(6);
});
```

### 예제 4: 장바구니 담기 테스트 (로그인 필요)

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 로그인 후 원하는 상품을 골라 장바구니에 담는 전체 과정을 테스트합니다.
// 홈 카드는 모두 같은 data-testid('product-card')를 공유하므로 상품명으로 카드를 스코핑해
// 원하는 상품을 특정합니다. 홈 카드에는 담기 버튼이 없고 상세 페이지로만 이동하며,
// 담기 전 옵션(색상/사이즈)은 상세에서 필수 선택입니다.
// 주의: 장바구니는 서버(DB)에 계정 단위로 저장되므로, 이전 테스트에서 담은 상품이
// 남아 있을 수 있습니다. 필요하면 테스트 시작 전에 POST /api/reset으로 초기화하세요.
test('장바구니 담기 - 동일 testid 카드를 스코핑해 상세로 이동 후 담기', async ({ page }) => {
  // 담기 성공 시 뜨는 alert 등 다이얼로그를 자동 수락합니다
  page.on('dialog', (dialog) => dialog.accept());

  // 1. 로그인 과정 (계정 드롭다운 → 모달)
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-modal')).toBeHidden();  // 모달 닫힘으로 로그인 확인

  // 2. 원하는 상품 카드를 상품명으로 스코핑 → 그 카드의 상세 버튼 클릭
  const card = page.getByTestId('product-card')
    .filter({ hasText: '스마트 워치 헬스 트래커 방수 기능' });
  await card.getByTestId('view-detail-btn').click();

  // 3. 상세 페이지 진입 확인
  await expect(page).toHaveURL(/\/product\/\d+/);

  // 4. 옵션(색상/사이즈)을 선택한 뒤 장바구니에 담습니다
  await page.getByTestId('option-color-블랙').click();
  await page.getByTestId('option-size-M').click();
  await page.locator('#add-to-cart-button').click();

  // 5. 장바구니 페이지로 이동해 담긴 상품(productId 기준 testid) 확인
  //    '스마트 워치 헬스 트래커 방수 기능'은 productId 2입니다.
  await page.getByTestId('cart-button').click();
  await expect(page.locator('#cart-page')).toBeVisible();
  await expect(page.getByTestId('cart-item-2')).toBeVisible();
});
```

### 예제 5: 관리자 권한 테스트

```typescript
import { test, expect } from '@playwright/test';

// 이 테스트는 일반 사용자와 관리자의 권한 차이를 확인합니다
// 참고: 관리자 버튼(#home-admin-btn)은 권한과 무관하게 항상 표시되고,
// 권한 체크는 관리자 페이지 진입 후 API(401/403)에서 발생합니다.
test('권한 테스트 - 일반 사용자는 관리자 API에서 403', async ({ page }) => {
  // 1. 일반 사용자로 로그인 (계정 드롭다운 → 모달)
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-modal')).toBeHidden();

  // 2. 관리자 버튼은 일반 사용자에게도 보입니다
  await expect(page.getByTestId('admin-button')).toBeVisible();

  // 3. 일반 사용자 토큰(localStorage)으로 관리자 API 호출 시 403이 발생해야 합니다
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const response = await page.request.get('/api/admin', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(403);
});

test('권한 테스트 - 관리자는 관리자 페이지 정상 접근', async ({ page }) => {
  // 1. 관리자 계정으로 로그인
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  await page.getByTestId('username-input').fill('admin');
  await page.getByTestId('password-input').fill('1234');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-modal')).toBeHidden();

  // 2. 관리자 버튼(#home-admin-btn) 클릭 → 상품 관리 목록이 보여야 합니다
  await page.locator('#home-admin-btn').click();
  await expect(page.getByTestId('admin-row-1')).toBeVisible();
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

### 예제 7: 순수 API 검증 — APIRequestContext (baseURL + 토큰 주입)

> **구분**: *순수 API 검증*은 `request` 픽스처(또는 `request.newContext`)를 씁니다. *UI 동작이 유발한 네트워크 호출* 검증만 `page.waitForResponse(...)`를 씁니다. `fetch()`/axios/curl은 기본 도구로 쓰지 않습니다.

```typescript
import { test, expect } from '@playwright/test';

// baseURL은 config에서 http://localhost:5173로 설정 → '/api'는 vite가 3000으로 프록시합니다.
// 요청은 상대경로 '/api/...'로 보냅니다.
test('상품 목록 API', async ({ request }) => {
  const res = await request.get('/api/products');
  expect(res).toBeOK();
  const { products } = await res.json();
  expect(products.length).toBeGreaterThan(0);
});

test('내 주문 (인증 필요) - 토큰 발급 후 헤더 주입', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: 'http://localhost:5173' });
  const { token } = await (await anon.post('/api/login',
    { data: { username: 'test', password: '1234' } })).json();
  const api = await playwright.request.newContext({
    baseURL: 'http://localhost:5173',
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  expect((await api.get('/api/orders')).status()).toBe(200);
});
```

### playwright.config.ts (별도 자동화 레포)

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'http://localhost:5173',   // '/api'는 vite가 3000으로 프록시
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  retries: process.env.CI ? 2 : 0,
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' } },
  ],
  webServer: [
    { command: 'npm run start-api', port: 3000, reuseExistingServer: !process.env.CI },
    { command: 'npm run dev',       port: 5173, reuseExistingServer: !process.env.CI },
  ],
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

2. **요소 대기(web-first)**: 고정 sleep(`waitForTimeout`) 대신 assertion으로 대기
   ```typescript
   await expect(page.getByTestId('cart-badge')).toHaveText('1');  // 조건 충족까지 자동 재시도
   await page.getByTestId('login-modal').waitFor({ state: 'hidden' });
   ```

3. **콘솔 로그 확인**: 브라우저 콘솔의 메시지 캡처
   ```typescript
   page.on('console', msg => console.log(msg.text()));
   ```

4. **네트워크 요청 감시**: API 호출 모니터링
   ```typescript
   page.on('request', request => console.log(request.url()));
   ```
