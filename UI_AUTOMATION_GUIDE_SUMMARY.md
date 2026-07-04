# 🎨 UI 자동화 검증 가이드 (요약본)

> **⚠️ 본 레포는 "테스트 대상 사이트"입니다.** 자동화(테스트) 코드는 여러분의 **별도 테스트 레포**에 작성하고, `http://localhost:5173`(vite dev 서버)을 대상으로 실행하세요. 이 레포 안에 `tests/` 디렉터리를 만들지 않습니다.
>
> **본 사이트 핵심 정보 (코드 기준 검증됨):**
> - 테스트 계정: `test`/`1234`(일반), `admin`/`1234`(관리자), `test2`/`1234`(차단 계정 → 로그인 403, 의도적). 회원가입으로 만든 계정도 사용 가능
> - 라우트(전부 딥링크 가능): `/`, `/login`, `/signup`, `/products`, `/product/:id`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/order-complete`, `/admin`
> - 로그인 셀렉터: `#login-username`, `#login-password`, `#login-submit` / 홈 헤더: `#home-login`·`#home-signup-btn`(비로그인), `#home-logout`·`#home-wishlist-btn`·`#home-orders-btn`(로그인), `#home-admin-btn`(항상 표시)
> - 주요 data-testid: `login-submit-button`, `loading-spinner`, `cart-item-{productId}`, `cart-increase-{productId}`, `cart-decrease-{productId}`, `cart-remove-{productId}`, `cart-total`, `checkout-button`(= `#checkout-btn` → `/checkout` 이동), `admin-row-{id}`, `view-detail-btn-{id}`, `add-to-cart-btn-{id}`, `wishlist-toggle-{id}`(하트, `aria-pressed`), `soldout-badge-{id}`(씨드 기준 3/8/18)
> - **REQ-1(의도적 제약):** 앱 진입 시 항상 로그아웃 상태로 초기화 → `storageState` 재사용 불가, 각 테스트에서 UI 로그인 필요. 딥링크(`/orders` 등) 직후에도 항상 비로그인 상태
> - **서버 장바구니(계정 영속):** 장바구니는 서버 DB에 계정 단위로 저장 → 다른 브라우저/컨텍스트에서 로그인해도 유지. localStorage 클리어로 초기화되지 않음 (`POST /api/reset` 또는 `cart_update` 수량 0으로 비움)
> - 본 사이트는 `alert()`/`confirm()`을 많이 사용(장바구니 담기 alert, 주문 취소·로그인 유도 confirm 등) → `page.on('dialog', ...)` 처리가 중요한 연습 포인트

---

