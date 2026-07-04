# QA 자동화 프로젝트 - 최종 가이드

## 🎯 프로젝트 목적
- QA 자동화 연습
- 포트폴리오 데모
- Playwright / Selenium 학습

## 📦 기술 스택
- **Frontend**: React 19 (Vite)
- **Backend**: Vercel Serverless Functions (`api/*.js`)
- **Database**: Postgres (Neon 무료 플랜) — 모든 데이터가 DB에 영속 저장
- **배포**: Vercel (무료 플랜) + Neon Postgres

## 🚀 빠른 시작

### 1. DB 연결 설정 (필수)
```bash
# .env 파일에 Postgres 연결 문자열 설정
# DATABASE_URL=postgres://...
# (미설정 시 모든 데이터 API가 503 { code: "DB_NOT_CONFIGURED" } 반환)

# 최초 1회: 스키마 생성 + 시드 데이터 투입
npm run db:init
```

### 2. 로컬 개발
```bash
npm install
npm run dev
# → http://localhost:5173 (vite가 /api 요청을 3000 포트로 프록시)
```

### 3. API 서버
```bash
npm run start-api
# → http://localhost:3000/api/* (server.js가 api/*.js 핸들러를 Express로 마운트)
```

### 4. QA 가이드 확인
웹사이트 접속 → 우측 상단 "📘 QA 가이드" 버튼 클릭

## 🔑 테스트 계정
| 계정 | ID | PW | 역할 | 설명 |
|------|----|----|------|------|
| 일반 | test | 1234 | USER | 일반 사용자 |
| 관리자 | admin | 1234 | ADMIN | 모든 권한 |
| 차단 | test2 | 1234 | BLOCKED | 로그인 시 403 에러 테스트용 (의도적) |

> 회원가입(`/signup`, `POST /api/signup`)으로 직접 만든 계정도 USER 역할로 정상 로그인됩니다.
> 아이디는 영문 소문자+숫자 4~12자, 비밀번호는 8자 이상 + 영문/숫자 각 1자 이상이어야 합니다.
> `POST /api/reset` 실행 시 가입 계정은 삭제되고 시드 계정만 남습니다.

> 참고(REQ-1): 앱 진입 시 토큰이 초기화되므로 딥링크로 어느 페이지에 접근해도 항상 비로그인 상태에서 시작합니다.

## 💥 의도적 오류 케이스

### 상품 상세 API (`GET /api/products/:id`)
| 상품 ID | 응답 | 설명 |
|---------|------|------|
| 1, 2, 5-15, 17, 18 | 200 OK | 정상 |
| 3, 4 | 500 Server Error | 의도적 장애 |
| 16 | 404 Not Found | 목록에는 있지만 상세는 의도적으로 없음 |
| 99 등 미존재 ID | 404 Not Found | 존재하지 않음 (`PRODUCT_NOT_FOUND`) |
| 0, -1, abc | 400 Bad Request | id 파라미터 오류 (`INVALID_ID`) |

### 재고 / 주문
| 케이스 | 동작 |
|--------|------|
| 상품 id 3, 8, 18 | 씨드 기준 재고 0 (품절) — 품절 뱃지/재고부족 연습용 |
| 주문 수량 > 재고 | 409 (`INSUFFICIENT_STOCK`) |
| 상품 3, 4 주문 | 422 (`ORDER_BLOCKED_PRODUCT`) — 의도적 주문 차단 |
| 빈 주문 (장바구니 비어있음 + items 생략) | 400 (`EMPTY_ORDER`) |

### 쿠폰 API (`POST /api/coupons`)
| 쿠폰 코드 | 조건 | 동작 |
|-----------|------|------|
| WELCOME10 | 제한 없음 | 10% 할인 (최대 20,000원) |
| SAVE5000 | 최소 주문 30,000원 | 5,000원 정액 할인 |
| VIP20 | 최소 주문 100,000원 | 20% 할인 (최대 50,000원) |
| EXPIRED10 | - | 400 (`COUPON_EXPIRED`) — 의도적 만료 픽스처 |
| 없는 코드 | - | 404 (`COUPON_NOT_FOUND`) |
| 최소 주문 금액 미달 | - | 400 (`MIN_ORDER_NOT_MET`) |

