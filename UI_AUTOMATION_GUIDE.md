# 🎨 UI 자동화 검증 가이드

> **⚠️ 본 레포는 "테스트 대상 사이트"입니다.**
> 자동화(테스트) 코드는 이 레포가 아니라 **여러분의 별도 테스트 레포**에 작성하고, `http://localhost:5173`(vite dev 서버)을 대상으로 실행하세요. 이 문서의 Playwright 예시는 학습용 자료이며, 이 레포 안에 `tests/` 디렉터리를 만들지 않습니다.

## 🧭 본 실습 사이트 요약 (코드 기준 검증됨)

| 항목 | 값 |
|---|---|
| 테스트 계정 | `test` / `1234` (일반), `admin` / `1234` (관리자), `test2` / `1234` (차단 계정 → 로그인 403, 의도적). 회원가입으로 만든 계정도 로그인 가능(USER) |
| 라우트 (전부 딥링크 가능) | `/`, `/login`, `/signup`, `/products`, `/product/:id`, `/cart`, `/checkout`, `/orders`, `/wishlist`, `/order-complete`, `/admin` |
| 로그인 페이지 셀렉터 | `#login-username`, `#login-password`, `#login-submit` (data-testid: `login-submit-button`) |
| 홈 헤더 셀렉터 | `#home-login`·`#home-signup-btn`(비로그인 시), `#home-logout`·`#home-wishlist-btn`·`#home-orders-btn`(로그인 시), `#home-admin-btn`(항상 표시, 권한 체크는 클릭 후), `#home-cart-btn` |
| 상품 버튼 (data-testid) | `view-detail-btn-{id}`(상세 보기), `add-to-cart-btn-{id}`(장바구니 담기), `wishlist-toggle-{id}`(하트, `aria-pressed`) |
| 딥링크 | 위 라우트 전부 `page.goto()` 직접 진입 가능 — 단 REQ-1 때문에 딥링크 직후엔 항상 **비로그인** 상태 |