## 📚 목차
1. [기본 개념](#1-기본-개념)
2. [핵심 함수들](#2-핵심-함수들)
3. [실전 패턴](#3-실전-패턴)
4. [자주 하는 실수](#4-자주-하는-실수)
5. [빠른 참고 치트시트](#5-빠른-참고-치트시트)
6. [신규 기능 연습 시나리오 (요약)](#6-신규-기능-연습-시나리오-요약)
7. [학습 로드맵](#7-학습-로드맵)

---

## 1. 기본 개념

### UI 자동화 검증이란?
**사용자가 화면에서 보고 조작하는 것을 코드로 재현**

```typescript
// 사용자 행동 → 자동화 코드
await page.goto('/');              // 페이지 열기
await page.locator('button').waitFor();  // 버튼 나타날 때까지 대기
await page.click('button');        // 버튼 클릭
await expect(page.locator('.success')).toBeVisible();  // 성공 확인
```

### Playwright 자동 대기
**대부분의 액션은 자동으로 대기합니다**

```typescript
await page.click('button');
// 내부적으로 자동 실행:
// 1. 요소 존재할 때까지 대기
// 2. 요소 보일 때까지 대기
// 3. 요소 활성화될 때까지 대기
// 4. 클릭 수행
```

**자동 대기 액션:** `click()`, `fill()`, `check()`, `selectOption()`

**수동 대기 필요:** 로딩 스피너, URL 변경, 커스텀 조건

---

## 2. 핵심 함수들

### 2.1 안정화 함수

#### waitFor() - 요소 대기
```typescript
import { test, expect } from '@playwright/test';

// 요소가 나타날 때까지 대기
await page.locator('.loading-spinner').waitFor({ state: 'visible' });

// 요소가 사라질 때까지 대기
await page.locator('.loading-spinner').waitFor({ state: 'hidden' });

// 상태 옵션:
// - 'attached': DOM에 존재
// - 'detached': DOM에서 제거
// - 'visible': 화면에 보임 (기본값)
// - 'hidden': 화면에서 숨김
```

#### waitForURL() - URL 대기
```typescript
import { test, expect } from '@playwright/test';

// 정확한 URL
await page.waitForURL('https://example.com/dashboard');

// 부분 매칭
await page.waitForURL('**/dashboard');

// 정규식
await page.waitForURL(/dashboard/);
```

#### waitForLoadState() - 페이지 로딩 대기
```typescript
import { test, expect } from '@playwright/test';

// DOM 로드 완료
await page.waitForLoadState('domcontentloaded');

// 모든 리소스 로드 완료
await page.waitForLoadState('load');

// 네트워크 idle (2개 이하 연결)
await page.waitForLoadState('networkidle');
```

### 2.2 로케이터 함수

#### 기본 셀렉터
```typescript
import { test, expect } from '@playwright/test';

// ID (본 사이트 로그인 버튼: #login-submit)
page.locator('#login-submit')

// Class
page.locator('.submit-btn')

// 태그
page.locator('button')

// 속성
page.locator('[data-testid="submit"]')
page.locator('[type="submit"]')

// 텍스트
page.locator('text=로그인')
page.getByText('로그인')

// Role (접근성)
page.getByRole('button', { name: '로그인' })
```

#### 필터링
```typescript
import { test, expect } from '@playwright/test';

// 텍스트로 필터
page.locator('button').filter({ hasText: '제출' })

// 다른 요소 포함 여부로 필터
page.locator('.card').filter({ has: page.locator('.sale-badge') })

// n번째 요소
page.locator('button').nth(0)  // 첫 번째
page.locator('button').first()
page.locator('button').last()
```

#### 체이닝
```typescript
import { test, expect } from '@playwright/test';

// 부모 → 자식
page.locator('.form').locator('button')

// 직접 결합
page.locator('.form button')

// 여러 조건
page.locator('button')
  .filter({ hasText: '제출' })
  .filter({ has: page.locator('.icon-check') })
```

### 2.3 검증 함수 (expect)

#### 가시성 검증
```typescript
import { test, expect } from '@playwright/test';

// 보임
await expect(page.locator('.success')).toBeVisible();

// 숨김
await expect(page.locator('.error')).toBeHidden();
await expect(page.locator('.error')).not.toBeVisible();
```

#### 텍스트 검증
```typescript
import { test, expect } from '@playwright/test';

// 정확히 일치
await expect(page.locator('h1')).toHaveText('환영합니다');

// 포함
await expect(page.locator('.message')).toContainText('성공');

// 정규식
await expect(page.locator('.code')).toHaveText(/[A-Z]{3}-\d{4}/);
```

#### 개수 검증
```typescript
import { test, expect } from '@playwright/test';

// 정확한 개수
await expect(page.locator('.item')).toHaveCount(5);

// 최소 1개 이상 (toHaveCount는 정확한 숫자만 받으므로 first() 활용)
await expect(page.locator('.item').first()).toBeVisible();
```

#### 상태 검증
```typescript
import { test, expect } from '@playwright/test';

// 활성화
await expect(page.locator('button')).toBeEnabled();

// 비활성화
await expect(page.locator('button')).toBeDisabled();

// 체크됨
await expect(page.locator('#agree')).toBeChecked();
```

#### 속성/값 검증
```typescript
import { test, expect } from '@playwright/test';

// 속성
await expect(page.locator('input')).toHaveAttribute('type', 'email');

// 값
await expect(page.locator('input')).toHaveValue('test@example.com');

// URL
await expect(page).toHaveURL('/dashboard');

// 제목
await expect(page).toHaveTitle('대시보드');
```

---

## 3. 실전 패턴

### 패턴 1: 로그인 플로우
```typescript
import { test, expect } from '@playwright/test';

test('로그인 성공', async ({ page }) => {
  // 0. baseURL은 별도 테스트 레포의 playwright.config에서
  //    http://localhost:5173 으로 설정

  // 1. 페이지 이동 및 로딩 대기
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // 2. 홈 헤더의 로그인 버튼 클릭
  await page.click('#home-login');
  
  // 3. 입력 (테스트 계정: test / 1234)
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  
  // 4. 제출
  await page.click('#login-submit');
  
  // 5. 결과 검증 (로그인 성공 시 홈 '/'으로 이동)
  await page.waitForURL('/');
  await expect(page.locator('#home-logout')).toBeVisible();
});
```

### 패턴 2: 폼 유효성 검증 — 일반 예시 (본 사이트 셀렉터와 다름)

> 본 사이트에서 이 연습은 **회원가입 페이지 `/signup`**에서 할 수 있습니다:
> `#signup-username`·`#signup-password` 등 입력 후 `#signup-submit` 제출 시 필드별 `role=alert` 에러
> (`signup-username-error`, `signup-password-error`, `password-confirm-error`, `signup-email-error`)가 표시됩니다.
> 로그인 폼에서도 가능: `[data-testid="username-error"]`, `[data-testid="password-error"]`,
> 그리고 입력 전 `#login-submit`은 `toBeDisabled()` 상태입니다. (자세한 시나리오는 [6.1](#61-회원가입-signup) 참고)

```typescript
import { test, expect } from '@playwright/test';

test('빈 필드 제출 시 에러', async ({ page }) => {
  await page.goto('/register');
  
  // 빈 상태로 제출
  await page.click('#submit');
  
  // 에러 메시지 확인
  await expect(page.locator('.error-username'))
    .toBeVisible();
  await expect(page.locator('.error-username'))
    .toContainText('필수 입력');
  
  // 버튼 비활성화 확인
  await expect(page.locator('#submit')).toBeDisabled();
});
```

### 패턴 3: 동적 콘텐츠 로딩
```typescript
import { test, expect } from '@playwright/test';

test('상품 목록 로딩', async ({ page }) => {
  await page.goto('/products');
  
  // 로딩 스피너 사라지길 대기
  // (본 사이트: 클래스가 아닌 data-testid="loading-spinner" 사용)
  await page.getByTestId('loading-spinner').waitFor({ state: 'hidden' });
  
  // 상품 목록 확인 (최소 1개 이상)
  await expect(page.locator('.product-card').first()).toBeVisible();
  
  // 첫 상품의 버튼 확인 (data-testid: view-detail-btn-{id}, add-to-cart-btn-{id})
  await expect(page.getByTestId('view-detail-btn-1')).toBeVisible();
});
```

### 패턴 4: 조건부 요소 (로그인/로그아웃 토글)

> 참고: 본 사이트의 관리자 버튼(`#home-admin-btn`)은 권한과 무관하게 **항상 표시**되고,
> 클릭 시점에 권한 체크가 동작합니다(의도적 설계). 그래서 조건부 요소 연습은
> 로그인/로그아웃 버튼 토글로 합니다.

```typescript
import { test, expect } from '@playwright/test';

test('로그인하면 로그아웃 버튼으로 토글', async ({ page }) => {
  await page.goto('/');
  
  // 비로그인 상태: 로그인 버튼만 보임
  // (REQ-1: 앱 진입 시 항상 로그아웃 상태로 초기화됨 - 의도적)
  await expect(page.locator('#home-login')).toBeVisible();
  await expect(page.locator('#home-logout')).not.toBeVisible();
  
  // 로그인 (test / 1234)
  await page.click('#home-login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // 로그인 상태: 로그아웃 버튼으로 토글
  await expect(page.locator('#home-logout')).toBeVisible();
  await expect(page.locator('#home-login')).not.toBeVisible();
});
```

### 패턴 5: 여러 요소 검증 — 일반 예시 (본 사이트 셀렉터와 다름)

> 본 사이트 장바구니(`/cart`)에서는 다음 data-testid를 사용할 수 있습니다:
> `cart-item-{id}`, `cart-increase-{id}`, `cart-decrease-{id}`, `cart-remove-{id}`,
> `cart-total`(합계), `checkout-button`(주문 버튼)

```typescript
import { test, expect } from '@playwright/test';

test('장바구니에 3개 상품', async ({ page }) => {
  await page.goto('/cart');
  
  // 총 개수
  await expect(page.locator('.cart-item')).toHaveCount(3);
  
  // 각각 검증
  const items = page.locator('.cart-item');
  
  await expect(items.nth(0)).toContainText('상품 A');
  await expect(items.nth(1)).toContainText('상품 B');
  await expect(items.nth(2)).toContainText('상품 C');
  
  // 전체 반복
  const count = await items.count();
  for (let i = 0; i < count; i++) {
    await expect(items.nth(i).locator('.price'))
      .toBeVisible();
  }
});
```

---

## 4. 자주 하는 실수

### 실수 1: 대기 없이 바로 검증
```typescript
// ❌ 잘못된 코드
await page.click('button');
await expect(page.locator('.result')).toBeVisible();
// → .result가 늦게 나타나면 실패

// ✅ 올바른 코드
await page.click('button');
await page.locator('.result').waitFor({ state: 'visible' });
await expect(page.locator('.result')).toBeVisible();

// 또는 (expect는 자동 대기)
await page.click('button');
await expect(page.locator('.result')).toBeVisible({ timeout: 5000 });
```

### 실수 2: 너무 구체적인 셀렉터
```typescript
// ❌ 깨지기 쉬움
page.locator('div.container > div.form > div.row:nth-child(2) > button')

// ✅ 견고함
page.locator('#submit-btn')
page.getByRole('button', { name: '제출' })
page.locator('[data-testid="submit"]')
```

### 실수 3: 타임아웃 무시
```typescript
// ❌ 느린 API면 실패
await expect(page.locator('.result')).toBeVisible();
// → 기본 30초 대기

// ✅ 타임아웃 명시
await expect(page.locator('.result'))
  .toBeVisible({ timeout: 60000 });  // 60초
```

### 실수 4: 하드코딩된 대기
```typescript
// ❌ 안 좋은 방법
await page.click('button');
await page.waitForTimeout(3000);  // 3초 무조건 대기
await expect(page.locator('.result')).toBeVisible();

// ✅ 좋은 방법
await page.click('button');
await page.locator('.result').waitFor();  // 필요한 만큼만 대기
await expect(page.locator('.result')).toBeVisible();
```

### 실수 5: 여러 요소 중 첫 번째만 검증
```typescript
// ❌ 잘못된 가정
await expect(page.locator('button')).toBeVisible();
// → 첫 번째 버튼만 확인, 나머지는?

// ✅ 명확하게
await expect(page.locator('#submit-btn')).toBeVisible();

// 또는 개수까지
await expect(page.locator('button')).toHaveCount(3);
```

---

## 5. 빠른 참고 치트시트

### 기본 액션
```typescript
await page.goto(url)              // 페이지 이동
await page.click(selector)        // 클릭
await page.fill(selector, text)   // 입력
await page.check(selector)        // 체크박스 체크
await page.selectOption(selector, value)  // 드롭다운 선택
```

### 대기
```typescript
await page.locator(selector).waitFor()           // 요소 대기
await page.waitForURL(url)                       // URL 대기
await page.waitForLoadState('networkidle')       // 로딩 대기
```

### 검증
```typescript
await expect(locator).toBeVisible()              // 보임
await expect(locator).toHaveText(text)           // 텍스트 일치
await expect(locator).toContainText(text)        // 텍스트 포함
await expect(locator).toHaveCount(n)             // 개수
await expect(locator).toBeEnabled()              // 활성화
await expect(page).toHaveURL(url)                // URL
```

### 로케이터
```typescript
page.locator('#id')                              // ID
page.locator('.class')                           // Class
page.getByRole('button', { name: 'text' })       // Role
page.getByText('text')                           // Text
page.getByTestId('loading-spinner')              // data-testid
page.locator('button').first()                   // 첫 번째
page.locator('button').nth(2)                    // 3번째 (0부터 시작)
```

### 다이얼로그 처리 (본 사이트 필수 연습)
```typescript
// 본 사이트는 alert()/confirm()을 많이 사용
// 리스너가 없으면 Playwright가 자동으로 dismiss(취소)함!
page.on('dialog', async (dialog) => {
  console.log(dialog.message());
  await dialog.accept();  // 수락 (취소는 dialog.dismiss())
});
```

---

## 6. 신규 기능 연습 시나리오 (요약)

> 셀렉터는 전부 `src/pages/*.jsx`에서 확인된 실제 이름입니다. 상세 코드는 [UI_AUTOMATION_GUIDE.md 8장](UI_AUTOMATION_GUIDE.md) 참고.

### 6.1 회원가입 `/signup`
`#signup-username` 입력 → `#username-check-btn` 중복확인 → `[data-testid="username-check-result"]` 검증
→ 잘못된 값 제출 시 필드별 `role=alert` 에러(`signup-username-error`, `signup-password-error`, `password-confirm-error`, `signup-email-error`)
→ 정상 가입(`#signup-password`, `#signup-password-confirm`, `#signup-email`(선택), `#signup-submit`) 시 `signup-success` 표시 후 약 1초 뒤 `/login` 자동 이동
- 규칙: 아이디 영소문자+숫자 4~12자 / 비밀번호 8자 이상 영문+숫자

### 6.2 체크아웃 `/checkout`
장바구니 `#checkout-btn` → `/checkout` 이동. 상품 행 `checkout-item-{productId}`
1. **약관 게이팅**: `#agree-terms` 체크 전 `#place-order-btn`은 `toBeDisabled()`
2. **배송지 검증**: 빈 값 제출 → `checkout-name-error` / `checkout-phone-error` / `checkout-address-error`
3. **쿠폰**: `#coupon-code` + `coupon-apply-btn` → `coupon-message`. `EXPIRED10`은 "만료된 쿠폰입니다"(의도적 실패), `WELCOME10`(10%)·`SAVE5000`(최소 3만)·`VIP20`(최소 10만) 성공 시 `checkout-discount` 갱신, `coupon-remove-btn`으로 해제
4. **주문**: 결제수단 라디오 `#payment-card`/`#payment-bank`/`#payment-kakao` → 결제 → `/order-complete`에서 `order-complete-id`가 `/^ORD-\d{8}-[A-Z0-9]{4}$/` 형식인지 검증

### 6.3 주문내역 `/orders`
`order-item-{orderId}` 행 클릭 → `order-detail-{orderId}` 확장 → **확장 후에만** `order-cancel-{orderId}` 노출
→ 클릭 시 `confirm()` 발생(다이얼로그 처리 필수) → 수락 시 `order-status-{orderId}`가 `결제완료` → `취소됨` 전이, `order-cancel-message` 표시
- 비로그인 딥링크: `orders-login-required` 표시

### 6.4 위시리스트 `/wishlist`
홈/목록 카드 하트 `wishlist-toggle-{id}` 클릭 → `aria-pressed` `false`→`true` 검증
→ `#home-wishlist-btn`으로 페이지 이동 → `wishlist-item-{productId}` 확인 → `wishlist-remove-{productId}` 삭제 (`wishlist-add-to-cart-{productId}`, 빈 목록 `wishlist-empty`, 비로그인 `wishlist-login-required`)

### 6.5 상품 상세 `/product/:id`
- **갤러리**: `gallery-thumb-0..2` 클릭 → `product-main-image`의 `src` 변경 검증
- **탭**: `#tab-description`/`#tab-specs`/`#tab-shipping`/`#tab-reviews` → 활성 탭 패널(`tab-panel-*`)만 DOM에 존재, 스펙 `spec-row-{i}`
- **리뷰 작성**(로그인 필요): `star-input-1..5` → `#review-comment`(10자 이상) → `#review-submit` → 결과는 alert가 아닌 in-DOM `review-form-message` → `rating-average`/`rating-bar-5..1` 분포 갱신. 중복 작성은 409, 정렬 `#review-sort`(latest/rating), `review-load-more`
- **품절 검증**: 상품 18은 `stock-badge`가 `품절`, `#add-to-cart-button`/`#buy-now-button` 모두 `toBeDisabled()`

### 6.6 목록 `/products`
`#sort-select`(default/price-asc/price-desc/name/discount) → 가격 필터 `#min-price`/`#max-price` + `apply-price-filter`(min>max 시 `price-filter-error`) → `search-result-count` → 품절 뱃지 `soldout-badge-3/8/18`. `reset-price-filter`로 초기화. (가격 필터는 `/products` 전용, 홈에는 없음)

### 6.7 서버 장바구니 영속성
새 브라우저 컨텍스트에서 같은 계정으로 로그인 → 이전에 담은 `cart-item-{productId}`가 그대로 보이는지 검증. `storageState`로 로그인은 재사용할 수 없지만(REQ-1) **장바구니 데이터는 서버에 계정 단위로 영속**된다는 점이 연습 포인트.

---

## 7. 학습 로드맵

### 1주차: 기본기
- `click()`, `fill()` 각 20회
- `toBeVisible()` 30회
- 로그인 테스트 5개 작성

### 2주차: 안정화
- `waitFor()` 10회 사용
- 로딩 스피너 대기 패턴 5회
- URL 변경 대기 5회

### 3주차: 고급 패턴
- 조건부 요소 검증 10개
- 여러 요소 반복 검증 5개
- 복잡한 셀렉터 체이닝 5개

---

**💡 핵심 기억 포인트:**
1. Playwright는 대부분 자동 대기
2. 느린 요소는 `waitFor()` 명시
3. 구체적이고 견고한 셀렉터 사용
4. `expect()`는 자동 재시도 (타임아웃까지)

**🎯 다음 단계:** 별도 테스트 레포에서 본 사이트(`http://localhost:5173`)의 로그인 플로우부터 테스트 작성!