### 로그인 API  
| 입력 | 응답 |
|------|------|
| 빈 입력 | 400 Bad Request |
| 잘못된 계정 | 401 Unauthorized |
| 차단 계정 (test2) | 403 Forbidden |

## 📋 주요 UI 셀렉터

> URL 라우팅: `/`, `/login`, `/signup`, `/products`, `/product/:id`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/order-complete`, `/admin` — 전부 딥링크로 직접 접근할 수 있습니다.

### 홈페이지
```typescript
// 버튼
page.locator('#qa-guide-btn')      // QA 가이드
page.locator('#home-search-btn')   // 검색
page.locator('#home-cart-btn')     // 장바구니
page.locator('#home-admin-btn')    // 관리자 (항상 표시, 비ADMIN 클릭 시 권한 오류)
page.locator('#home-login')        // 로그인
page.locator('#home-logout')       // 로그아웃
page.locator('#home-signup-btn')   // 회원가입 (비로그인 시)
page.locator('#home-wishlist-btn') // 위시리스트 (로그인 시)
page.locator('#home-orders-btn')   // 주문내역 (로그인 시)

// 입력
page.locator('#home-search')       // 검색창
page.locator('#sort-select')       // 정렬 셀렉트

// 카테고리
page.locator('#category-전체')
page.locator('#category-전자기기')
page.locator('#category-액세서리')
page.locator('#category-생활')

// 상품 카드 부가 요소
page.locator('[data-testid="soldout-badge-3"]')    // 품절 뱃지 (씨드 기준 3/8/18)
page.locator('[data-testid="wishlist-toggle-1"]')  // 위시리스트 하트 토글 (aria-pressed)
```

### 상품 목록 페이지 (/products)
```typescript
page.locator('#sort-select')                            // 정렬
page.locator('#min-price')                              // 최소 가격 입력
page.locator('#max-price')                              // 최대 가격 입력
page.locator('[data-testid="apply-price-filter"]')      // 가격 필터 적용
page.locator('[data-testid="reset-price-filter"]')      // 가격 필터 초기화
page.locator('[data-testid="price-filter-error"]')      // 가격 필터 에러
page.locator('[data-testid="search-result-count"]')     // 검색 결과 개수
page.locator('[data-testid="soldout-badge-8"]')         // 품절 뱃지
page.locator('[data-testid="wishlist-toggle-1"]')       // 위시리스트 토글
```

### 로그인 페이지
```typescript
page.locator('#login-username')    // 아이디 입력
page.locator('#login-password')    // 비밀번호 입력
page.locator('#login-submit')      // 로그인 버튼
page.locator('#login-error')       // 에러 메시지
page.locator('#back-to-home')      // 홈으로
```

### 회원가입 페이지 (/signup)
```typescript
page.locator('#signup-username')                            // 아이디 입력
page.locator('#username-check-btn')                         // 아이디 중복확인 버튼
page.locator('[data-testid="username-check-result"]')       // 중복확인 결과
page.locator('#signup-password')                            // 비밀번호
page.locator('#signup-password-confirm')                    // 비밀번호 확인
page.locator('#signup-email')                               // 이메일 (선택)
page.locator('#signup-submit')                              // 가입하기 버튼
page.locator('[data-testid="signup-username-error"]')       // 필드별 에러 (role=alert)
page.locator('[data-testid="signup-email-error"]')          // 이메일 에러
page.locator('[data-testid="signup-error"]')                // 폼 전체 에러
page.locator('[data-testid="signup-success"]')              // 가입 성공 메시지
```

### 상품
```typescript
page.locator('[data-product-id="1"]')                  // 상품 카드
page.locator('.product-card')                          // 모든 상품
page.locator('[data-testid="product-card-1"]')         // 상품 카드 (testid)
page.locator('[data-testid="view-detail-btn-1"]')      // 상세보기 버튼
page.locator('[data-testid="add-to-cart-btn-1"]')      // 장바구니 담기 버튼
```

### 상품 상세 페이지 (/product/:id)
```typescript
// 이미지 갤러리
page.locator('[data-testid="product-main-image"]')     // 메인 이미지
page.locator('[data-testid="gallery-thumb-0"]')        // 썸네일 (0~2)

