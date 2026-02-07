# 🎨 UI 자동화 검증 가이드

---

## 📚 목차
1. [UI 자동화 검증이란?](#1-ui-자동화-검증이란)
2. [안정화 코드 완전 정복](#2-안정화-코드-완전-정복)
3. [로케이터 함수 완전 정복](#3-로케이터-함수-완전-정복)
4. [검증 함수 완전 정복](#4-검증-함수-완전-정복)
5. [실전 패턴과 조합](#5-실전-패턴과-조합)
6. [자주 하는 실수](#6-자주-하는-실수)
7. [베스트 프랙티스](#7-베스트-프랙티스)

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

// ✅ 사용: 로그인 후 리다이렉트 확인
await page.click('#login-submit');
await page.waitForURL('/dashboard');

// ✅ 사용: SPA 라우팅 대기
await page.click('nav a:has-text("상품")');
await page.waitForURL('**/products');

// ❌ 불필요: expect와 중복
await page.waitForURL('/dashboard');
await expect(page).toHaveURL('/dashboard');  // 중복!
```

#### 실전 예시

```typescript
test('로그인 후 대시보드 이동', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('#username', 'test');
  await page.fill('#password', 'test1234');
  await page.click('#login-submit');
  
  // URL 변경 대기
  await page.waitForURL('/dashboard');
  
  // 이제 안전하게 검증
  await expect(page.locator('h1')).toHaveText('대시보드');
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

// ✅ 사용: ID가 있을 때
await page.locator('#username').fill('test');

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

#### 실전 예시

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
await expect(page.locator('#username')).toHaveValue('test');
```

#### 언제 써야 하나?

```typescript
// ✅ 사용: input 값 확인
await page.fill('#username', 'test');
await expect(page.locator('#username')).toHaveValue('test');

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
await expect(page.locator('#submit')).toBeDisabled();

await page.fill('#username', 'test');
await page.fill('#password', 'test1234');

await expect(page.locator('#submit')).toBeEnabled();
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