**주요 data-testid (코드에서 확인된 이름):**
`login-submit-button`, `loading-spinner`, `cart-item-{productId}`, `cart-increase-{productId}`, `cart-decrease-{productId}`, `cart-remove-{productId}`, `cart-total`, `checkout-button`(= `#checkout-btn`), `admin-row-{id}`, `soldout-badge-{id}`, `search-result-count`
— 신규 페이지(회원가입/체크아웃/주문내역/위시리스트/상세 탭·리뷰)의 셀렉터 전체 목록은 [8장](#8-본-사이트-신규-기능-연습-시나리오) 참고.

**의도적 제약 (REQ-1):** 앱 진입 시 항상 로그아웃 상태로 초기화됩니다(진입 시 localStorage 토큰 제거). 따라서 Playwright `storageState` 재사용으로 로그인 상태를 유지할 수 없고, 각 테스트에서 UI 로그인을 수행해야 합니다. `/checkout`, `/orders` 같은 딥링크로 진입해도 마찬가지로 비로그인 상태에서 시작합니다(주문내역은 `orders-login-required`, 위시리스트는 `wishlist-login-required` 표시). 버그가 아니라 연습용 의도적 설계입니다.

**서버 장바구니(계정 영속):** 장바구니는 클라이언트 상태가 아니라 **서버(DB)에 계정 단위로 저장**됩니다(`GET /api/user-actions?type=cart`). 같은 계정으로 다른 브라우저/시크릿 창에서 로그인해도 장바구니가 그대로 유지됩니다. → `storageState`로 장바구니를 "이어받는" 대신, **로그인 후 서버 상태를 검증**하는 연습을 하세요. 테스트 간 격리가 필요하면 `POST /api/reset`(전체 시드 복원) 또는 `cart_update` 수량 0으로 비워야 합니다. localStorage 클리어로는 초기화되지 않습니다.

**다이얼로그 처리 연습 포인트:** 본 사이트는 `alert()` / `confirm()`을 많이 사용합니다(장바구니 담기 alert, 로그인 유도 confirm, 주문 취소 confirm, 로그아웃 confirm 등). Playwright는 리스너가 없으면 다이얼로그를 자동으로 닫아버리므로(dismiss), `page.on('dialog', ...)` 처리를 연습하세요.

```typescript
page.on('dialog', async (dialog) => {
  console.log(dialog.message());
  await dialog.accept(); // confirm 수락 (취소는 dialog.dismiss())
});
```

※ 아래 본문 예시 중 `.loading-spinner`, `/dashboard`, `.dashboard-content` 등 일부 셀렉터는 **일반 예시 (본 사이트 셀렉터와 다름)** 입니다. 본 사이트에서는 위 표의 셀렉터/data-testid를 사용하세요. (예: 로딩 스피너는 클래스가 아니라 `page.getByTestId('loading-spinner')`)

---

## 📚 목차
1. [UI 자동화 검증이란?](#1-ui-자동화-검증이란)
2. [안정화 코드 완전 정복](#2-안정화-코드-완전-정복)
3. [로케이터 함수 완전 정복](#3-로케이터-함수-완전-정복)
4. [검증 함수 완전 정복](#4-검증-함수-완전-정복)
5. [실전 패턴과 조합](#5-실전-패턴과-조합)
6. [자주 하는 실수](#6-자주-하는-실수)
7. [베스트 프랙티스](#7-베스트-프랙티스)
8. [본 사이트 신규 기능 연습 시나리오](#8-본-사이트-신규-기능-연습-시나리오)

---

## 1. UI 자동화 검증이란?

### 1.1 기본 개념

**UI 자동화 검증 = 사용자가 화면에서 보고 조작하는 것을 코드로 재현**

```
사용자 행동               →  자동화 코드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 페이지 열기            →  await page.goto('/')
2. 버튼 찾기              →  page.locator('button')
3. 버튼 보이길 기다림     →  .waitFor()
4. 버튼 클릭              →  .click()
5. 성공 메시지 확인       →  expect().toBeVisible()
```

### 1.2 왜 안정화 코드가 필요한가?

**웹 페이지는 즉시 준비되지 않습니다:**

```typescript
// ❌ 안정화 없이 (불안정함)
await page.click('button');
// 버튼이 아직 안 나타났으면? → 에러!

// ✅ 안정화 추가 (안정적)
await page.locator('button').waitFor();  // 버튼 나타날 때까지 기다림
await page.click('button');
```

**문제 상황들:**
- ⏱️ API 데이터 로딩 중
- 🎨 CSS 애니메이션 진행 중
- ⚡ JavaScript 실행 중
- 🔄 페이지 이동 중

### 1.3 Playwright의 스마트 대기 (Auto-waiting)

**대부분의 Playwright 액션은 자동으로 대기합니다:**

```typescript
// Playwright가 자동으로 하는 일:
await page.click('button');

// 내부적으로:
// 1. 요소 존재할 때까지 대기
// 2. 요소 보일 때까지 대기
// 3. 요소 활성화될 때까지 대기
// 4. 요소 안정될 때까지 대기
// 5. 클릭 수행
```

**자동 대기가 적용되는 액션들:**
- `click()`, `fill()`, `check()`, `uncheck()`
- `selectOption()`, `type()`, `press()`
- `setInputFiles()`, `focus()`, `blur()`

**명시적 대기가 필요한 경우:**
- 로딩 스피너가 사라지길 기다릴 때
- 특정 조건이 만족될 때까지 기다릴 때
- URL 변경을 기다릴 때
- 커스텀 JavaScript 조건 대기

---

## 2. 안정화 코드 완전 정복

### 2.1 page.waitForLoadState()

#### 역할
**페이지 로딩 상태가 특정 단계에 도달할 때까지 대기**

#### 3가지 상태
```typescript
// 1. load - HTML 파싱 완료 (기본값)
await page.goto('/');
await page.waitForLoadState('load');

// 2. domcontentloaded - DOM 구조 완성 (더 빠름)
await page.waitForLoadState('domcontentloaded');

// 3. networkidle - 네트워크 요청 거의 없음 (가장 느림)
await page.waitForLoadState('networkidle');
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: 페이지 이동 직후
await page.goto('/products');
await page.waitForLoadState('load');  // 페이지 로딩 완료 대기
await page.click('.product-card');

// ✅ 사용: SPA에서 데이터 로딩 대기
await page.click('a[href="/dashboard"]');
await page.waitForLoadState('networkidle');  // API 호출 완료 대기

// ❌ 불필요: 이미 안정적인 요소 조작
await page.locator('button').waitFor();
await page.click('button');
// → locator.waitFor()가 이미 안정화 제공
```

#### 실전 예시

```typescript
test('상품 목록 페이지 로딩', async ({ page }) => {
  await page.goto('/products');
  
  // 1. 페이지 로딩 완료 대기
  await page.waitForLoadState('load');
  
  // 2. API 데이터 로딩 완료 대기
  await page.waitForLoadState('networkidle');
  
  // 3. 이제 안전하게 검증
  await expect(page.locator('.product-card')).toHaveCount(10);
});
```

---

### 2.2 page.waitForSelector()

#### 역할
**CSS 선택자로 요소가 나타날 때까지 대기**

```typescript
await page.waitForSelector('.success-message');
```

#### ⚠️ 주의: 권장하지 않음!

```typescript
// ❌ 구식 방법 (Playwright 공식 비추천)
await page.waitForSelector('button');
await page.click('button');

// ✅ 최신 방법 (권장)
await page.locator('button').waitFor();
await page.click('button');

// 또는 더 간단하게
await page.click('button');  // Playwright가 자동으로 대기
```

**왜 비추천?**
- `locator()` 방식이 더 강력함
- Auto-waiting 기능이 더 좋음
- 코드가 더 간결함

---

### 2.3 locator.waitFor()

#### 역할
**특정 요소가 원하는 상태가 될 때까지 대기**

```typescript
const button = page.locator('button');
await button.waitFor();  // 기본: visible 상태 대기
```

#### ⚠️ 대부분의 경우 불필요합니다!

**Playwright의 스마트 대기 덕분에:**
```typescript
// ❌ 불필요한 명시적 대기
await page.locator('button').waitFor();
await page.click('button');

// ✅ 간단하게 (자동으로 대기됨)
await page.click('button');
```

#### 언제 명시적으로 써야 하나?

**특별한 상태 대기가 필요할 때만:**

```typescript
// 1. hidden - 로딩 스피너가 사라지길 기다릴 때
await page.locator('.loading-spinner').waitFor({ state: 'hidden' });
// 로딩이 완전히 끝난 후 작업 진행
// 💡 본 사이트에서는 클래스가 아닌 data-testid 사용:
//    await page.getByTestId('loading-spinner').waitFor({ state: 'hidden' });

// 2. attached - display:none 같은 숨겨진 요소
await page.locator('input[type="hidden"]').waitFor({ state: 'attached' });
const value = await page.locator('input[type="hidden"]').inputValue();

// 3. detached - 모달이 완전히 사라졌는지 확인
await page.click('.modal-close');
await page.locator('.modal').waitFor({ state: 'detached' });

// 4. visible - 명시적으로 표시하고 싶을 때 (가독성)
await page.locator('.success-message').waitFor({ state: 'visible' });
await expect(page.locator('.success-message')).toBeVisible();
```

#### 4가지 상태 옵션

```typescript
// visible - 보이는 상태 (기본값)
await page.locator('.message').waitFor({ state: 'visible' });

// hidden - 숨겨진 상태
await page.locator('.loading').waitFor({ state: 'hidden' });

// attached - DOM에 존재 (보일 필요 없음)
await page.locator('#hidden-input').waitFor({ state: 'attached' });

// detached - DOM에서 제거됨
await page.locator('.modal').waitFor({ state: 'detached' });
```

#### 실전 예시

```typescript
test('로딩 후 콘텐츠 확인', async ({ page }) => {
  await page.goto('/dashboard');
  
  // 1. 로딩 스피너 사라질 때까지 대기
  await page.locator('.loading-spinner').waitFor({ state: 'hidden' });
  
  // 2. 메인 콘텐츠 나타날 때까지 대기 (선택적)
  await page.locator('.dashboard-content').waitFor({ state: 'visible' });
  
  // 3. 안전하게 검증
  await expect(page.locator('.dashboard-content')).toBeVisible();
});
```

---

### 2.4 page.waitForTimeout()

#### 역할
**무조건 지정된 시간만큼 대기**

```typescript
await page.waitForTimeout(3000);  // 3초 무조건 대기
```

#### ⚠️ 안티패턴! 절대 쓰지 마세요!

```typescript
// ❌ 나쁜 예시 (비추천)
await page.click('button');
await page.waitForTimeout(3000);  // 왜 3초? 2초면? 5초면?
await expect(page.locator('.result')).toBeVisible();

// ✅ 좋은 예시 (권장)
await page.click('button');
await page.locator('.result').waitFor();  // 나타날 때까지만 대기
await expect(page.locator('.result')).toBeVisible();
```

**왜 안티패턴?**
1. **불필요하게 느림**: 1초면 되는데 3초 기다림
2. **불안정함**: 네트워크 느리면 3초로도 부족
3. **유지보수 어려움**: 매번 시간 조정 필요

#### 예외적으로 쓸 수 있는 경우 (1%)

```typescript
// 디버깅할 때만 (테스트 코드에는 넣지 말 것!)
await page.waitForTimeout(5000);  // 화면 보려고 잠깐 멈춤
```

---

### 2.5 page.waitForURL()

#### 역할
**URL이 특정 패턴과 일치할 때까지 대기**

```typescript
await page.waitForURL('/dashboard');
```

#### 3가지 매칭 방식

```typescript
// 1. 문자열 포함 (가장 많이 사용)
await page.waitForURL('/dashboard');
await page.waitForURL('**/products/**');

// 2. 정규식
await page.waitForURL(/\/products\/\d+/);

// 3. 함수
await page.waitForURL((url) => url.searchParams.get('page') === '2');
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: 페이지 이동 후 URL 확인
await page.click('a[href="/login"]');
await page.waitForURL('/login');

// ✅ 사용: 로그인 후 리다이렉트 확인 (본 사이트: 로그인 성공 시 홈 '/'으로 이동)
await page.click('#login-submit');
await page.waitForURL('/');

// ✅ 사용: SPA 라우팅 대기
await page.click('nav a:has-text("상품")');
await page.waitForURL('**/products');

// ❌ 불필요: expect와 중복
await page.waitForURL('/dashboard');
await expect(page).toHaveURL('/dashboard');  // 중복!
```

#### 실전 예시

```typescript
test('로그인 후 홈으로 이동', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // URL 변경 대기 (본 사이트는 로그인 성공 시 홈 '/'으로 이동)
  await page.waitForURL('/');
  
  // 이제 안전하게 검증 (로그인 후 홈 헤더에 로그아웃 버튼 표시)
  await expect(page.locator('#home-logout')).toBeVisible();
});
```

---

### 2.6 page.waitForFunction()

#### 역할
**JavaScript 조건이 true가 될 때까지 대기**

```typescript
await page.waitForFunction(() => document.querySelectorAll('.item').length > 5);
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: 복잡한 조건
await page.waitForFunction(() => {
  const items = document.querySelectorAll('.product-card');
  return items.length >= 10 && items[0].classList.contains('loaded');
});

// ✅ 사용: 전역 변수 확인
await page.waitForFunction(() => window.dataLoaded === true);

// ✅ 사용: 계산된 스타일 확인
await page.waitForFunction(() => {
  const el = document.querySelector('.animated');
  return window.getComputedStyle(el).opacity === '1';
});

// ❌ 불필요: 간단한 요소 대기
await page.waitForFunction(() => document.querySelector('button'));
// → 대신 locator.waitFor() 사용
```

#### 실전 예시

```typescript
test('무한 스크롤 로딩', async ({ page }) => {
  await page.goto('/products');
  
  // 스크롤
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  
  // 상품이 20개 이상 로딩될 때까지 대기
  await page.waitForFunction(() => {
    return document.querySelectorAll('.product-card').length >= 20;
  });
  
  await expect(page.locator('.product-card')).toHaveCount(20);
});
```

---

## 3. 로케이터 함수 완전 정복

### 3.1 page.locator()

#### 역할
**CSS 선택자로 요소 찾기 (가장 범용적)**

```typescript
page.locator('button')
page.locator('.submit-btn')
page.locator('#login-form')
page.locator('[data-testid="product-card"]')
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: CSS 클래스가 명확할 때
await page.locator('.btn-primary').click();

// ✅ 사용: ID가 있을 때 (본 사이트 로그인 아이디 입력란)
await page.locator('#login-username').fill('test');

// ✅ 사용: data-testid 사용
await page.locator('[data-testid="submit-button"]').click();

// ✅ 사용: 복잡한 선택자
await page.locator('div.card > button.delete').click();

// ❌ 비추천: 텍스트로 찾을 때
await page.locator('button:has-text("로그인")').click();
// → 대신 getByRole() 또는 getByText() 사용
```

---

### 3.2 page.getByRole()

#### 역할
**ARIA role로 요소 찾기 (가장 권장)**

```typescript
page.getByRole('button', { name: '로그인' })
page.getByRole('textbox', { name: '이메일' })
page.getByRole('link', { name: '회원가입' })
```

#### 주요 role 종류

```typescript
// button
await page.getByRole('button', { name: '제출' }).click();

// link
await page.getByRole('link', { name: '더 보기' }).click();

// textbox (input)
await page.getByRole('textbox', { name: '이메일' }).fill('test@example.com');

// checkbox
await page.getByRole('checkbox', { name: '약관 동의' }).check();

// heading (h1, h2, h3...)
await expect(page.getByRole('heading', { name: '환영합니다' })).toBeVisible();

// listitem (li)
await page.getByRole('listitem').first().click();

// img
await expect(page.getByRole('img', { name: '로고' })).toBeVisible();
```

#### 왜 가장 권장될까?

```typescript
// ✅ 접근성 기반 (스크린리더 사용자 경험과 동일)
await page.getByRole('button', { name: '로그인' }).click();

// ✅ HTML 구조 변경에 강함
// <button class="btn-primary">로그인</button>
// → <button class="new-style">로그인</button>
// 여전히 동작함!

// ✅ 다국어 지원
await page.getByRole('button', { name: /로그인|Login/ }).click();
```

#### 실전 예시 — 일반 예시 (본 사이트 셀렉터와 다름)

> 본 사이트의 실제 회원가입 페이지(`/signup`)는 `#signup-username`, `#signup-password`,
> `#signup-password-confirm`, `#signup-email`, `#signup-submit`을 사용합니다. → [8.1 시나리오](#81-회원가입-플로우-중복확인--검증-에러--가입--로그인) 참고

```typescript
test('회원가입 폼', async ({ page }) => {
  await page.goto('/signup');
  
  // role 기반 로케이터 (가장 안정적)
  await page.getByRole('textbox', { name: '이름' }).fill('홍길동');
  await page.getByRole('textbox', { name: '이메일' }).fill('test@example.com');
  await page.getByRole('textbox', { name: '비밀번호' }).fill('password123');
  await page.getByRole('checkbox', { name: '약관 동의' }).check();
  await page.getByRole('button', { name: '가입하기' }).click();
  
  await expect(page.getByRole('heading', { name: '가입 완료' })).toBeVisible();
});
```

---

### 3.3 page.getByText()

#### 역할
**텍스트 내용으로 요소 찾기**

```typescript
page.getByText('로그인')
page.getByText(/로그인|Login/)  // 정규식
page.getByText('로그인', { exact: true })  // 정확히 일치
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: 일반 텍스트 요소
await page.getByText('환영합니다').waitFor();

// ✅ 사용: 정규식으로 유연하게
await page.getByText(/성공|완료/).waitFor();

// ❌ 비추천: 버튼, 링크
await page.getByText('클릭').click();
// → 대신 getByRole() 사용
```

#### exact 옵션

```typescript
// 기본: 부분 일치
await page.getByText('로그인').click();
// "로그인", "로그인하기", "로그인 버튼" 모두 매칭

// exact: 정확히 일치
await page.getByText('로그인', { exact: true }).click();
// "로그인"만 매칭
```

---

### 3.4 page.getByLabel()

#### 역할
**label 텍스트로 input 찾기**

```typescript
page.getByLabel('이메일')
page.getByLabel('비밀번호')
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: 폼 input
await page.getByLabel('이메일').fill('test@example.com');
await page.getByLabel('비밀번호').fill('password123');

// HTML 구조:
// <label for="email">이메일</label>
// <input id="email" />
// 또는
// <label>
//   이메일
//   <input />
// </label>
```

---

### 3.5 page.getByPlaceholder()

#### 역할
**placeholder로 input 찾기**

```typescript
page.getByPlaceholder('이메일을 입력하세요')
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: label 없는 input
await page.getByPlaceholder('검색어를 입력하세요').fill('Playwright');

// ❌ 비추천: label 있으면 getByLabel() 사용
```

---

### 3.6 page.getByTestId()

#### 역할
**data-testid로 요소 찾기**

```typescript
page.getByTestId('submit-button')
page.getByTestId('product-card-1')
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: 다른 방법으로 못 찾을 때
await page.getByTestId('complex-component').click();

// HTML:
// <div data-testid="complex-component">...</div>

// ⚠️ 주의: 최후의 수단
// 1순위: getByRole()
// 2순위: getByLabel(), getByText()
// 3순위: getByTestId()
```

---

## 4. 검증 함수 완전 정복

### 4.1 expect().toBeVisible()

#### 역할
**요소가 화면에 보이는지 확인**

```typescript
await expect(page.locator('.message')).toBeVisible();
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: 성공 메시지 확인
await page.click('#submit');
await expect(page.locator('.success-message')).toBeVisible();

// ✅ 사용: 모달 열렸는지 확인
await page.click('#open-modal');
await expect(page.locator('.modal')).toBeVisible();

// ⚠️ 주의: display:none은 false
// <div style="display:none">숨김</div>
await expect(page.locator('div')).not.toBeVisible();
```

---

### 4.2 expect().toHaveText()

#### 역할
**요소의 텍스트 내용 확인**

```typescript
await expect(page.locator('h1')).toHaveText('환영합니다');
```

#### 3가지 방식

```typescript
// 1. 정확히 일치
await expect(page.locator('h1')).toHaveText('환영합니다');

// 2. 부분 일치
await expect(page.locator('h1')).toContainText('환영');

// 3. 정규식
await expect(page.locator('h1')).toHaveText(/환영|Welcome/);
```

---

### 4.3 expect().toHaveValue()

#### 역할
**input 값 확인**

```typescript
await expect(page.locator('#login-username')).toHaveValue('test');
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: input 값 확인
await page.fill('#login-username', 'test');
await expect(page.locator('#login-username')).toHaveValue('test');

// ✅ 사용: 자동 완성 확인
await page.click('.autofill-suggestion');
await expect(page.locator('#address')).toHaveValue('서울시 강남구...');
```

---

### 4.4 expect().toBeEnabled() / toBeDisabled()

#### 역할
**요소 활성화/비활성화 확인**

```typescript
await expect(page.locator('button')).toBeEnabled();
await expect(page.locator('button')).toBeDisabled();
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: 조건부 버튼 활성화
// (본 사이트 로그인 버튼은 실제로 입력 전에는 비활성화 상태)
await expect(page.locator('#login-submit')).toBeDisabled();

await page.fill('#login-username', 'test');
await page.fill('#login-password', '1234');

await expect(page.locator('#login-submit')).toBeEnabled();
```

---

### 4.5 expect().toHaveCount()

#### 역할
**요소 개수 확인**

```typescript
await expect(page.locator('.product-card')).toHaveCount(10);
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: 목록 개수 확인
await expect(page.locator('.search-result')).toHaveCount(5);

// ✅ 사용: 요소 없는지 확인
await expect(page.locator('.error')).toHaveCount(0);
```

---

### 4.6 expect().toHaveURL()

#### 역할
**현재 URL 확인**

```typescript
await expect(page).toHaveURL('/dashboard');
```

#### 3가지 방식

```typescript
// 1. 정확히 일치
await expect(page).toHaveURL('https://example.com/dashboard');

// 2. 부분 일치
await expect(page).toHaveURL(/\/dashboard/);

// 3. 패턴 매칭
await expect(page).toHaveURL('**/products/**');
```

---

## 5. 실전 패턴과 조합

### 5.1 로딩 → 클릭 패턴

```typescript
// 패턴 1: 스마트 대기 활용 (가장 간단) ⭐
await page.click('button');
// Playwright가 알아서:
// - 버튼 나타날 때까지 대기
// - 버튼 활성화될 때까지 대기
// - 클릭 수행

// 패턴 2: 로딩 스피너가 있을 때
await page.locator('.loading-spinner').waitFor({ state: 'hidden' });
await page.click('button');

// 패턴 3: 특별한 조건이 필요할 때만
await page.locator('button').waitFor();  // 명시적으로 표시
await page.click('button');
```

**언제 어떤 패턴을 쓸까?**
```typescript
// 일반적인 경우 (90%) - 패턴 1
await page.click('button');

// 로딩 UI가 있는 경우 (9%) - 패턴 2
await page.locator('.loading').waitFor({ state: 'hidden' });
await page.click('button');

// 가독성을 위해 (1%) - 패턴 3
await page.locator('button').waitFor();
await page.click('button');
```

---

### 5.2 페이지 이동 패턴

```typescript
// 패턴 1: URL 변경 대기
await page.click('a[href="/products"]');
await page.waitForURL('/products');

// 패턴 2: 로딩 완료 대기
await page.goto('/');
await page.waitForLoadState('networkidle');

// 패턴 3: 특정 요소 나타날 때까지 대기
await page.goto('/');
await page.locator('.main-content').waitFor();
```

---

### 5.3 폼 입력 패턴

```typescript
// 패턴 1: label 기반 (가장 권장)
await page.getByLabel('이메일').fill('test@example.com');
await page.getByLabel('비밀번호').fill('password123');

// 패턴 2: role 기반
await page.getByRole('textbox', { name: '이메일' }).fill('test@example.com');

// 패턴 3: placeholder 기반
await page.getByPlaceholder('이메일 입력').fill('test@example.com');
```

---

### 5.4 목록 검증 패턴

```typescript
// 패턴 1: 개수만 확인
await expect(page.locator('.item')).toHaveCount(10);

// 패턴 2: 첫 번째 아이템 확인
await expect(page.locator('.item').first()).toBeVisible();

// 패턴 3: 모든 아이템 텍스트 확인
const items = page.locator('.item');
await expect(items.nth(0)).toHaveText('첫 번째');
await expect(items.nth(1)).toHaveText('두 번째');
```

---

## 6. 자주 하는 실수

### 실수 1: waitForTimeout() 남용

```typescript
// ❌ 나쁜 예
await page.click('button');
await page.waitForTimeout(3000);

// ✅ 좋은 예
await page.click('button');
await page.locator('.result').waitFor();
```

---

### 실수 2: 불필요한 명시적 대기

```typescript
// ❌ 불필요한 중복 (스마트 대기 무시)
await page.locator('button').waitFor();
await page.click('button');

// ✅ 간결하게 (자동으로 대기)
await page.click('button');

// 💡 설명:
// page.click()은 이미 다음을 자동으로 대기:
// - 요소 존재
// - 요소 보임
// - 요소 활성화
// - 요소 안정
```

**예외: 명시적 대기가 필요한 경우**
```typescript
// ✅ hidden 대기 (스마트 대기가 안 함)
await page.locator('.loading').waitFor({ state: 'hidden' });

// ✅ detached 대기 (스마트 대기가 안 함)
await page.locator('.modal').waitFor({ state: 'detached' });

// ✅ 가독성을 위해 (선택적)
await page.locator('.content').waitFor();  // "콘텐츠 나타날 때까지" 명시
await expect(page.locator('.content')).toBeVisible();
```

---

### 실수 3: 잘못된 로케이터

```typescript
// ❌ 취약한 선택자
await page.locator('div > div > button').click();

// ✅ 의미있는 선택자
await page.getByRole('button', { name: '제출' }).click();
```

---

## 7. 베스트 프랙티스

### 7.1 우선순위

```typescript
// 1순위: getByRole()
await page.getByRole('button', { name: '로그인' }).click();

// 2순위: getByLabel(), getByText()
await page.getByLabel('이메일').fill('test@example.com');

// 3순위: data-testid
await page.getByTestId('submit-btn').click();

// 4순위: CSS 선택자
await page.locator('.btn-primary').click();
```

---

### 7.2 안정화 코드 사용 가이드

#### 스마트 대기 활용 (기본)
```typescript
// ✅ 대부분의 경우: 그냥 사용 (자동 대기됨)
await page.click('button');
await page.fill('input', 'text');
await page.selectOption('select', 'option');

// 💡 Playwright가 자동으로:
// - 요소 존재까지 대기
// - 요소 보일 때까지 대기
// - 요소 활성화까지 대기
// - 요소 안정될 때까지 대기
```

#### 명시적 대기가 필요한 경우
```typescript
// ✅ 페이지 이동 시
await page.goto('/dashboard');
await page.waitForLoadState('load');

// ✅ 로딩 스피너 사라짐 대기
await page.locator('.loading').waitFor({ state: 'hidden' });

// ✅ URL 변경 대기
await page.click('a[href="/products"]');
await page.waitForURL('/products');

// ✅ 모달 완전히 닫힘 대기
await page.click('.modal-close');
await page.locator('.modal').waitFor({ state: 'detached' });

// ✅ API 응답 대기
const [response] = await Promise.all([
  page.waitForResponse(res => res.url().includes('/api/data')),
  page.click('button')
]);
```

#### 절대 사용 금지
```typescript
// ❌ waitForTimeout() - 안티패턴!
await page.waitForTimeout(3000);

// ✅ 대신 조건 기반 대기
await page.locator('.element').waitFor();
```

---

## 8. 본 사이트 신규 기능 연습 시나리오

> 이 장의 셀렉터는 전부 본 사이트 소스(`src/pages/*.jsx`)에서 확인된 **실제 이름**입니다.
> 코드는 여러분의 별도 테스트 레포에 작성하세요.

### 8.0 신규 페이지 셀렉터 레퍼런스

#### 회원가입 `/signup` (Signup.jsx)
| 용도 | 셀렉터 |
|---|---|
| 아이디 입력 / 중복확인 버튼 | `#signup-username`, `#username-check-btn` |
| 중복확인 결과 | `[data-testid="username-check-result"]` |
| 비밀번호 / 확인 / 이메일 | `#signup-password`, `#signup-password-confirm`, `#signup-email` |
| 필드별 에러 (`role=alert`) | `[data-testid="signup-username-error"]`, `[data-testid="signup-password-error"]`, `[data-testid="password-confirm-error"]`, `[data-testid="signup-email-error"]` |
| 가입 버튼 | `#signup-submit` (data-testid: `signup-submit-button`) |
| API 에러 / 성공 메시지 | `[data-testid="signup-error"]`, `[data-testid="signup-success"]` |

#### 체크아웃 `/checkout` (Checkout.jsx)
| 용도 | 셀렉터 |
|---|---|
| 주문 상품 행 | `[data-testid="checkout-item-{productId}"]` |
| 배송지 입력 | `#checkout-name`, `#checkout-phone`, `#checkout-address`, `#checkout-memo` |
| 배송지 에러 | `[data-testid="checkout-name-error"]`, `[data-testid="checkout-phone-error"]`, `[data-testid="checkout-address-error"]` |
| 쿠폰 | `#coupon-code`, `[data-testid="coupon-apply-btn"]`, `[data-testid="coupon-message"]`, `[data-testid="coupon-remove-btn"]` |
| 결제수단 라디오 | `#payment-card`, `#payment-bank`, `#payment-kakao` |
| 약관 동의 (체크 전 결제버튼 비활성) | `#agree-terms` |
| 결제 버튼 | `#place-order-btn` |
| 금액 요약 / 에러 / 빈 상태 | `[data-testid="checkout-subtotal"]`, `[data-testid="checkout-discount"]`, `[data-testid="checkout-final"]`, `[data-testid="checkout-error"]`, `[data-testid="checkout-empty"]` |

#### 주문내역 `/orders` (OrderHistory.jsx)
| 용도 | 셀렉터 |
|---|---|
| 주문 행 (클릭 = 상세 확장 토글) | `[data-testid="order-item-{orderId}"]` |
| 확장된 상세 영역 | `[data-testid="order-detail-{orderId}"]` |
| 취소 버튼 (확장 후에만 노출, `confirm()` 발생) | `[data-testid="order-cancel-{orderId}"]` |
| 상태 뱃지 (`결제완료`/`취소됨`, `data-status` 속성) | `[data-testid="order-status-{orderId}"]` |
| 취소 결과 / 빈 목록 / 로그인 필요 | `[data-testid="order-cancel-message"]`, `[data-testid="orders-empty"]`, `[data-testid="orders-login-required"]` |

#### 위시리스트 `/wishlist` (Wishlist.jsx) + 목록/홈 하트
| 용도 | 셀렉터 |
|---|---|
| 목록/홈 카드의 하트 토글 (`aria-pressed`) | `[data-testid="wishlist-toggle-{id}"]` |
| 위시리스트 행 | `[data-testid="wishlist-item-{productId}"]` |
| 장바구니 담기 / 삭제 | `[data-testid="wishlist-add-to-cart-{productId}"]`, `[data-testid="wishlist-remove-{productId}"]` |
| 빈 목록 / 로그인 필요 | `[data-testid="wishlist-empty"]`, `[data-testid="wishlist-login-required"]` |

#### 상품 상세 `/product/:id` (ProductDetail.jsx)
| 용도 | 셀렉터 |
|---|---|
| 갤러리 (이미지 3장) | `[data-testid="product-main-image"]`, `[data-testid="gallery-thumb-0"]`~`gallery-thumb-2` (`aria-pressed`) |
| 탭 | `#tab-description`, `#tab-specs`, `#tab-shipping`, `#tab-reviews` → 패널 `[data-testid="tab-panel-description"]` 등 (활성 탭 패널만 DOM에 존재) |
| 스펙 행 | `[data-testid="spec-row-{i}"]` (상품당 7~8행) |
| 재고 뱃지 (`품절`/`재고 부족`/`재고 충분`) | `[data-testid="stock-badge"]` — 품절 시 `#add-to-cart-button`, `#buy-now-button` 모두 `disabled` |
| 평점 요약 | `[data-testid="rating-average"]`, `[data-testid="rating-bar-5"]`~`rating-bar-1` |
| 리뷰 작성 (로그인 필요) | `[data-testid="star-input-1"]`~`star-input-5`, `#review-comment`, `#review-submit`, `[data-testid="review-form-message"]` (in-DOM 메시지, alert 아님) |
| 리뷰 정렬 / 더보기 / 항목 | `#review-sort` (`latest`/`rating`), `[data-testid="review-load-more"]`, `[data-testid="review-item-{id}"]` |

#### 목록 `/products` · 홈 `/`
| 용도 | 셀렉터 |
|---|---|
| 정렬 (홈·목록 공통) | `#sort-select` (`default`/`price-asc`/`price-desc`/`name`/`discount`) |
| 가격 필터 (**/products 전용**) | `#min-price`, `#max-price`, `[data-testid="apply-price-filter"]`, `[data-testid="reset-price-filter"]`, `[data-testid="price-filter-error"]` |
| 검색 결과 개수 (/products) | `[data-testid="search-result-count"]` |
| 품절 뱃지 (씨드 기준 상품 3/8/18) | `[data-testid="soldout-badge-{id}"]` |

#### 장바구니 `/cart` · 주문완료 `/order-complete`
- 장바구니는 **서버 장바구니**(로그인 필수)이며 `cart-item-{productId}` 등 기존 `cart-*` testid는 **productId 기준**입니다. `#checkout-btn` 클릭 시 `/checkout`으로 이동합니다(주문 생성은 체크아웃 페이지에서).
- 주문완료: `[data-testid="order-complete-id"]`(주문번호 `ORD-yyyymmdd-XXXX`), `[data-testid="order-complete-amount"]`, `[data-testid="go-orders-btn"]`

---

### 8.1 회원가입 플로우 (중복확인 → 검증 에러 → 가입 → 로그인)

```typescript
import { test, expect } from '@playwright/test';

test('회원가입 전체 플로우', async ({ page }) => {
  // 아이디 규칙: 영문 소문자 + 숫자 4~12자
  const username = `qa${Date.now().toString().slice(-8)}`;

  await page.goto('/signup');

  // 1) 이미 존재하는 아이디로 중복확인
  await page.fill('#signup-username', 'test');
  await page.click('#username-check-btn');
  await expect(page.getByTestId('username-check-result'))
    .toContainText('이미 사용 중인 아이디입니다');

  // 2) 검증 에러: 잘못된 값으로 제출 → 필드별 role=alert 에러
  await page.fill('#signup-username', 'BAD!');       // 형식 위반
  await page.fill('#signup-password', 'short');       // 8자 미만
  await page.click('#signup-submit');
  await expect(page.getByTestId('signup-username-error')).toBeVisible();
  await expect(page.getByTestId('signup-password-error'))
    .toContainText('8자 이상');

  // 3) 정상 가입 (비밀번호: 8자 이상, 영문+숫자)
  await page.fill('#signup-username', username);
  await page.click('#username-check-btn');
  await expect(page.getByTestId('username-check-result'))
    .toContainText('사용 가능한 아이디입니다');
  await page.fill('#signup-password', 'password1');
  await page.fill('#signup-password-confirm', 'password1');
  await page.click('#signup-submit');

  // 성공 메시지(in-DOM) → 약 1초 뒤 자동으로 /login 이동
  await expect(page.getByTestId('signup-success')).toBeVisible();
  await page.waitForURL('/login');

  // 4) 새 계정으로 로그인
  await page.fill('#login-username', username);
  await page.fill('#login-password', 'password1');
  await page.click('#login-submit');
  await expect(page.locator('#home-logout')).toBeVisible();
});
```

> 참고: 가입 계정은 서버 DB에 저장되므로 반복 실행 시 아이디를 매번 새로 생성하거나,
> `POST /api/reset`으로 시드 상태로 되돌리세요. 공유 배포 환경에서는 reset이 **모든 사용자**의 데이터를 초기화하니 주의.

---

### 8.2 체크아웃 플로우 (검증 에러 → 쿠폰 → 약관 게이팅 → 주문완료)

```typescript
import { test, expect } from '@playwright/test';

test('체크아웃 전체 플로우', async ({ page }) => {
  // 로그인
  await page.goto('/login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  await expect(page.locator('#home-logout')).toBeVisible();

  // 장바구니 담기 (성공 시 alert 발생 → 다이얼로그 처리)
  page.once('dialog', (dialog) => dialog.accept());
  await page.click('[data-testid="add-to-cart-btn-1"]');

  // 장바구니 → 체크아웃 (전 상품 자동 선택됨)
  await page.click('[data-testid="cart-button"]');
  await page.click('#checkout-btn');
  await page.waitForURL('/checkout');

  // 1) 약관 게이팅: 체크 전에는 결제 버튼 비활성
  await expect(page.locator('#place-order-btn')).toBeDisabled();
  await page.check('#agree-terms');
  await expect(page.locator('#place-order-btn')).toBeEnabled();

  // 2) 배송지 비운 채 결제 → 필드별 검증 에러
  await page.click('#place-order-btn');
  await expect(page.getByTestId('checkout-name-error')).toBeVisible();
  await expect(page.getByTestId('checkout-phone-error')).toBeVisible();
  await expect(page.getByTestId('checkout-address-error')).toBeVisible();

  // 3) 쿠폰 실패: EXPIRED10 (만료 쿠폰, 의도적) → 400 COUPON_EXPIRED
  await page.fill('#coupon-code', 'EXPIRED10');
  await page.click('[data-testid="coupon-apply-btn"]');
  await expect(page.getByTestId('coupon-message'))
    .toContainText('만료된 쿠폰입니다');

  // 4) 쿠폰 성공: WELCOME10 (10%, 최대 2만원)
  await page.fill('#coupon-code', 'WELCOME10');
  await page.click('[data-testid="coupon-apply-btn"]');
  await expect(page.getByTestId('coupon-message')).toContainText('쿠폰이 적용되었습니다');
  await expect(page.getByTestId('checkout-discount')).not.toHaveText('-0원');

  // 5) 배송지 입력 후 주문
  await page.fill('#checkout-name', '홍길동');
  await page.fill('#checkout-phone', '010-1234-5678');
  await page.fill('#checkout-address', '서울시 강남구 테헤란로 1');
  await page.click('#place-order-btn');

  // 6) 주문완료: 주문번호 형식 검증 (ORD-yyyymmdd-XXXX)
  await page.waitForURL('/order-complete');
  await expect(page.getByTestId('order-complete-id'))
    .toHaveText(/^ORD-\d{8}-[A-Z0-9]{4}$/);
  await expect(page.getByTestId('order-complete-amount')).toBeVisible();
});
```

> 가격/할인은 **서버(DB)가 결정**합니다. 클라이언트가 보낸 가격은 무시되므로,
> `checkout-final` 금액과 주문 API 응답의 `finalPrice`가 일치하는지 검증하는 것도 좋은 연습입니다.
> 참고: 상품 3/4 포함 주문은 422 `ORDER_BLOCKED_PRODUCT`, 재고 0(상품 18)은 409 `INSUFFICIENT_STOCK` — `checkout-error`에 표시됩니다(의도적).

---

### 8.3 주문내역 (행 확장 → 취소 confirm → 상태 전이)

> 전제: 취소할 `결제완료` 주문이 최소 1건 필요합니다 (8.2 시나리오를 먼저 실행하거나 테스트 안에서 주문 생성).

```typescript
import { test, expect } from '@playwright/test';

test('주문 취소 플로우', async ({ page }) => {
  // 로그인 후 /orders 이동 (딥링크 직후는 REQ-1 때문에 비로그인이므로 UI 로그인 먼저)
  await page.goto('/login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  await page.click('#home-orders-btn');
  await page.waitForURL('/orders');

  // 첫 번째 주문 행 클릭 → 상세 확장
  const firstOrder = page.locator('[data-testid^="order-item-"]').first();
  const orderId = (await firstOrder.getAttribute('data-testid'))!
    .replace('order-item-', '');
  await firstOrder.click();
  await expect(page.getByTestId(`order-detail-${orderId}`)).toBeVisible();

  // 취소 버튼은 확장 후에만 노출, 클릭 시 confirm() 발생
  page.once('dialog', (dialog) => dialog.accept()); // '주문을 취소하시겠습니까?'
  await page.getByTestId(`order-cancel-${orderId}`).click();

  // 상태 전이 검증: 결제완료 → 취소됨 (재고도 복원됨)
  await expect(page.getByTestId('order-cancel-message')).toBeVisible();
  await expect(page.getByTestId(`order-status-${orderId}`)).toHaveText('취소됨');
});
```

> `dialog.dismiss()`로 confirm을 취소하면 상태가 그대로 `결제완료`로 남는 것도 함께 검증해보세요.
> 이미 취소된 주문을 다시 취소하면 API가 409 `ALREADY_CANCELED`를 반환합니다.

---

### 8.4 위시리스트 (하트 토글 → 페이지 확인 → 삭제)

```typescript
import { test, expect } from '@playwright/test';

test('위시리스트 플로우', async ({ page }) => {
  // 로그인 (비로그인 상태로 하트 클릭 시 로그인 유도 confirm 발생)
  await page.goto('/login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');

  // 1) 홈 카드의 하트 토글 → aria-pressed 검증
  const heart = page.getByTestId('wishlist-toggle-1');
  await expect(heart).toHaveAttribute('aria-pressed', 'false');
  await heart.click();
  await expect(heart).toHaveAttribute('aria-pressed', 'true');

  // 2) 위시리스트 페이지에서 확인
  await page.click('#home-wishlist-btn');
  await page.waitForURL('/wishlist');
  await expect(page.getByTestId('wishlist-item-1')).toBeVisible();

  // 3) 삭제 → 행 제거 (마지막 항목이었다면 wishlist-empty 표시)
  await page.getByTestId('wishlist-remove-1').click();
  await expect(page.getByTestId('wishlist-item-1')).not.toBeVisible();
});
```

---

### 8.5 상품 상세 (갤러리 스왑 · 탭 전환 · 리뷰 작성 · 품절 검증)

```typescript
import { test, expect } from '@playwright/test';

test('갤러리와 탭', async ({ page }) => {
  await page.goto('/product/1'); // 딥링크 (비로그인이어도 조회 가능)

  // 갤러리 스왑: 썸네일 클릭 → 메인 이미지 src 변경
  const mainImage = page.getByTestId('product-main-image');
  const before = await mainImage.getAttribute('src');
  await page.getByTestId('gallery-thumb-1').click();
  await expect(mainImage).not.toHaveAttribute('src', before!);

  // 탭 전환: 활성 탭 패널만 DOM에 존재
  await page.click('#tab-specs');
  await expect(page.getByTestId('tab-panel-specs')).toBeVisible();
  await expect(page.getByTestId('spec-row-0')).toBeVisible();
});

test('리뷰 작성 → in-DOM 메시지 → 평점 분포 갱신', async ({ page }) => {
  // 리뷰 작성은 로그인 필요 → UI 로그인 후 상세 진입
  await page.goto('/login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  await page.click('[data-testid="view-detail-btn-1"]');

  await page.click('#tab-reviews');
  await page.getByTestId('star-input-4').click();          // 별점 4점
  await page.fill('#review-comment', '자동화 연습용 리뷰입니다'); // 10자 이상 필수
  await page.click('#review-submit');

  // 결과는 alert가 아닌 in-DOM 메시지로 표시됨
  await expect(page.getByTestId('review-form-message'))
    .toContainText('리뷰가 등록되었습니다');

  // 평점 요약(rating-average / rating-bar-*)이 자동 갱신됨
  await expect(page.getByTestId('rating-average')).toBeVisible();
  await expect(page.getByTestId('rating-bar-4')).toBeVisible();
});

test('품절 상품(18)은 구매 버튼 비활성', async ({ page }) => {
  await page.goto('/product/18'); // 씨드 기준 재고 0 (의도적)

  await expect(page.getByTestId('stock-badge')).toHaveText('품절');
  await expect(page.locator('#add-to-cart-button')).toBeDisabled();
  await expect(page.locator('#buy-now-button')).toBeDisabled();
});
```

> 리뷰는 계정당 상품 1개만 작성 가능 — 같은 계정으로 다시 제출하면 409 `REVIEW_ALREADY_EXISTS`가
> `review-form-message`에 표시됩니다. 10자 미만 코멘트는 400 `COMMENT_TOO_SHORT`. 둘 다 좋은 negative 연습입니다.

---

### 8.6 목록 (정렬 · 가격 필터 · 품절 뱃지)

```typescript
import { test, expect } from '@playwright/test';

test('정렬과 가격 필터', async ({ page }) => {
  await page.goto('/products');

  // 정렬: 낮은 가격순
  await page.selectOption('#sort-select', 'price-asc');

  // 가격 필터 에러: 최소 > 최대
  await page.fill('#min-price', '50000');
  await page.fill('#max-price', '10000');
  await page.click('[data-testid="apply-price-filter"]');
  await expect(page.getByTestId('price-filter-error'))
    .toContainText('최소 가격이 최대 가격보다 클 수 없습니다');

  // 정상 필터 적용 → 결과 개수 표시
  await page.fill('#min-price', '10000');
  await page.fill('#max-price', '50000');
  await page.click('[data-testid="apply-price-filter"]');
  await expect(page.getByTestId('search-result-count')).toBeVisible();

  // 품절 뱃지 (씨드 기준 상품 3/8/18 재고 0)
  await page.click('[data-testid="reset-price-filter"]');
  await expect(page.getByTestId('soldout-badge-3')).toBeVisible();
});
```

---

### 8.7 서버 장바구니 영속성 (storageState 대신 상태 검증)

장바구니가 계정(DB)에 묶여 있으므로, **브라우저 컨텍스트를 새로 만들어도 로그인만 하면 같은 장바구니**가 보입니다.

```typescript
import { test, expect } from '@playwright/test';

test('다른 브라우저 컨텍스트에서도 장바구니 유지', async ({ browser }) => {
  // 컨텍스트 A: 로그인 후 상품 담기
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await pageA.goto('/login');
  await pageA.fill('#login-username', 'test');
  await pageA.fill('#login-password', '1234');
  await pageA.click('#login-submit');
  pageA.once('dialog', (d) => d.accept());
  await pageA.click('[data-testid="add-to-cart-btn-1"]');
  await ctxA.close();

  // 컨텍스트 B: 완전히 새로운 브라우저 상태에서 같은 계정으로 로그인
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await pageB.goto('/login');
  await pageB.fill('#login-username', 'test');
  await pageB.fill('#login-password', '1234');
  await pageB.click('#login-submit');

  // 서버 장바구니가 그대로 유지되어 있음
  await pageB.click('[data-testid="cart-button"]');
  await expect(pageB.getByTestId('cart-item-1')).toBeVisible();
  await ctxB.close();
});
```

> REQ-1 때문에 `storageState`로 **로그인 상태**는 재사용할 수 없지만, 장바구니 데이터 자체는
> 서버에 남아 있다는 점이 핵심입니다. 테스트 간 간섭을 피하려면 테스트 시작/종료 시
> 장바구니를 비우거나(`cart_update` 수량 0) `POST /api/reset`을 사용하세요.

---

## 🎯 최종 정리

### 필수 암기 4가지

```typescript
// 1. 스마트 대기 믿기 (가장 중요!) ⭐
await page.click('button');  // waitFor() 불필요

// 2. 로케이터는 role 우선
await page.getByRole('button', { name: '제출' }).click();

// 3. 로딩은 hidden 대기
await page.locator('.loading').waitFor({ state: 'hidden' });

// 4. waitForTimeout() 절대 금지
// await page.waitForTimeout(3000);  // ❌ 절대 사용 금지!
```

### 스마트 대기 vs 명시적 대기

```typescript
// 스마트 대기 (자동) - 90%의 경우
await page.click('button');
await page.fill('input', 'text');
await page.check('checkbox');

// 명시적 대기 (수동) - 10%의 경우
await page.locator('.loading').waitFor({ state: 'hidden' });
await page.waitForURL('/dashboard');
await page.waitForLoadState('networkidle');
```

**기억하세요:**
- ✅ 대부분: 스마트 대기에 맡기기
- ✅ 특별한 경우만: 명시적 대기 추가
- ❌ 절대 금지: waitForTimeout()

**이것만 기억하면 90% 해결!** 🎉
