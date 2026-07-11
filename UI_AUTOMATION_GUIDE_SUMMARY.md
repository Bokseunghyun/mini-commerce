# 🎨 UI 자동화 검증 가이드 (요약본)

> **⚠️ 본 레포는 "테스트 대상 사이트"입니다.** 자동화(테스트) 코드는 여러분의 **별도 테스트 레포**에 작성하고, `http://localhost:5173`(vite dev 서버)을 대상으로 실행하세요. 이 레포 안에 `tests/` 디렉터리를 만들지 않습니다.
>
> **본 사이트 핵심 정보 (코드 기준 검증됨):**
> - 테스트 계정: `test`/`1234`(일반), `admin`/`1234`(관리자), `test2`/`1234`(차단 계정 → 로그인 403, 의도적). 회원가입으로 만든 계정도 사용 가능
> - 앱 origin은 `http://localhost:5173`(vite dev) 하나. `/api`는 vite가 `http://localhost:3000`(Express)로 프록시한다. 테스트는 `baseURL: 'http://localhost:5173'` + 상대경로 `/api/...`를 쓴다.
> - 라우트: `/`(홈, 상품 목록·정렬·검색 포함), `/product/:id`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/profile`(로그인 필요), `/tracking`(공개), `/order-complete`, `/admin`. 목록/정렬/필터는 홈(`/`) 기준. `/login`·`/signup`은 홈+모달로 열리며 URL이 바뀌지 않는다(§ 로그인 & 세션).
> - 로그인/계정 셀렉터는 **계정 드롭다운 경유**: 드롭다운 열기 `user-menu-trigger` → 항목 `usermenu-login`/`usermenu-signup`/`usermenu-logout`/`usermenu-wishlist`/`usermenu-orders`/`usermenu-profile`. 로그인 폼 `login-modal`/`username-input`/`password-input`/`login-submit-button`. 헤더 id는 `#home-admin-btn`(관리자)·`#home-cart-btn`(장바구니). 서브페이지 공통 헤더 배송조회 `site-nav-tracking`, 장바구니 `site-nav-cart`.
> - 주요 data-testid: `cart-item-{productId}`, `cart-increase-{productId}`, `cart-decrease-{productId}`, `cart-remove-{productId}`, `cart-total`, `checkout-button`(= `#checkout-btn` → `/checkout` 이동), `admin-row-{id}`, `view-detail-btn-{id}`, `add-to-cart-btn-{id}`, `wishlist-toggle-{id}`(하트, `aria-pressed`). 이 앱은 data-testid가 389개로 촘촘히 박혀 있으니 `getByTestId`/`getByRole`를 **1급(우선) 셀렉터**로 쓴다.
> - **인증 = localStorage:** 로그인 정보(`token`/`role`/`username`)는 localStorage에 저장된다. 새로고침·탭 닫기·재시작 후에도 유지되고 탭 간 공유되며, **`storageState`로 재사용이 가능**하다. JWT는 1시간 후 만료되어 이후 인증요청은 401. 로그인은 페이지 이동 없이 모달만 닫히므로, `login-modal` 사라짐 또는 `usermenu-logout` 노출로 검증한다.
> - **서버 장바구니(계정 영속):** 장바구니는 서버 DB에 계정 단위로 저장 → 다른 브라우저/컨텍스트에서 로그인해도 유지. localStorage 클리어로 초기화되지 않음 (`POST /api/reset` 또는 `cart_update` 수량 0으로 비움)
> - 본 사이트는 `alert()`/`confirm()`을 많이 사용(장바구니 담기 alert, 주문 취소·로그인 유도 confirm 등) → `page.on('dialog', ...)` 처리가 중요한 연습 포인트
> - 순수 API 검증은 `page.request`/`request.newContext({ baseURL, extraHTTPHeaders })`로 하고, UI 동작이 유발한 호출 검증에만 `page.waitForResponse(...)`를 쓴다.

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

// 요소가 나타날 때까지 대기 (본 사이트에선 getByTestId로 실재 요소를 지정)
await page.getByTestId('login-modal').waitFor({ state: 'visible' });