// 탭 (상세설명/상품스펙/배송·교환/리뷰)
page.locator('#tab-description')                       // 상세설명 탭 버튼
page.locator('#tab-specs')                             // 상품스펙 탭 버튼
page.locator('#tab-shipping')                          // 배송·교환 탭 버튼
page.locator('#tab-reviews')                           // 리뷰 탭 버튼
page.locator('[data-testid="tab-panel-description"]')  // 탭 패널 (specs/shipping/reviews 동일 패턴)
page.locator('[data-testid="spec-row-0"]')             // 스펙 행 (인덱스 기준)

// 재고
page.locator('#stock-info')                            // 재고 정보 (/api/inventory 연동)
page.locator('[data-testid="stock-badge"]')            // 재고 뱃지 (품절 시 장바구니/바로구매 disabled)

// 평점 & 리뷰
page.locator('[data-testid="rating-average"]')         // 평균 평점
page.locator('[data-testid="rating-bar-5"]')           // 평점 분포 바 (5~1)
page.locator('[data-testid="star-input-5"]')           // 리뷰 별점 입력 (1~5)
page.locator('#review-comment')                        // 리뷰 내용 입력
page.locator('#review-submit')                         // 리뷰 등록 버튼
page.locator('[data-testid="review-form-message"]')    // 리뷰 폼 결과 메시지 (in-DOM)
page.locator('#review-sort')                           // 리뷰 정렬 (latest|rating)
page.locator('[data-testid="review-item-1"]')          // 리뷰 항목 (리뷰 id 기준)
page.locator('[data-testid="review-load-more"]')       // 리뷰 더보기
```

### 장바구니 페이지 (/cart)
장바구니는 **서버 장바구니**(DB 저장)로 동작하며 로그인이 필요합니다.
```typescript
page.locator('#cart-page')                          // 장바구니 페이지 컨테이너
page.locator('[data-testid="cart-item-1"]')         // 장바구니 항목 (상품 id 기준)
page.locator('[data-testid="cart-increase-1"]')     // 수량 증가
page.locator('[data-testid="cart-decrease-1"]')     // 수량 감소
page.locator('[data-testid="cart-qty-1"]')          // 수량 표시
page.locator('[data-testid="cart-subtotal-1"]')     // 상품별 소계
page.locator('[data-testid="cart-remove-1"]')       // 상품 삭제
page.locator('[data-testid="cart-total"]')          // 총 금액
page.locator('[data-testid="checkout-button"]')     // 주문하기 → /checkout 이동 (#checkout-btn 도 동일 요소)
page.locator('[data-testid="cart-empty"]')          // 빈 장바구니 표시
```

### 체크아웃 페이지 (/checkout)
```typescript
page.locator('[data-testid="checkout-item-1"]')     // 주문 상품 행 (상품 id 기준)

// 배송 정보
page.locator('#checkout-name')                      // 받는 사람
page.locator('#checkout-phone')                     // 연락처
page.locator('#checkout-address')                   // 주소
page.locator('#checkout-memo')                      // 배송 메모 (선택)
page.locator('[data-testid="checkout-name-error"]') // 필드별 에러 (phone/address 동일 패턴)

// 쿠폰
page.locator('#coupon-code')                        // 쿠폰 코드 입력
page.locator('[data-testid="coupon-apply-btn"]')    // 쿠폰 적용
page.locator('[data-testid="coupon-message"]')      // 쿠폰 적용 결과 메시지
page.locator('[data-testid="coupon-remove-btn"]')   // 쿠폰 제거

// 결제수단 & 약관
page.locator('#payment-card')                       // 카드 (라디오)
page.locator('#payment-bank')                       // 계좌이체 (라디오)
page.locator('#payment-kakao')                      // 카카오페이 (라디오)
page.locator('#agree-terms')                        // 약관 동의 (체크 전 결제 버튼 비활성)
page.locator('#place-order-btn')                    // 결제하기 버튼

// 금액 요약 & 상태
page.locator('[data-testid="checkout-subtotal"]')   // 상품 금액
page.locator('[data-testid="checkout-discount"]')   // 할인 금액
page.locator('[data-testid="checkout-final"]')      // 최종 결제 금액
page.locator('[data-testid="checkout-error"]')      // 주문 실패 에러
page.locator('[data-testid="checkout-empty"]')      // 주문할 상품 없음
```

### 주문내역 페이지 (/orders)
```typescript
page.locator('[data-testid="order-item-ORD-20260701-0001"]')    // 주문 행 (클릭 시 상세 확장)
page.locator('[data-testid="order-detail-ORD-20260701-0001"]')  // 확장된 주문 상세
page.locator('[data-testid="order-status-ORD-20260701-0001"]')  // 주문 상태 (결제완료/취소됨)
page.locator('[data-testid="order-cancel-ORD-20260701-0001"]')  // 취소 버튼 (상세 확장 후에만 노출, confirm() 다이얼로그)
page.locator('[data-testid="order-cancel-message"]')            // 취소 결과 메시지
page.locator('[data-testid="orders-empty"]')                    // 주문 없음
page.locator('[data-testid="orders-login-required"]')           // 로그인 필요 안내
```

### 위시리스트 페이지 (/wishlist)
```typescript
page.locator('[data-testid="wishlist-item-1"]')            // 위시리스트 항목 (상품 id 기준)
page.locator('[data-testid="wishlist-add-to-cart-1"]')     // 장바구니 담기
page.locator('[data-testid="wishlist-remove-1"]')          // 위시리스트에서 제거
page.locator('[data-testid="wishlist-empty"]')             // 빈 위시리스트
page.locator('[data-testid="wishlist-login-required"]')    // 로그인 필요 안내
```

### 주문완료 페이지 (/order-complete)
```typescript
page.locator('[data-testid="order-complete-id"]')       // 주문번호 (ORD-yyyymmdd-XXXX)
page.locator('[data-testid="order-complete-amount"]')   // 결제 금액
page.locator('[data-testid="go-orders-btn"]')           // 주문내역으로 이동
```

### 관리자 페이지
```typescript
page.locator('[data-testid="admin-row-1"]')     // 상품 행 (상품 id 기준)
page.locator('[data-testid="edit-btn-1"]')      // 수정 버튼
page.locator('[data-testid="toggle-btn-1"]')    // 활성화/비활성화 토글
page.locator('[data-testid="delete-btn-1"]')    // 삭제 버튼
```

## 🎬 Playwright 테스트 예시 (TypeScript)

### 초보자를 위한 설명
아래 예제들은 Playwright를 사용한 자동화 테스트 코드입니다. 각 테스트는 실제 사용자가 웹사이트를 사용하는 것처럼 동작하며, 예상한 결과가 나오는지 자동으로 검증합니다.

> 참고: 본 저장소는 테스트 대상(SUT)이며 테스트 코드를 포함하지 않습니다. 아래 파일명(`test/login.spec.ts` 등)은 자동화 코드를 작성하는 **별도 저장소** 기준의 예시입니다.

### test/login.spec.ts
```typescript
import { test, expect } from '@playwright/test';

/**
 * 로그인 성공 테스트
 * 목적: 올바른 계정 정보로 로그인이 정상적으로 되는지 확인
 * 
 * 테스트 흐름:
 * 1. 홈페이지 접속
 * 2. 로그인 버튼 클릭
 * 3. 아이디/비밀번호 입력
 * 4. 로그인 제출
 * 5. 로그아웃 버튼이 보이는지 확인 (= 로그인 성공)
 */