// 요소가 사라질 때까지 대기
await page.getByTestId('login-modal').waitFor({ state: 'hidden' });

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
// ⚠️ 'networkidle'은 지양하세요. 백그라운드 요청이 계속되면 영영 안 끝나고,
//    조건을 정확히 표현하지 못합니다. 특정 요소의 web-first assertion
//    (예: await expect(page.getByTestId('...')).toBeVisible())으로 대체하세요.
await page.waitForLoadState('networkidle');
```

### 2.2 로케이터 함수

#### 기본 셀렉터
> **로케이터 우선순위 (본 사이트 기준):** 이 앱은 data-testid가 389개로 촘촘히 박혀 있습니다.
> `getByTestId`/`getByRole`를 **1급(최우선) 셀렉터**로 안심하고 쓰세요. `page.locator('[data-testid=...]')`
> CSS 문자열이나 `#id`/`.class`/`:nth-child` 남용은 깨지기 쉬우니 피합니다.

```typescript
import { test, expect } from '@playwright/test';

// ✅ 1급: data-testid (본 사이트 로그인 버튼: login-submit-button)
page.getByTestId('login-submit-button')

// ✅ 1급: Role (접근성)
page.getByRole('button', { name: '로그인' })

// 텍스트
page.getByText('로그인')

// (아래는 testid/role이 없을 때만 — 본 사이트 헤더 id는 #home-admin-btn·#home-cart-btn)
// ID
page.locator('#home-cart-btn')

// Class
page.locator('.submit-btn')

// 태그
page.locator('button')

// 속성
page.locator('[type="submit"]')
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

  // 1. 페이지 이동 (networkidle 대신 이후 web-first assertion으로 대기)
  await page.goto('/');

  // 2. 계정 드롭다운을 열고 로그인 항목 클릭
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();

  // 3. 입력 (테스트 계정: test / 1234)
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');

  // 4. 제출
  await page.getByTestId('login-submit-button').click();

  // 5. 결과 검증: 로그인은 페이지 이동 없이 모달만 닫힘 → 모달 사라짐으로 검증
  await expect(page.getByTestId('login-modal')).toBeHidden();
  // 로그인 상태 UI로 재확인: 드롭다운에 로그아웃 항목 노출
  await page.getByTestId('user-menu-trigger').click();
  await expect(page.getByTestId('usermenu-logout')).toBeVisible();
});
```

### 패턴 2: 폼 유효성 검증 — 일반 예시 (본 사이트 셀렉터와 다름)

> 본 사이트에서 이 연습은 **회원가입 모달**(계정 드롭다운 → `usermenu-signup`)에서 할 수 있습니다:
> `#signup-username`·`#signup-password` 등 입력 후 `#signup-submit` 제출 시 필드별 `role=alert` 에러
> (`signup-username-error`, `signup-password-error`, `password-confirm-error`, `signup-email-error`)가 표시됩니다.
> 로그인 폼에서도 가능: `[data-testid="username-error"]`, `[data-testid="password-error"]`,
> 그리고 입력 전 `login-submit-button`은 `toBeDisabled()` 상태입니다. (자세한 시나리오는 [6.1](#61-회원가입-홈모달) 참고)

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
  // 상품 목록은 홈('/')에 있습니다.
  await page.goto('/');

  // 콘텐츠가 나타날 때까지는 고정 대기가 아니라 요소의 web-first assertion으로 대기.
  // 첫 상품 카드가 보이면 로딩이 끝난 것으로 간주 (최소 1개 이상)
  await expect(page.getByTestId('view-detail-btn-1')).toBeVisible();

  // 첫 상품의 담기 버튼도 확인 (data-testid: add-to-cart-btn-{id})
  await expect(page.getByTestId('add-to-cart-btn-1')).toBeVisible();
});
```

### 패턴 4: 조건부 요소 (로그인/로그아웃 토글)

> 참고: 본 사이트의 관리자 버튼(`#home-admin-btn`)은 권한과 무관하게 **항상 표시**되고,
> 클릭 시점에 권한 체크가 동작합니다(의도적 설계). 그래서 조건부 요소 연습은
> 계정 드롭다운의 로그인/로그아웃 항목 토글로 합니다.