test('로그인 성공', async ({ page }) => {
  // 홈페이지로 이동
  await page.goto('/');
  
  // 로그인 버튼 클릭 (홈페이지 우측 상단)
  await page.click('#home-login');
  
  // 아이디 입력창에 'test' 입력
  await page.fill('#login-username', 'test');
  
  // 비밀번호 입력창에 '1234' 입력
  await page.fill('#login-password', '1234');
  
  // 로그인 버튼 클릭
  await page.click('#login-submit');
  
  // 로그인 성공 시 로그아웃 버튼이 나타나야 함
  // toBeVisible()은 해당 요소가 화면에 보이는지 검증
  await expect(page.locator('#home-logout')).toBeVisible();
});

/**
 * 로그인 실패 테스트
 * 목적: 잘못된 계정 정보로 로그인 시 에러 메시지가 표시되는지 확인
 * 
 * 테스트 흐름:
 * 1. 홈페이지 접속
 * 2. 로그인 페이지 이동
 * 3. 존재하지 않는 아이디/비밀번호 입력
 * 4. 로그인 시도
 * 5. 에러 메시지가 표시되는지 확인
 */
test('잘못된 계정 로그인 실패', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  // 존재하지 않는 계정 정보 입력
  await page.fill('#login-username', 'wrong');
  await page.fill('#login-password', 'wrong');
  await page.click('#login-submit');
  
  // 에러 메시지가 표시되고, 특정 텍스트를 포함하는지 확인
  // toContainText()는 요소에 해당 텍스트가 포함되어 있는지 검증
  await expect(page.locator('#login-error'))
    .toContainText('아이디 또는 비밀번호 오류');
});
```

### test/products.spec.ts
```typescript
/**
 * 상품 500 에러 테스트
 * 목적: 특정 상품(ID 3번)을 조회할 때 500 에러가 발생하는지 확인
 * 
 * 배경: ID 3번 상품은 의도적으로 500 에러를 발생시키도록 설정되어 있음
 * 
 * 테스트 흐름:
 * 1. 브라우저의 alert 창을 감지하는 리스너 등록
 * 2. 상품 3번의 상세보기 버튼 클릭
 * 3. alert 메시지에 '500'이 포함되어 있는지 확인
 * 4. alert 창 닫기 (accept)
 */
test('상품 3번 500 에러', async ({ page }) => {
  // dialog 이벤트: 브라우저의 alert, confirm, prompt 창이 뜰 때 발생
  page.on('dialog', async dialog => {
    // alert 메시지에 '500'이 포함되어 있는지 검증
    expect(dialog.message()).toContain('500');
    // alert 창의 '확인' 버튼 클릭
    await dialog.accept();
  });
  
  await page.goto('/');
  // data-product-id="3"인 상품의 상세보기 버튼 클릭
  await page.click('[data-product-id="3"] button.view-btn');
});

/**
 * 존재하지 않는 상품 404 에러 테스트
 * 목적: API 레벨에서 존재하지 않는 상품 조회 시 404 에러가 발생하는지 확인
 * 
 * 테스트 흐름:
 * 1. API를 직접 호출 (UI 거치지 않음)
 * 2. HTTP 상태 코드가 404인지 확인
 * 3. 응답 본문의 에러 코드가 'PRODUCT_NOT_FOUND'인지 확인
 */
test('존재하지 않는 상품 404', async ({ page }) => {
  // page.request.get()을 사용하여 API 직접 호출
  const response = await page.request.get('/api/products/99');
  
  // HTTP 상태 코드 검증
  expect(response.status()).toBe(404);
  
  // 응답을 JSON으로 파싱
  const body = await response.json();
  
  // 에러 코드 검증
  expect(body.code).toBe('PRODUCT_NOT_FOUND');
});
```

### test/permissions.spec.ts
```typescript
/**
 * 일반 사용자 권한 테스트
 * 목적: 일반 사용자(test)가 관리자 페이지 접근 시 403으로 차단되는지 확인
 * 
 * 배경: 관리자 버튼은 항상 표시되지만, 클릭 시 GET /api/admin 권한 체크에서
 *       비ADMIN 계정은 403 + 권한 오류 alert이 발생함
 * 
 * 테스트 흐름:
 * 1. 일반 사용자(test) 계정으로 로그인
 * 2. 관리자 버튼 클릭
 * 3. GET /api/admin 응답이 403인지, 권한 오류 alert이 뜨는지 확인
 */
test('일반 사용자는 관리자 페이지 접근 시 403', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  // 일반 사용자 계정 (Role: USER)
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // 권한 오류 alert 감지
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('관리자 권한');
    await dialog.accept();
  });
  
  // 관리자 버튼 클릭과 동시에 /api/admin 응답 캐치
  const [adminResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('#home-admin-btn')
  ]);
  
  expect(adminResponse.status()).toBe(403);
});

/**
 * 관리자 권한 테스트
 * 목적: 관리자(admin) 계정은 관리자 페이지에 정상 접근되는지 확인
 * 
 * 테스트 흐름:
 * 1. 관리자(admin) 계정으로 로그인
 * 2. 관리자 버튼 클릭
 * 3. GET /api/admin 응답이 200인지 확인
 */
test('관리자는 관리자 페이지 접근 가능', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  // 관리자 계정 (Role: ADMIN)
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  const [adminResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('#home-admin-btn')
  ]);
  
  expect(adminResponse.status()).toBe(200);
});
```

### test/api.spec.ts
```typescript
/**
 * 재고 API HEAD 메서드 테스트
 * 목적: HEAD 메서드를 사용한 재고 조회가 정상 동작하는지 확인
 * 
 * 배경: HEAD 메서드는 응답 본문(body) 없이 헤더만 받아옴
 *       재고 수량은 HTTP 헤더(x-stock-count)로 전달됨
 * 
 * 테스트 흐름:
 * 1. HEAD 메서드로 재고 API 호출
 * 2. HTTP 상태 코드가 200인지 확인
 * 3. 응답 헤더에 'x-stock-count'가 있는지 확인
 */
test('재고 API HEAD 메서드', async ({ page }) => {
  // page.request.head()는 HEAD 메서드로 HTTP 요청을 보냄
  const response = await page.request.head(
    '/api/inventory?productId=1'
  );
  
  // HTTP 상태 코드 검증
  expect(response.status()).toBe(200);
  
  // 응답 헤더에서 재고 수량 헤더가 존재하는지 확인
  // toBeDefined()는 값이 undefined가 아닌지 검증
  expect(response.headers()['x-stock-count']).toBeDefined();
});

/**
 * 리뷰 작성 유효성 검사 테스트
 * 목적: 너무 짧은 리뷰(10자 미만)를 작성할 때 에러가 발생하는지 확인
 * 
 * 배경: 리뷰 작성 시 코멘트는 최소 10자 이상이어야 함
 * 
 * 테스트 흐름:
 * 1. 로그인하여 인증 토큰 획득
 * 2. localStorage에서 토큰 추출
 * 3. 토큰을 포함하여 리뷰 작성 API 호출 (짧은 코멘트)
 * 4. 400 에러 발생 확인
 * 5. 에러 코드가 'COMMENT_TOO_SHORT'인지 확인
 */