```typescript
import { test, expect } from '@playwright/test';

test('로그인하면 로그아웃 항목으로 토글', async ({ page }) => {
  await page.goto('/');

  // 비로그인 상태: 드롭다운에 로그인 항목이 있고 로그아웃 항목은 없음
  await page.getByTestId('user-menu-trigger').click();
  await expect(page.getByTestId('usermenu-login')).toBeVisible();
  await expect(page.getByTestId('usermenu-logout')).toHaveCount(0);

  // 로그인 (test / 1234)
  await page.getByTestId('usermenu-login').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-modal')).toBeHidden();

  // 로그인 상태: 드롭다운에 로그아웃 항목으로 토글
  await page.getByTestId('user-menu-trigger').click();
  await expect(page.getByTestId('usermenu-logout')).toBeVisible();
  await expect(page.getByTestId('usermenu-login')).toHaveCount(0);
});
```

> **로그인은 유지됩니다.** 인증정보가 localStorage에 저장되므로
> 새로고침·탭 재시작 후에도 로그인이 유지되고, `storageState`로 재사용할 수 있습니다.

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

### 패턴 6: 로그인 한 번만 하고 재사용 (storageState)

인증이 localStorage에 저장되므로 Playwright 표준 setup 프로젝트 패턴이 그대로 동작합니다.
한 번만 로그인해 세션을 저장하고, 이후 테스트는 저장된 세션을 재사용하세요.

```typescript
// auth.setup.ts — 한 번만 로그인해서 세션을 파일로 저장
import { test as setup, expect } from '@playwright/test';
const authFile = '.auth/user.json';

setup('로그인', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('usermenu-login').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('1234');
  await page.getByTestId('login-submit-button').click();
  await expect(page.getByTestId('login-modal')).toBeHidden();
  // storageState는 쿠키 + localStorage를 직렬화 → 인증이 localStorage라 재사용 가능
  await page.context().storageState({ path: authFile });
});
```

```typescript
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  { name: 'chromium', dependencies: ['setup'],
    use: { ...devices['Desktop Chrome'], storageState: '.auth/user.json' } },
]
```

### 패턴 7: 순수 API 검증은 `page.request`

UI를 거치지 않는 API 검증은 `request` 픽스처로 직접 호출합니다. baseURL(5173) 덕분에
상대경로 `/api/...`만 쓰면 되고, 인증은 `Authorization: Bearer <token>` 헤더로 보냅니다
(서버는 set-cookie 없이 응답 바디 `{ token, user }`로만 토큰을 줌).

```typescript
import { test, expect } from '@playwright/test';

test('상품 목록 (인증 불필요)', async ({ request }) => {
  const res = await request.get('/api/products');  // baseURL=5173, /api는 3000으로 프록시
  expect(res).toBeOK();
  const { products } = await res.json();
  expect(products.length).toBeGreaterThan(0);
});

test('내 주문 (인증 필요)', async ({ playwright }) => {
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

> "순수 API = `page.request`, UI 동작이 유발한 호출 검증 = `page.waitForResponse`"로 구분하세요.
> API 상세는 [API_TESTING_GUIDE.md] 계열 문서를 참고합니다.

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
await page.waitForURL(url)                       // URL 대기 (로그인은 모달만 닫히므로 login-modal 사라짐으로 검증)
// ⚠️ page.waitForTimeout(3000) 고정 대기 금지, waitForLoadState('networkidle') 지양
//    → web-first assertion(expect(...).toBeVisible())으로 조건 대기
```

### 설정 (별도 테스트 레포 playwright.config.ts)
```typescript
export default defineConfig({
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry',
         screenshot: 'only-on-failure', video: 'retain-on-failure' },
  retries: process.env.CI ? 2 : 0,
  webServer: [
    { command: 'npm run start-api', port: 3000, reuseExistingServer: !process.env.CI },
    { command: 'npm run dev',       port: 5173, reuseExistingServer: !process.env.CI },
  ],
});
```