test('리뷰 작성 짧은 코멘트 검증', async ({ page }) => {
  // 1단계: 로그인하여 인증 토큰 얻기
  await page.goto('/');
  await page.click('#home-login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // 2단계: localStorage에서 저장된 토큰 가져오기
  // page.evaluate()는 브라우저 컨텍스트에서 JavaScript 코드를 실행
  const token = await page.evaluate(() => 
    localStorage.getItem('token')
  );
  
  // 3단계: 리뷰 작성 API 호출 (인증 토큰 포함)
  const response = await page.request.post('/api/reviews', {
    headers: { 
      Authorization: `Bearer ${token}` // Bearer 토큰 인증 방식
    },
    data: {
      productId: 1,
      rating: 5,
      comment: '좋아요' // 4자 - 10자 미만이므로 실패해야 함
    }
  });
  
  // 4단계: HTTP 상태 코드가 400(Bad Request)인지 확인
  expect(response.status()).toBe(400);
  
  // 5단계: 에러 응답 본문 검증
  const body = await response.json();
  expect(body.code).toBe('COMMENT_TOO_SHORT');
});
```

## 📚 사용 가능한 API (14개 라우트)

| API | 메서드 | 설명 | 인증 |
|-----|--------|------|------|
| /api/login | POST | 로그인 (`{token, user}` 반환) | ❌ |
| /api/signup | POST | 회원가입 (201) / 검증 실패 400 (`INVALID_USERNAME`/`INVALID_PASSWORD`/`INVALID_EMAIL`) / 중복 409 (`USERNAME_TAKEN`) | ❌ |
| /api/signup?username=x | GET | 아이디 중복 확인 (`{username, available}`) | ❌ |
| /api/products | GET | 상품 목록 (18개+, `?category=` 필터) — description/specs/images/tags/stock 포함 | ❌ |
| /api/products/:id | GET | 상품 상세 (의도적: 3,4 → 500 / 16 → 404) | ❌ |
| /api/search | GET | 상품 검색 (`q`, `category`, `minPrice`, `maxPrice`, `sort`) — 전체 18개 상품 대상 | ❌ |
| /api/inventory | GET/HEAD | 재고 조회 (`X-Stock-Count`/`ETag` 헤더, 주문/취소 시 실시간 반영) | ❌ |
| /api/reviews | GET | 리뷰 목록 (`productId`, `username`, `minRating`, `sort`, `limit`, `offset`) | ❌ |
| /api/reviews | POST | 리뷰 작성 (201 / 10자 미만 400 `COMMENT_TOO_SHORT` / 중복 409 `REVIEW_ALREADY_EXISTS`) | ✅ |
| /api/reviews | PATCH/DELETE | 리뷰 수정/삭제 (소유자 또는 admin) | ✅ |
| /api/coupons | POST | 쿠폰 검증 (`{code, orderAmount}` → 할인액 계산) | ❌ |
| /api/user-actions | POST | `action`으로 분기: cart_add/cart_update/cart_remove/wishlist_add/wishlist_remove/order | ✅ |
| /api/user-actions?type=cart\|wishlist | GET | 서버 장바구니/위시리스트 조회 | ✅ |
| /api/orders | GET | 본인 주문 목록 (admin은 전체 + username 포함) | ✅ |
| /api/orders/:id | GET | 주문 상세 (shipping 포함, 타인 주문은 404) | ✅ |
| /api/orders/:id | PATCH | `{action:'cancel'}` 주문 취소 (재고 복원, 재취소 시 409 `ALREADY_CANCELED`) | ✅ |
| /api/admin | GET/POST/PUT/DELETE | 상품 CRUD — DB에 반영되어 목록/상세에 즉시 노출 | ✅ ADMIN |
| /api/status-codes | GET | 원하는 HTTP 상태 코드 반환 (연습용, DB 불필요) | ❌ |
| /api/reset | POST | 모든 데이터를 시드 상태로 초기화 (TRUNCATE + 재시드) | ❌ |

> 주문(`action: 'order'`) 참고: `items`를 생략하면 서버 장바구니 전체를 주문하고 장바구니를 비웁니다.
> `couponCode`, `shipping: {name, phone, address, memo}`를 함께 보낼 수 있으며, 성공 시 201과
> `{order: {id: 'ORD-yyyymmdd-XXXX', totalPrice, discount, finalPrice, status: 'PAID'}, items}`를 반환합니다.
> 가격은 항상 서버(DB)가 결정하며 클라이언트가 보낸 가격은 무시됩니다.

## 🎓 학습 가능한 QA 역량

1. **셀렉터 전략**: ID, class, ARIA 활용
2. **상태 검증**: loading, disabled, error
3. **API 테스팅**: HTTP 메서드, 상태 코드, 응답 구조
4. **권한 테스트**: 인증/인가 플로우
5. **에러 시나리오**: 400/401/403/404/500
6. **폼 검증**: Validation, 에러 메시지
7. **E2E 시나리오**: 전체 사용자 플로우

## 📝 변경 이력

### v2.0 (2026-07-04)
- ✅ Postgres(Neon) 영속 저장으로 전환 — 메모리 상태 제거, `POST /api/reset`으로 시드 복원
- ✅ 회원가입 (`/signup`, `POST/GET /api/signup`)
- ✅ 체크아웃 + 쿠폰 (`/checkout`, `POST /api/coupons`)
- ✅ 주문내역/주문취소 (`/orders`, `GET/PATCH /api/orders`)
- ✅ 위시리스트 페이지 (`/wishlist`) 및 카드 하트 토글
- ✅ 상품 상세 강화: 이미지 갤러리, 탭(설명/스펙/배송/리뷰), 평점 분포, 리뷰 작성 폼
- ✅ URL 라우팅(딥링크) 지원

### v1.1 (2026-02-03)
- ✅ QA 가이드 컴포넌트 추가
- ✅ 403 Forbidden 에러 케이스 추가 (상품 ID 999) ※ 이후 제거됨 - 현재 미존재 ID는 모두 404
- ✅ HomePage에 QA 가이드 버튼 추가
- ✅ 모든 주요 UI에 id/class/aria-label 정리

### v1.0 (기존)
- 로그인/상품/장바구니/주문 기본 기능
- 관리자 페이지 (CRUD)
- API 기본 구조

## 💾 상태 모델 (Postgres 영속)

- 모든 상태(상품/계정/리뷰/장바구니/위시리스트/주문/쿠폰)는 **Postgres에 영속 저장**됩니다. 서버 메모리 상태는 없습니다.
- Vercel 배포본(공유 연습 사이트)에서도 mutation이 그대로 유지되므로 read-back 검증(작성 → 새로고침 → 확인)을 배포 환경에서 바로 연습할 수 있습니다.
- `DATABASE_URL` 미설정 시 모든 데이터 엔드포인트가 503 `{ code: "DB_NOT_CONFIGURED" }`를 반환합니다 (`/api/status-codes`는 DB 불필요).
- `POST /api/reset` 으로 언제든 시드 상태로 되돌릴 수 있습니다 — 가입 계정/주문/리뷰/장바구니/위시리스트가 전부 초기화되고 의도적 픽스처(재고 0, EXPIRED10 쿠폰 등)가 복원됩니다. 여러 사람이 공유하는 사이트이므로 reset 시 다른 사용자의 데이터도 함께 초기화되는 점에 유의하세요.
- 스키마/시드 정의: `api/_lib/schema.js`, `api/_lib/seedData.js` (최초 1회 `npm run db:init`)

## 🔍 참고

- ProductDetail 페이지는 inventory API(`#stock-info`)와 reviews API(리뷰 탭 `#tab-reviews`, `[data-testid="review-item-{id}"]`)가 연동되어 있습니다.
- 상품 목록 필터링은 클라이언트에서 수행되며, 빈 검색어 제출 시 `/api/search?q=` 를 호출해 400 오류를 표시합니다 (의도적 연습 케이스). search API 자체는 직접 호출로 테스트하세요.
- status-codes API는 Playwright/Postman 직접 호출로 다양한 HTTP 상태 코드를 연습할 수 있습니다.

## 📞 문의
프로젝트 관련 문의는 프로젝트 README 참고

---
**만든 날짜**: 2026-02-03  
**목적**: QA 자동화 연습 & 포트폴리오