### 테스트 격리
```typescript
// 장바구니/주문/리뷰/계정이 서버 DB에 계정 단위로 영속됨
test.beforeEach(async ({ request }) => { await request.post('/api/reset'); });
// 병렬(fullyParallel) 실행 시엔 테스트별 고유 계정으로 격리 권장:
// const username = `u${Date.now()}_${test.info().parallelIndex}`;
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
page.getByTestId('login-submit-button')          // data-testid (1급 셀렉터)
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

### 6.1 회원가입 (홈+모달)
`/signup`은 홈+모달로 열립니다(URL이 바뀌지 않으므로 모달/성공 표시로 검증합니다).
`#signup-username` 입력 → `#username-check-btn` 중복확인 → `[data-testid="username-check-result"]` 검증
→ 잘못된 값 제출 시 필드별 `role=alert` 에러(`signup-username-error`, `signup-password-error`, `password-confirm-error`, `signup-email-error`)
→ 정상 가입(`#signup-password`, `#signup-password-confirm`, `#signup-email`(선택), `#signup-submit`) 시 `signup-success` 표시 후 로그인 모달이 열림(URL은 홈 유지)
- 규칙: 아이디 영소문자+숫자 4~12자 / 비밀번호 4자 이상 (조합 무관)

### 6.2 체크아웃 `/checkout`
장바구니 `#checkout-btn` → `/checkout` 이동. 상품 행 `checkout-item-{productId}`
1. **약관 게이팅**: `#agree-terms` 체크 전 `#place-order-btn`은 `toBeDisabled()`
2. **배송지 검증**: 빈 값 제출 → `checkout-name-error` / `checkout-phone-error` / `checkout-address-error`
3. **쿠폰**: `#coupon-code` + `coupon-apply-btn` → `coupon-message`. `EXPIRED10`은 "만료된 쿠폰입니다"(의도적 실패), `WELCOME10`(10%)·`SAVE5000`(최소 3만)·`VIP20`(최소 10만) 성공 시 `checkout-discount` 갱신, `coupon-remove-btn`으로 해제
4. **카드 결제**: 결제수단 라디오 `#payment-card`(기본)/`#payment-bank`(라벨 "무통장입금", 선택 시 `payment-bank-warn` 경고)/`#payment-inicis`(이니시스 샌드박스). 안내는 `payment-method-notice`. → 카드폼 `#card-number`(끝 4자리 `0000`=승인)/`#card-expiry`(MM/YY)/`#card-cvc` 입력 → `#place-order-btn`(라벨 `{금액}원 결제하기`) → `/order-complete`에서 `order-complete-id`가 `/^ORD-\d{8}-[A-Z0-9]{4}$/` 형식인지 검증 (실패 카드/외부 PG 목킹은 6.8)

### 6.3 주문내역 `/orders` (상태 진행 + 취소)
`order-item-{orderId}` 행 클릭 → `order-detail-{orderId}` 확장
- **상태 뱃지 5종** `order-status-{orderId}`(`data-status`): `결제완료`→`상품준비중`→`배송중`→`배송완료`, 취소 시 `취소됨`
- **상태 진행** `order-advance-btn-{orderId}` 클릭 → 다음 단계 전이. `배송중`부터 송장 `order-tracking-number-{orderId}`(`MC`+10자리) + 배송조회 `order-track-btn-{orderId}` 노출. 종료 상태에선 진행 버튼 미노출(API 409 `INVALID_TRANSITION`)
- **취소** `order-cancel-{orderId}`(PAID/PREPARING만) → `confirm()` 발생(다이얼로그 처리 필수) → `취소됨` 전이 + `order-cancel-message` + 재고 복원
- 비로그인 딥링크: `orders-login-required` 표시

### 6.4 위시리스트 `/wishlist`
홈 카드 하트 `wishlist-toggle-{id}` 클릭 → `aria-pressed` `false`→`true` 검증
→ 계정 드롭다운(`user-menu-trigger`) → `usermenu-wishlist`로 페이지 이동 → `wishlist-item-{productId}` 확인 → `wishlist-remove-{productId}` 삭제 (`wishlist-add-to-cart-{productId}`, 빈 목록 `wishlist-empty`, 비로그인 `wishlist-login-required`)

### 6.5 상품 상세 `/product/:id`
- **갤러리**: `gallery-thumb-0..2` 클릭 → `product-main-image`의 `src` 변경 검증
- **탭**: `#tab-description`/`#tab-specs`/`#tab-shipping`/`#tab-reviews` → 활성 탭 패널(`tab-panel-*`)만 DOM에 존재, 스펙 `spec-row-{i}`
- **리뷰 작성**(로그인 필요): `star-input-1..5` → `#review-comment`(10자 이상) → `#review-submit` → 결과는 in-DOM `review-form-message` → `rating-average`/`rating-bar-5..1` 분포 갱신. 같은 상품에 여러 번 작성해도 항상 201로 성공합니다. 정렬 `#review-sort`(latest/rating), `review-load-more`
- **리뷰 이미지**(최대 3장): `image-upload-input-review` 업로드 → 썸네일 `review-upload-thumb-{i}`/제거 `review-upload-remove-{i}`, 목록의 리뷰별 이미지 `review-image-{reviewId}-{i}`
- **품절/재고부족**: 씨드 재고는 전부 12개입니다. 재고부족(409 `INSUFFICIENT_STOCK`)은 현재 재고 조회 후 `stock+1` 수량으로 주문하거나 관리자 `PUT /api/admin`으로 재고를 0으로 낮춰 동적으로 재현합니다.

### 6.6 목록/정렬/필터 (홈 `/`)
목록·정렬·검색·가격필터는 모두 홈(`/`) 기준입니다.
`#sort-select`(default/price-asc/price-desc/name/discount) → 가격 필터 `#min-price`/`#max-price` + `apply-price-filter`(min>max 시 `price-filter-error`) → `search-result-count`, `reset-price-filter`로 초기화. (씨드 재고는 전부 12개 — §6.5 참고)

### 6.7 서버 장바구니 영속성
새 브라우저 컨텍스트에서 같은 계정으로 로그인 → 이전에 담은 `cart-item-{productId}`가 그대로 보이는지 검증. **장바구니 데이터는 서버에 계정 단위로 영속**되는 점이 연습 포인트. (로그인은 localStorage 기반이라 `storageState`로도 재사용 가능 — 패턴 6 참고)

### 6.8 결제 (테스트 카드 · 외부 PG 목킹)
결제는 **모의 PG**로 카드 **끝 4자리로 결과 결정**(랜덤 아님): `…0000` 승인 / `…0001` 402 거절 / `…0002` 402 한도 / `…9999` 504 타임아웃. 실패 시 `payment-error`(`role=alert`)에 메시지, 주문 미생성, URL은 `/checkout` 유지.
- `page.route('**/api/payment', r => r.fulfill({status:504,...}))`로 응답을 가로채 강제 실패 주입(외부 PG 목킹 핵심)
- 서버 폴트 주입: `POST /api/payment?simulate=decline|limit|timeout|error`(카드 무관). 사후조회 `GET /api/payment?paymentKey=`(없으면 404). `paymentKey`(`PAY-<uuid>`) 값은 단언 금지

### 6.9 파일 업로드 (리뷰/아바타)
공통 `image-upload-input-{review|avatar}`(file input) → 성공 시 미리보기/썸네일, 실패는 `image-upload-error`. 허용 `data:image/png|jpeg|webp|gif;base64,...` ≤2MB → 위반 시 400 `INVALID_FILE_TYPE` / 413 `FILE_TOO_LARGE`. Playwright `setInputFiles()`로 업로드하거나 형식/용량 에러는 `page.request.post('/api/upload')`로 직접 검증.

### 6.10 배송조회 `/tracking` (공개)
로그인 불필요. `#tracking-number-input` + `#tracking-search-btn` → 없는 송장 `tracking-not-found`(`role=alert`) / 유효 송장(배송중 이상 주문의 `MC`+10자리) → `tracking-result`/`tracking-status`/`tracking-event-{i}`(0부터). `page.route('**/api/tracking**', ...)`로 외부 택배 API 목킹 연습.

### 6.11 내정보 `/profile` (로그인 필요 · 주소검색 폴백)
비로그인 딥링크 → `profile-login-required`. 아바타 `image-upload-input-avatar` 업로드 → `profile-avatar` 갱신 + `profile-avatar-message`. 주소검색 `address-search-btn` → 외부 우편번호 스크립트 로드, `page.route('**/*postcode*', r => r.abort())`로 차단 시 `address-search-fallback` 수동입력(`address-search-manual-zonecode`/`-manual-address`/`-manual-submit`) → 결과가 `profile-zonecode`/`profile-address`에 반영.

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
