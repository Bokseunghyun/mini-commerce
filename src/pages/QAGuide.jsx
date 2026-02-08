/**
 * QA 자동화 가이드 컴포넌트
 * - 프로젝트의 QA 자동화 포인트를 안내
 * - Playwright 테스트 시나리오 예시 제공 (TypeScript 형식)
 * - UI 자동화 검증 & API 검증 가이드 포함 (전체 내용)
 */

import { useState } from "react";

// UI 자동화 가이드 전체 내용 (1023줄)
const UI_GUIDE_FULL_CONTENT = `# 🎨 UI 자동화 검증 가이드

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
`;

// API 검증 가이드 전체 내용 (1377줄)
const API_GUIDE_FULL_CONTENT = `# API 검증 가이드

---

## 📚 목차
1. [API 검증이 정확히 뭔데?](#1-api-검증이-정확히-뭔데)
2. [왜 API 검증이 필요한가?](#2-왜-api-검증이-필요한가)
3. [핵심 함수 완전 정복](#3-핵심-함수-완전-정복)
4. [손에 익히는 4단계 학습법](#4-손에-익히는-4단계-학습법)
5. [콘솔 디버깅 완전 정복](#5-콘솔-디버깅-완전-정복)
6. [실전 연습 프로젝트](#6-실전-연습-프로젝트)
7. [체화 훈련](#7-체화-훈련)
8. [API 성능 테스트](#8-api-성능-테스트)
9. [자주 하는 실수](#9-자주-하는-실수)

---

## 1. API 검증이 정확히 뭔데?

### 1.1 기본 개념

**API 검증 = 서버와 브라우저 사이의 대화를 엿듣는 것**

```
[브라우저] ━━ "로그인해줘!" ━━▶ [서버]
           ◀━━ "OK! 토큰 줄게" ━━

API 검증 = 이 대화 내용을 확인하는 것
- "서버가 제대로 응답했나?"
- "토큰을 진짜 줬나?"
- "에러는 없나?"
```

### 1.2 UI 검증 vs API 검증

```typescript
// UI 검증 (당신이 익숙한 것)
await page.click('button');
await expect(page.locator('.success-message')).toBeVisible();
// ✅ "화면에 성공 메시지 떴네!" → 테스트 통과

// 하지만...
// 서버: { error: "DB connection failed" } 
// → UI는 성공 보여줬지만 실제론 실패!
```

```typescript
// API 검증 (새로 배울 것)
const response = await page.waitForResponse((res) => 
  res.url().includes('/api/login')
);

expect(response.status()).toBe(200);     // 서버 응답 성공?
const data = await response.json();       
expect(data.token).toBeTruthy();          // 토큰 실제로 받았나?
expect(data.error).toBeUndefined();       // 에러 없나?

await expect(page.locator('.success-message')).toBeVisible();
// → 서버 응답까지 확인 → 진짜 성공!
```

**핵심 차이:**
- **UI 검증**: "화면이 맞나?" (표면만 봄)
- **API 검증**: "서버가 올바른 데이터를 줬나?" (속까지 봄)

---

## 2. 왜 API 검증이 필요한가?

### 2.1 실무 사례로 이해하기

#### 🐛 사례 1: UI는 성공인데 실제론 실패
```typescript
// 로그인 버튼 클릭
await page.click('#login-submit');

// UI 검증만 함
await expect(page.locator('.success')).toBeVisible();
await expect(page).toHaveURL('/dashboard');
// ✅ 테스트 통과!

// 실제 API 응답:
{
  "token": null,
  "error": "Database connection timeout",
  "code": "DB_ERROR"
}

// 문제:
// - 프론트엔드가 에러를 무시하고 dashboard로 이동
// - 토큰이 없어서 다음 API 호출 시 전부 401 에러
// - 사용자는 "로그인됐다고 했는데 왜 안 돼?" 하고 문의
```

**API 검증으로 잡는 법:**
```typescript
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/login')),
  page.click('#login-submit')
]);

// 상태 코드 확인
expect(response.status()).toBe(200);  // ❌ 500이면 여기서 실패!

// 데이터 확인
const data = await response.json();
expect(data.token).toBeTruthy();      // ❌ null이면 여기서 실패!
expect(data.error).toBeUndefined();   // ❌ 에러 있으면 여기서 실패!

// UI 확인
await expect(page.locator('.success')).toBeVisible();
```

---

#### 🐛 사례 2: 재고 부족 에러 놓침
```typescript
// 주문하기 버튼 클릭
await page.click('text=주문하기');

// UI만 체크
await expect(page).toHaveURL('/order-complete');
// ✅ URL 바뀜 = 성공!

// 실제 API 응답:
{
  "success": false,
  "code": "OUT_OF_STOCK",
  "message": "재고가 부족합니다"
}

// 문제:
// - 프론트엔드가 에러 무시하고 완료 페이지로 이동
// - 실제론 주문 안 됨
// - 결제는 되는데 배송은 안 됨 → 환불 처리 필요
```

**API 검증으로 잡는 법:**
```typescript
const [orderResponse] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/order')),
  page.click('text=주문하기')
]);

// 재고 있을 때
if (orderResponse.status() === 200) {
  const data = await orderResponse.json();
  expect(data.orderId).toBeDefined();
  expect(data.success).toBe(true);
}

// 재고 없을 때
if (orderResponse.status() === 409) {  // Conflict
  const error = await orderResponse.json();
  expect(error.code).toBe('OUT_OF_STOCK');
  // UI에 에러 메시지 떠야 함
  await expect(page.locator('text=재고가 부족')).toBeVisible();
}
```

---

### 2.2 API 검증으로 잡을 수 있는 것들

```typescript
// 1️⃣ 서버 에러 (500, 502, 503)
expect(response.status()).not.toBe(500);

// 2️⃣ 인증 에러 (401, 403)
expect(response.status()).not.toBe(401); // 토큰 없음
expect(response.status()).not.toBe(403); // 권한 없음

// 3️⃣ 데이터 누락
const data = await response.json();
expect(data.userId).toBeDefined();       // undefined면 에러!

// 4️⃣ 잘못된 데이터 타입
expect(typeof data.price).toBe('number'); // string 오면 에러!
expect(Array.isArray(data.items)).toBe(true);

// 5️⃣ 비즈니스 로직 에러
expect(data.stock).toBeGreaterThan(0);    // 재고 0개면 에러!
expect(data.discount).toBeLessThan(100);  // 할인 100% 넘으면 에러!

// 6️⃣ 보안 이슈
expect(data.password).toBeUndefined();    // 비밀번호 노출되면 안 됨!

// 7️⃣ 성능 이슈
const responseTime = Date.now() - startTime;
expect(responseTime).toBeLessThan(1000);  // 1초 넘으면 느림!
```

---

### 2.3 검증 레벨별 차이

```typescript
// 🥉 레벨 1: 최소 검증 (상태 코드만)
expect(response.status()).toBe(200);
// → "서버가 성공 응답은 했구나"

// 🥈 레벨 2: 기본 검증 (핵심 데이터)
const data = await response.json();
expect(data.token).toBeTruthy();
// → "토큰도 받았구나"

// 🥇 레벨 3: 완벽 검증 (전체 구조)
expect(data).toMatchObject({
  token: expect.any(String),
  user: {
    id: expect.any(Number),
    name: expect.any(String),
    email: expect.stringContaining('@')
  }
});
// → "데이터 구조가 정확하구나"

// 🏆 레벨 4: 고급 검증 (Request까지)
const request = response.request();
const requestBody = JSON.parse(request.postData() || '{}');
expect(requestBody.password.length).toBeGreaterThan(8);
// → "비밀번호도 8자 이상으로 보냈구나"
```

---

### 2.4 왜 이 순서로 검증해야 하나?

```typescript
// ❌ 잘못된 순서 (에러 발생!)
const data = await response.json();       // 500 에러면 여기서 터짐!
expect(response.status()).toBe(200);      // 실행 안 됨

// ✅ 올바른 순서
expect(response.status()).toBe(200);      // 1. 먼저 상태 확인
const data = await response.json();       // 2. 성공이면 파싱
expect(data.token).toBeTruthy();          // 3. 데이터 검증

// 이유:
// - 500 에러일 때 response.json() 호출하면 에러 발생
// - "Unexpected token < in JSON" 같은 에러 뜸
// - HTML 에러 페이지가 와서 JSON 파싱 실패
```

---

## 3. 핵심 함수 완전 정복

### 3.1 page.waitForResponse() - API 응답 캐치하기

#### 역할
**브라우저가 특정 API 응답을 받을 때까지 기다림**

```typescript
const response = await page.waitForResponse(predicate);
```

#### predicate가 뭔데?
**"이런 조건의 응답이 오면 잡아줘"라고 알려주는 함수**

```typescript
// 조건: URL에 '/api/login' 포함
(res) => res.url().includes('/api/login')

// 동작:
// 1. 브라우저가 모든 네트워크 요청 모니터링
// 2. 응답 올 때마다 이 함수 실행
// 3. true 반환하면 그 응답을 잡아서 리턴
```

#### 예시로 이해하기

```typescript
// 예시 1: 단순 URL 매칭
const response = await page.waitForResponse((res) => 
  res.url().includes('/api/products')
);
// "URL에 /api/products 들어간 응답 잡아줘"

// 예시 2: URL + HTTP 메서드
const response = await page.waitForResponse((res) => 
  res.url().includes('/api/admin') && 
  res.request().method() === 'POST'
);
// "URL에 /api/admin 들어가고 POST 요청인 응답 잡아줘"

// 예시 3: 정확한 URL
const response = await page.waitForResponse(
  'https://api.example.com/login'
);
// "정확히 이 URL인 응답만 잡아줘"

// 예시 4: 정규식
const response = await page.waitForResponse((res) => 
  /\/api\/products\/\d+/.test(res.url())
);
// "URL이 /api/products/1, /api/products/2 같은 패턴인 응답 잡아줘"
```

#### ⚠️ 주의사항: 타이밍이 생명!

```typescript
// ❌ 잘못된 사용 (응답 놓침!)
await page.click('button');  // 1. 클릭 (API 호출 발생)
const response = await page.waitForResponse(...);  // 2. 대기 시작 (이미 늦음!)

// 타임라인:
// [클릭] ━▶ [API 호출] ━▶ [응답 도착] ━▶ [대기 시작] ❌
//                          ↑ 이미 지나감!

// ✅ 올바른 사용 (동시 실행)
const [response] = await Promise.all([
  page.waitForResponse(...),  // 1. 대기 시작
  page.click('button')        // 2. 클릭 (거의 동시에)
]);

// 타임라인:
// [대기 시작] ━━━━━━━━━━━━━━▶ [응답 캐치!] ✅
//     ↓
// [클릭] ━▶ [API 호출] ━▶ [응답 도착]
```

---

### 3.2 Promise.all() - 왜 필요한가?

#### 역할
**여러 비동기 작업을 동시에 실행하고 모두 완료될 때까지 대기**

#### 왜 필요한가? (타임라인으로 이해)

```typescript
// 방법 1: 순차 실행 (느림 + 응답 놓칠 수 있음)
await page.click('button');           // 1초 걸림
const response = await page.waitForResponse(...); // 응답 이미 지나감!

// 타임라인:
// [클릭 1초] ━━━▶ [대기 시작] ━━━▶ ❌ (응답 못 잡음)

// 방법 2: Promise.all (빠름 + 응답 확실히 잡음)
const [response] = await Promise.all([
  page.waitForResponse(...),  // 대기 시작
  page.click('button')        // 클릭
]);

// 타임라인:
// [대기 시작] ━━━━━━━━━━━━━━▶ ✅ (응답 캐치!)
//     ↓
// [클릭] ━━━▶ [응답 도착]
```

#### 배열 구조 분해 할당 완전 이해

**Promise.all은 항상 배열을 반환합니다:**

```typescript
// Promise.all의 반환값
const result = await Promise.all([
  page.waitForResponse(...),  // 첫 번째 작업 → 응답객체
  page.click('button')        // 두 번째 작업 → undefined (클릭은 반환값 없음)
]);

// result의 실제 값:
// result = [응답객체, undefined]
// result[0] = 응답객체
// result[1] = undefined
```

**이걸 더 편하게 쓰는 방법이 배열 구조 분해:**

```typescript
// 방법 1: 첫 번째 값만 꺼내기 (가장 많이 사용) ⭐
const [response] = await Promise.all([
  page.waitForResponse(...),
  page.click('button')
]);
// response = result[0]과 같음
// 클릭 결과(undefined)는 버림

// 방법 2: 둘 다 꺼내기 (거의 안 씀)
const [response, clickResult] = await Promise.all([
  page.waitForResponse(...),
  page.click('button')
]);
// response = result[0]
// clickResult = result[1] (보통 undefined라 의미 없음)

// 방법 3: 배열 그대로 받기 (비추천 - 불편함)
const result = await Promise.all([
  page.waitForResponse(...),
  page.click('button')
]);
const response = result[0];  // 인덱스로 접근해야 함
```

**왜 `const [response]`를 주로 쓸까?**

```typescript
// ❌ 방법 1: result 사용 (번거로움)
const result = await Promise.all([...]);
const response = result[0];
expect(response.status()).toBe(200);

// ✅ 방법 2: [response] 사용 (간결함)
const [response] = await Promise.all([...]);
expect(response.status()).toBe(200);
```

**실전 예시:**

```typescript
// 예시 1: 응답만 필요 (99% 케이스)
const [loginResponse] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/login')),
  page.click('#login-submit')
]);
expect(loginResponse.status()).toBe(200);

// 예시 2: 여러 API 동시에 받기
const [productsRes, categoriesRes, userRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),
  page.waitForResponse((res) => res.url().includes('/api/categories')),
  page.waitForResponse((res) => res.url().includes('/api/user')),
  page.goto('/')
]);
// productsRes = 첫 번째 응답
// categoriesRes = 두 번째 응답
// userRes = 세 번째 응답
```

**핵심 정리:**
- `const [response]` = 첫 번째 값만 꺼냄 (추천 ⭐)
- `const result` = 전체 배열 받음 (비추천)
- 두 방식 모두 동작은 같지만, `[response]`가 더 깔끔함!

---

### 3.3 여러 로케이터 쓰는 경우

#### 언제 여러 개를 Promise.all에 넣나?

**1️⃣ 여러 API를 동시에 기다릴 때**

```typescript
// 사례: 페이지 로드 시 3개 API 동시 호출
const [productsRes, categoriesRes, userRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),
  page.waitForResponse((res) => res.url().includes('/api/categories')),
  page.waitForResponse((res) => res.url().includes('/api/user')),
  page.goto('/')  // 페이지 이동 (3개 API 동시 발생)
]);

// 모두 검증
expect(productsRes.status()).toBe(200);
expect(categoriesRes.status()).toBe(200);
expect(userRes.status()).toBe(200);
```

**2️⃣ API 응답 + UI 변화를 동시에 기다릴 때**

```typescript
// 사례: 로그인 시 API 응답 + 페이지 이동 동시 발생
const [loginRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/login')),
  page.waitForURL('/dashboard'),  // URL 변경 대기
  page.click('#login-submit')
]);

// API와 UI 모두 검증
expect(loginRes.status()).toBe(200);
await expect(page).toHaveURL('/dashboard');
```

**3️⃣ 여러 요소가 나타나길 기다릴 때**

```typescript
// 사례: 검색 결과가 로딩되면서 여러 요소 나타남
const [searchRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/search')),
  page.locator('.search-result').first().waitFor(),  // 첫 결과 대기
  page.locator('.result-count').waitFor(),           // 개수 표시 대기
  page.click('#search-button')
]);

// 모두 나타났는지 확인
await expect(page.locator('.search-result')).toHaveCount(5);
await expect(page.locator('.result-count')).toHaveText('5개');
```

**4️⃣ 연속된 API 호출을 동시에 캐치**

```typescript
// 사례: 상품 추가 시 추가 API + 목록 갱신 API 연속 호출
const [addRes, listRes] = await Promise.all([
  page.waitForResponse((res) => 
    res.url().includes('/api/admin') && 
    res.request().method() === 'POST'
  ),
  page.waitForResponse((res) => 
    res.url().includes('/api/products')
  ),
  page.click('button:has-text("상품 추가")')
]);

// 둘 다 검증
expect(addRes.status()).toBe(201);   // 추가 성공
expect(listRes.status()).toBe(200);  // 목록 조회 성공
```

#### 주의사항

```typescript
// ⚠️ 순서 주의!
const [res1, res2] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),
  page.waitForResponse((res) => res.url().includes('/api/user')),
  page.goto('/')
]);

// res1 = /api/products 응답
// res2 = /api/user 응답
// → Promise.all 배열 순서대로 할당됨!

// ❌ 잘못된 사용
const [userRes, productsRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),  // 첫 번째
  page.waitForResponse((res) => res.url().includes('/api/user')),      // 두 번째
  page.goto('/')
]);
// userRes에는 products 응답이 들어감! (순서 반대)

// ✅ 올바른 사용
const [productsRes, userRes] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/products')),
  page.waitForResponse((res) => res.url().includes('/api/user')),
  page.goto('/')
]);
```

---

### 3.4 response 객체 메서드

#### response.status()
**역할:** HTTP 상태 코드 반환 (숫자)

```typescript
const status: number = response.status();

// 성공
200  // OK - 조회/수정 성공
201  // Created - 생성 성공
204  // No Content - 삭제 성공

// 클라이언트 에러
400  // Bad Request - 잘못된 요청
401  // Unauthorized - 인증 필요 (토큰 없음)
403  // Forbidden - 권한 없음
404  // Not Found - 못 찾음
409  // Conflict - 충돌 (중복, 재고 부족)

// 서버 에러
500  // Internal Server Error - 서버 에러
502  // Bad Gateway - 게이트웨이 에러
503  // Service Unavailable - 서비스 중단
```

**사용 예시:**
```typescript
// 성공 확인
expect(response.status()).toBe(200);

// 에러 확인
if (response.status() === 401) {
  console.log('로그인 필요!');
} else if (response.status() === 500) {
  console.log('서버 에러 발생!');
}
```

---

#### response.ok()
**역할:** 응답이 성공(200-299)인지 확인 (boolean)

```typescript
const isSuccess: boolean = response.ok();
// 200-299 → true
// 그 외 → false

// 사용 예시
if (response.ok()) {
  const data = await response.json();
  console.log('성공:', data);
} else {
  const error = await response.json();
  console.log('실패:', error);
}

// response.status()와 차이
response.status() === 200  // 정확히 200만
response.ok()              // 200, 201, 204 모두 true
```

---

#### response.json()
**역할:** 응답 본문(body)을 JSON으로 파싱

```typescript
const data: any = await response.json();
// { token: "eyJ...", user: {...} }

expect(data.token).toBeTruthy();
expect(data.user.name).toBe('test');
```

**⚠️ 주의사항:**
```typescript
// 1. await 필수! (비동기 함수)
const data = await response.json();  // ✅
const data = response.json();        // ❌ Promise 객체 반환됨

// 2. 에러일 때 조심
if (response.status() === 500) {
  // HTML 에러 페이지 올 수 있음
  const text = await response.text();  // JSON 아닐 수 있음
  console.log(text);
}

// 3. 한 번만 호출 가능
const data1 = await response.json();  // ✅
const data2 = await response.json();  // ❌ 에러 발생!
```

---

#### response.request()
**역할:** 이 응답을 발생시킨 요청(Request) 객체 반환

```typescript
const request = response.request();

// 1. HTTP 메서드 확인
const method: string = request.method();  
// "GET", "POST", "PUT", "DELETE"

// 2. 요청 헤더 확인
const headers = request.headers();
console.log(headers['authorization']);  // "Bearer eyJ..."
console.log(headers['content-type']);   // "application/json"

// 3. 요청 본문 확인 (POST/PUT)
const postData: string | null = request.postData();
const body = JSON.parse(postData || '{}');
console.log(body);  // { username: "test", password: "..." }

// 4. 요청 URL 확인
const url: string = request.url();
console.log(url);  // "https://api.example.com/login"
```

---

### 3.5 변수명: response vs loginResponse?

**Q: `response`만 써도 되나요?**

**A: 상황에 따라 다릅니다!**

#### 1. API가 1개만 있을 때
```typescript
test('로그인', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  // ✅ response만으로 충분 (명확함)
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.token).toBeTruthy();
});
```

#### 2. API가 여러 개 있을 때
```typescript
test('상품 추가 후 목록 조회', async ({ page }) => {
  // ✅ 명확함
  const [addResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/admin') && 
      res.request().method() === 'POST'
    ),
    page.click('button:has-text("추가")')
  ]);
  expect(addResponse.status()).toBe(201);
  
  const [listResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.reload()
  ]);
  expect(listResponse.status()).toBe(200);
});
```

**결론:**
- 🟢 하나만 있으면 `response` OK
- 🟡 여러 개면 `loginResponse`, `orderResponse` 처럼 구체적으로!
- 🔴 절대 같은 이름 재사용 금지!

---

## 4. 손에 익히는 4단계 학습법

### 🎯 1단계: API 보는 눈 기르기 (1주)

**목표:** 브라우저에서 API 호출 관찰하기

**실습:**
1. Chrome DevTools 열기 (F12)
2. Network 탭 선택
3. 사이트 사용하면서 API 관찰

```
예시: 로그인 버튼 클릭
→ Network 탭에 "login" 요청 보임
→ Status: 200
→ Response: { "token": "eyJ..." }
```

**1단계 졸업 기준:**
- [ ] 버튼 클릭 시 어떤 API 호출될지 예측 가능
- [ ] Network 탭 보고 Request/Response 이해
- [ ] 200, 400, 500 상태 코드 구분 가능

---

### 🎯 2단계: 첫 API 검증 코드 작성 (1주)

**필수 암기 패턴:**
```typescript
// 패턴 1: 단순 응답 대기
const response = await page.waitForResponse((res) => 
  res.url().includes('/api/엔드포인트')
);

// 패턴 2: 클릭과 동시에 응답 대기 (가장 많이 사용!)
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/엔드포인트')),
  page.click('button')
]);

// 패턴 3: 상태 코드 검증
expect(response.status()).toBe(200);

// 패턴 4: 응답 데이터 검증
const data = await response.json();
expect(data.필드명).toBe(기대값);
```

---

### 🎯 3단계: 다양한 시나리오 연습 (2주)

#### 패턴 1: 에러 응답 검증
```typescript
test('잘못된 비밀번호 로그인', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  // 에러 상태 코드
  expect(response.status()).toBe(401);
  
  // 에러 메시지 확인
  const data = await response.json();
  expect(data.code).toBe('AUTH_INVALID');
  expect(data.message).toContain('비밀번호');
});
```

#### 패턴 2: 여러 API 순차 검증
```typescript
test('상품 추가 → 수정 → 삭제', async ({ page }) => {
  // 1. 추가
  const [addResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/admin') && 
      res.request().method() === 'POST'
    ),
    page.click('button:has-text("상품 추가")')
  ]);
  
  expect(addResponse.status()).toBe(201);
  const added = await addResponse.json();
  const productId = added.product.id;
  
  // 2. 수정
  await page.fill('#product-name', '수정된 이름');
  
  const [updateResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/admin') && 
      res.request().method() === 'PUT'
    ),
    page.click('button:has-text("저장")')
  ]);
  
  expect(updateResponse.status()).toBe(200);
  
  // 3. 삭제
  const [deleteResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/admin') && 
      res.request().method() === 'DELETE'
    ),
    page.click('button:has-text("삭제")')
  ]);
  
  expect(deleteResponse.status()).toBe(200);
});
```

---

### 🎯 4단계: 통합 시나리오 (1주)

```typescript
test('전체 주문 흐름 (UI + API 통합)', async ({ page }) => {
  // 1. 로그인
  await page.goto('/');
  await page.click('#login-button');
  await page.fill('#username', 'test');
  await page.fill('#password', 'test1234');
  
  const [loginResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  expect(loginResponse.status()).toBe(200);
  const { token } = await loginResponse.json();
  expect(token).toBeTruthy();
  
  // 2. 상품 조회
  const [productsResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.goto('/')
  ]);
  
  expect(productsResponse.status()).toBe(200);
  const { products } = await productsResponse.json();
  expect(products.length).toBeGreaterThan(0);
  
  // 3. 재고 확인
  const inventoryResponse = await page.waitForResponse(
    (res) => res.url().includes('/api/inventory')
  );
  
  const inventory = await inventoryResponse.json();
  
  // 4. 주문
  await page.click('[aria-label*="장바구니"]');
  
  const [orderResponse] = await Promise.all([
    page.waitForResponse((res) => 
      res.url().includes('/api/user-actions') && 
      res.request().method() === 'POST'
    ),
    page.click('text=주문하기')
  ]);
  
  // 재고에 따른 분기 처리
  if (inventory.stock > 0) {
    expect(orderResponse.status()).toBe(200);
    await expect(page.locator('text=주문 완료')).toBeVisible();
  } else {
    expect(orderResponse.status()).toBe(409);
    const error = await orderResponse.json();
    expect(error.code).toBe('INSUFFICIENT_STOCK');
  }
});
```

---

## 5. 콘솔 디버깅 완전 정복

### 5.1 기본 로깅

#### 응답 전체 구조 보기
```typescript
test('API 응답 구조 파악', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  // 1. 상태 코드
  console.log('Status:', response.status());
  
  // 2. URL
  console.log('URL:', response.url());
  
  // 3. 응답 데이터
  const data = await response.json();
  console.log('Response Data:', JSON.stringify(data, null, 2));
  
  // 4. 응답 헤더
  const headers = response.headers();
  console.log('Headers:', headers);
});
```

**출력 예시:**
```
Status: 200
URL: https://example.com/api/login
Response Data: {
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "test",
    "email": "test@example.com"
  }
}
Headers: {
  'content-type': 'application/json',
  'set-cookie': 'session=abc123...'
}
```

---

### 5.2 Request 정보 로깅

```typescript
test('Request 정보 확인', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/reviews')),
    page.click('button:has-text("등록")')
  ]);
  
  const request = response.request();
  
  // 1. HTTP 메서드
  console.log('Method:', request.method());
  
  // 2. Request URL
  console.log('Request URL:', request.url());
  
  // 3. Request 헤더
  console.log('Request Headers:', request.headers());
  
  // 4. Request Body
  const postData = request.postData();
  if (postData) {
    console.log('Request Body:', JSON.stringify(JSON.parse(postData), null, 2));
  }
});
```

**출력 예시:**
```
Method: POST
Request URL: https://example.com/api/reviews
Request Headers: {
  'authorization': 'Bearer eyJhbGci...',
  'content-type': 'application/json'
}
Request Body: {
  "productId": 1,
  "rating": 5,
  "comment": "정말 좋은 상품입니다!"
}
```

---

### 5.3 여러 API 비교 로깅

```typescript
test('API 응답 비교', async ({ page }) => {
  await page.goto('/');
  
  // 여러 API 동시 호출
  const [productsRes, categoriesRes, userRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.waitForResponse((res) => res.url().includes('/api/categories')),
    page.waitForResponse((res) => res.url().includes('/api/user'))
  ]);
  
  // 테이블 형식으로 비교
  console.table([
    {
      API: 'Products',
      Status: productsRes.status(),
      URL: productsRes.url()
    },
    {
      API: 'Categories',
      Status: categoriesRes.status(),
      URL: categoriesRes.url()
    },
    {
      API: 'User',
      Status: userRes.status(),
      URL: userRes.url()
    }
  ]);
});
```

**출력 예시:**
```
┌─────────┬──────────────┬────────┬───────────────────────────────┐
│ (index) │     API      │ Status │              URL              │
├─────────┼──────────────┼────────┼───────────────────────────────┤
│    0    │  'Products'  │  200   │ 'https://example.com/api/...' │
│    1    │ 'Categories' │  200   │ 'https://example.com/api/...' │
│    2    │    'User'    │  200   │ 'https://example.com/api/...' │
└─────────┴──────────────┴────────┴───────────────────────────────┘
```

---

### 5.4 에러 디버깅

```typescript
test('에러 상황 디버깅', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/order')),
    page.click('text=주문하기')
  ]);
  
  console.log('=== API 응답 디버깅 ===');
  console.log('Status:', response.status());
  console.log('OK:', response.ok());
  
  if (!response.ok()) {
    console.log('⚠️ 에러 발생!');
    
    // 에러 응답 상세 로깅
    const error = await response.json();
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    console.log('Full Error:', JSON.stringify(error, null, 2));
    
    // Request도 확인
    const request = response.request();
    console.log('Request Method:', request.method());
    console.log('Request URL:', request.url());
    
    const postData = request.postData();
    if (postData) {
      console.log('Request Body:', postData);
    }
  }
});
```

**출력 예시 (에러 발생 시):**
```
=== API 응답 디버깅 ===
Status: 409
OK: false
⚠️ 에러 발생!
Error Code: OUT_OF_STOCK
Error Message: 재고가 부족합니다
Full Error: {
  "code": "OUT_OF_STOCK",
  "message": "재고가 부족합니다",
  "productId": 1,
  "requestedQuantity": 5,
  "availableStock": 2
}
Request Method: POST
Request URL: https://example.com/api/order
Request Body: {"productId":1,"quantity":5}
```

---

### 5.5 성능 디버깅

```typescript
test('API 성능 측정', async ({ page }) => {
  await page.goto('/');
  
  const performanceData: Array<{
    api: string;
    time: number;
    status: number;
  }> = [];
  
  // 로그인
  let start = Date.now();
  const [loginRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  performanceData.push({
    api: 'Login',
    time: Date.now() - start,
    status: loginRes.status()
  });
  
  // 상품 조회
  start = Date.now();
  const [productsRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.goto('/')
  ]);
  performanceData.push({
    api: 'Products',
    time: Date.now() - start,
    status: productsRes.status()
  });
  
  // 테이블로 출력
  console.log('\n=== API 성능 측정 ===');
  console.table(performanceData);
  
  // 평균 계산
  const avgTime = performanceData.reduce((sum, d) => sum + d.time, 0) / performanceData.length;
  console.log(`\n평균 응답 시간: ${avgTime.toFixed(2)}ms`);
});
```

**출력 예시:**
```
=== API 성능 측정 ===
┌─────────┬──────────┬──────┬────────┐
│ (index) │   api    │ time │ status │
├─────────┼──────────┼──────┼────────┤
│    0    │ 'Login'  │ 234  │  200   │
│    1    │'Products'│ 456  │  200   │
└─────────┴──────────┴──────┴────────┘

평균 응답 시간: 345.00ms
```

---

### 5.6 조건부 로깅 (개발 환경에서만)

```typescript
// 환경 변수 설정
const DEBUG = process.env.DEBUG === 'true';

test('조건부 로깅', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  // DEBUG 모드일 때만 로깅
  if (DEBUG) {
    console.log('Status:', response.status());
    const data = await response.json();
    console.log('Data:', JSON.stringify(data, null, 2));
  }
  
  // 테스트는 항상 실행
  expect(response.status()).toBe(200);
});

// 실행 방법:
// DEBUG=true npx playwright test  → 로그 출력됨
// npx playwright test              → 로그 출력 안 됨
```

---

### 5.7 헬퍼 함수로 재사용하기

```typescript
// helpers/debug.ts
export async function logApiResponse(response: Response, label: string = 'API Response') {
  console.log(`\n=== ${label} ===`);
  console.log('URL:', response.url());
  console.log('Status:', response.status());
  console.log('OK:', response.ok());
  
  try {
    const data = await response.json();
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('Response is not JSON');
  }
  
  const request = response.request();
  console.log('Method:', request.method());
  
  const postData = request.postData();
  if (postData) {
    console.log('Request Body:', postData);
  }
  console.log('========================\n');
}

// 사용 예시
import { logApiResponse } from './helpers/debug';

test('헬퍼로 간단하게 로깅', async ({ page }) => {
  const [loginRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  await logApiResponse(loginRes, '로그인 API');
  
  const [productsRes] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/products')),
    page.goto('/')
  ]);
  
  await logApiResponse(productsRes, '상품 조회 API');
});
```

---

### 5.8 실전 디버깅 체크리스트

```typescript
test('완벽한 API 디버깅', async ({ page }) => {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  // ✅ 체크리스트
  console.log('=== API 디버깅 체크리스트 ===');
  
  // 1. 기본 정보
  console.log('1. URL:', response.url());
  console.log('2. Status:', response.status());
  console.log('3. OK:', response.ok());
  
  // 4. Response 데이터
  const data = await response.json();
  console.log('4. Response:', JSON.stringify(data, null, 2));
  
  // 5. Request 정보
  const request = response.request();
  console.log('5. Method:', request.method());
  console.log('6. Headers:', request.headers());
  
  const postData = request.postData();
  if (postData) {
    console.log('7. Request Body:', postData);
  }
  
  // 8. 타이밍 정보
  const timing = await page.evaluate(() => {
    const perf = window.performance.getEntriesByType('navigation')[0] as any;
    return {
      dns: perf.domainLookupEnd - perf.domainLookupStart,
      tcp: perf.connectEnd - perf.connectStart,
      request: perf.responseStart - perf.requestStart,
      response: perf.responseEnd - perf.responseStart
    };
  });
  console.log('8. Timing:', timing);
  
  console.log('============================\n');
});
```

---

## 6. 실전 연습 프로젝트

### 프로젝트 1: 로그인 완전 정복 (1일)

```typescript
test('로그인 성공', async ({ page }) => { /* ... */ });
test('비밀번호 틀림', async ({ page }) => { /* ... */ });
test('존재하지 않는 계정', async ({ page }) => { /* ... */ });
```

### 프로젝트 2: 상품 관리 CRUD (2일)

```typescript
test('상품 추가', async ({ page }) => { /* ... */ });
test('상품 수정', async ({ page }) => { /* ... */ });
test('상품 삭제', async ({ page }) => { /* ... */ });
```

---

## 7. 체화 훈련

**Day 1-2: 기본 패턴 20번 반복**
```typescript
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/엔드포인트')),
  page.click('button')
]);

expect(response.status()).toBe(200);
const data = await response.json();
expect(data.필드).toBe(값);
```

---

## 8. API 성능 테스트

```typescript
test('API 응답 시간', async ({ page }) => {
  const startTime = Date.now();
  
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  const responseTime = Date.now() - startTime;
  
  console.log(`응답 시간: ${responseTime}ms`);
  expect(responseTime).toBeLessThan(1000);
});
```

---

## 9. 자주 하는 실수

### 실수 1: API 응답 안 기다림
```typescript
// ❌ 잘못된 코드
await page.click('button');
const response = await page.waitForResponse(...);

// ✅ 올바른 코드
const [response] = await Promise.all([
  page.waitForResponse(...),
  page.click('button')
]);
```

### 실수 2: JSON 파싱 안 함
```typescript
// ❌ 잘못된 코드
expect(response.token).toBeTruthy();

// ✅ 올바른 코드
const data = await response.json();
expect(data.token).toBeTruthy();
```

---

## 🎯 최종 정리

### 필수 암기 코드 3줄

```typescript
// 1. API 대기
const [response] = await Promise.all([
  page.waitForResponse((res) => res.url().includes('/api/엔드포인트')),
  page.click('button')
]);

// 2. 상태 코드 검증
expect(response.status()).toBe(200);

// 3. 데이터 검증
const data = await response.json();
expect(data.필드).toBe(값);
```

**이 3줄만 손에 익으면 90% 끝!** 🎉
`;

// Markdown 렌더링 함수
const renderMarkdown = (content) => {
  const mdStyles = {
    h1: { fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: 0, marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px' },
    h2: { fontSize: '22px', fontWeight: '700', color: '#1f2937', marginTop: '32px', marginBottom: '16px' },
    h3: { fontSize: '18px', fontWeight: '600', color: '#374151', marginTop: '24px', marginBottom: '12px' },
    h4: { fontSize: '16px', fontWeight: '600', color: '#4b5563', marginTop: '16px', marginBottom: '8px' },
    p: { fontSize: '15px', color: '#4b5563', lineHeight: 1.7, margin: '0 0 12px 0' },
    li: { fontSize: '14px', color: '#4b5563', lineHeight: 1.8, margin: '4px 0', listStyle: 'disc', marginLeft: '20px' },
    code: { backgroundColor: '#f3f4f6', color: '#e11d48', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' },
    pre: { backgroundColor: '#1f2937', color: '#d1d5db', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6, overflowX: 'auto', margin: '12px 0', whiteSpace: 'pre' },
  };

  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeLines = [];
  let inList = false;
  let listItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(<pre key={`pre-${i}`} style={mdStyles.pre}>{codeLines.join('\n')}</pre>);
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(<li key={`li-${i}`} style={mdStyles.li}>{line.slice(2)}</li>);
      continue;
    } else if (inList) {
      elements.push(<ul key={`ul-${i}`} style={{ paddingLeft: '20px', margin: '8px 0' }}>{listItems}</ul>);
      inList = false;
      listItems = [];
    }

    if (line.startsWith('# ')) elements.push(<h1 key={`h1-${i}`} style={mdStyles.h1}>{line.slice(2)}</h1>);
    else if (line.startsWith('## ')) elements.push(<h2 key={`h2-${i}`} style={mdStyles.h2}>{line.slice(3)}</h2>);
    else if (line.startsWith('### ')) elements.push(<h3 key={`h3-${i}`} style={mdStyles.h3}>{line.slice(4)}</h3>);
    else if (line.startsWith('#### ')) elements.push(<h4 key={`h4-${i}`} style={mdStyles.h4}>{line.slice(5)}</h4>);
    else if (line.startsWith('---')) elements.push(<hr key={`hr-${i}`} style={{ margin: '24px 0', border: 'none', borderTop: '2px solid #e5e7eb' }} />);
    else if (line.trim()) {
      const parts = line.split('`');
      if (parts.length > 1) {
        elements.push(
          <p key={`p-${i}`} style={mdStyles.p}>
            {parts.map((part, j) => j % 2 === 1 ? <code key={`code-${j}`} style={mdStyles.code}>{part}</code> : part)}
          </p>
        );
      } else {
        elements.push(<p key={`p-${i}`} style={mdStyles.p}>{line}</p>);
      }
    } else {
      elements.push(<br key={`br-${i}`} />);
    }
  }

  if (inList) {
    elements.push(<ul key="ul-final" style={{ paddingLeft: '20px', margin: '8px 0' }}>{listItems}</ul>);
  }

  return elements;
};

export default function QAGuide({ onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "📌 개요 & UI 포인트" },
    { id: "ui-guide", label: "🎨 UI 자동화 가이드" },
    { id: "api-guide", label: "🌐 API 검증 가이드" },
    { id: "errors", label: "💥 오류 케이스" },
    { id: "scenarios", label: "🎬 테스트 시나리오" },
    { id: "flows", label: "🔄 시스템 흐름" },
    { id: "api", label: "🌐 API 문서" },
    { id: "skills", label: "📚 역량 & 리소스" },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>QA 자동화 가이드</h2>
          <button
            id="qa-guide-close"
            className="btn-close"
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div style={styles.tabNav} role="tablist" aria-label="가이드 탭">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>          {activeTab === "overview" && (
            <div role="tabpanel" id="tab-panel-overview" aria-labelledby="tab-overview">
              {/* 1. 프로젝트 개요 */}
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📌 프로젝트 개요</h3>
                <p style={styles.text}>
                  이 프로젝트는 <strong>QA 자동화 연습</strong>과 <strong>포트폴리오</strong>를 목적으로 설계된 데모 쇼핑몰입니다.
                </p>
                <ul style={styles.list}>
                  <li>기술 스택: React (Vite), JavaScript, Vercel Serverless Functions</li>
                  <li>DB 없음 (메모리 기반 데이터)</li>
                  <li>의도적인 오류 케이스 포함</li>
                </ul>
              </section>

              {/* 2. 자동화 대상 UI 포인트 */}
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🎯 자동화 대상 UI/API 포인트</h3>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>UI 식별자</h4>
                  <p style={styles.text}>모든 주요 UI 요소는 다음 중 하나 이상을 포함합니다:</p>
                  <ul style={styles.list}>
                    <li><code>id</code> 속성 (예: id="home-search", id="login-submit")</li>
                    <li><code>className</code> (예: className="search-input", "login-button")</li>
                    <li><code>aria-label</code> (접근성 + 자동화)</li>
                    <li><code>role</code> (의미론적 역할)</li>
                  </ul>
                  <p style={styles.note}>
                    ⚠️ data-testid는 사용하지 않습니다 (실제 사용자 경험과 가까운 셀렉터 연습)
                  </p>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>주요 테스트 포인트</h4>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>페이지</th>
                        <th style={styles.th}>요소</th>
                        <th style={styles.th}>ID/클래스</th>
                        <th style={styles.th}>검증 포인트</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={styles.td}>홈</td>
                        <td style={styles.td}>검색창</td>
                        <td style={styles.td}>#home-search</td>
                        <td style={styles.td}>입력, 검색 버튼 클릭</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>홈</td>
                        <td style={styles.td}>장바구니 버튼</td>
                        <td style={styles.td}>#home-cart-btn</td>
                        <td style={styles.td}>비로그인 시 로그인 유도</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>홈</td>
                        <td style={styles.td}>관리자 버튼</td>
                        <td style={styles.td}>#home-admin-btn</td>
                        <td style={styles.td}>비로그인 클릭 시 권한 오류</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>홈</td>
                        <td style={styles.td}>검색 버튼</td>
                        <td style={styles.td}>#home-search-btn</td>
                        <td style={styles.td}>빈 검색어 시 API 400 오류</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>로그인</td>
                        <td style={styles.td}>아이디 입력</td>
                        <td style={styles.td}>#login-username</td>
                        <td style={styles.td}>Validation 에러</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>로그인</td>
                        <td style={styles.td}>로그인 버튼</td>
                        <td style={styles.td}>#login-submit</td>
                        <td style={styles.td}>disabled 상태 확인</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>로그인</td>
                        <td style={styles.td}>에러 메시지</td>
                        <td style={styles.td}>#login-error</td>
                        <td style={styles.td}>잘못된 입력 시 표시</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>상품상세</td>
                        <td style={styles.td}>재고 정보</td>
                        <td style={styles.td}>#stock-info</td>
                        <td style={styles.td}>재고 API 연동</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>상품상세</td>
                        <td style={styles.td}>리뷰 목록</td>
                        <td style={styles.td}>.review-item</td>
                        <td style={styles.td}>리뷰 표시</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
          {/* ============ TAB: UI 자동화 가이드 ============ */}
          {activeTab === "ui-guide" && (
            <div role="tabpanel" id="tab-panel-ui-guide" aria-labelledby="tab-ui-guide">
              <div style={{ fontSize: '15px', lineHeight: 1.7 }}>
                {renderMarkdown(UI_GUIDE_FULL_CONTENT)}
              </div>
            </div>
          )}

          {/* ============ TAB: API 검증 가이드 ============ */}
          {activeTab === "api-guide" && (
            <div role="tabpanel" id="tab-panel-api-guide" aria-labelledby="tab-api-guide">
              <div style={{ fontSize: '15px', lineHeight: 1.7 }}>
                {renderMarkdown(API_GUIDE_FULL_CONTENT)}
              </div>
            </div>
          )}
          {/* ============ TAB: errors ============ */}
          {activeTab === "errors" && (
            <div role="tabpanel" id="tab-panel-errors" aria-labelledby="tab-errors">
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>💥 의도적 오류 케이스</h3>

                <div style={styles.errorCase}>
                  <h4 style={styles.subsectionTitle}>📍 상품 상세 진입 오류</h4>
                  <ul style={styles.list}>
                    <li><strong>Product ID 16 (가습기 초음파 3L 대용량 LED 무드등):</strong> 404 에러 (상품 없음)</li>
                  </ul>
                  <p style={styles.codeBlock}>
                    {`// Playwright 예시\nconst response = await page.request.get('/api/products/16');\nexpect(response.status()).toBe(404);\n\nconst body = await response.json();\nexpect(body.message).toBe('상품 없음');\nexpect(body.code).toBe('PRODUCT_NOT_FOUND');`}
                  </p>
                </div>

                <div style={styles.errorCase}>
                  <h4 style={styles.subsectionTitle}>🔒 권한 제어</h4>
                  <ul style={styles.list}>
                    <li><strong>비로그인:</strong> 관리자 버튼 클릭 시 권한 오류 발생</li>
                    <li><strong>일반 계정(test):</strong> 관리자 API 호출 시 403</li>
                    <li><strong>관리자 계정(admin):</strong> 모든 기능 접근 가능</li>
                  </ul>
                </div>

                <div style={styles.errorCase}>
                  <h4 style={styles.subsectionTitle}>❌ 입력 검증 오류</h4>
                  <ul style={styles.list}>
                    <li><strong>로그인:</strong> 빈 입력, 짧은 입력, 긴 입력, 특수문자</li>
                    <li><strong>검색:</strong> 빈 검색어 클릭 시 400 (EMPTY_QUERY), 100자 초과 시 400 (QUERY_TOO_LONG)</li>
                    <li><strong>리뷰:</strong> 10자 미만, 500자 초과, 별점 범위(1-5)</li>
                  </ul>
                </div>
              </section>
            </div>
          )}

          {/* ============ TAB: scenarios ============ */}
          {activeTab === "scenarios" && (
            <div role="tabpanel" id="tab-panel-scenarios" aria-labelledby="tab-scenarios">
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🎬 Playwright 테스트 시나리오 (TypeScript)</h3>
                <div style={{ ...styles.note, marginBottom: '20px', padding: '16px', backgroundColor: '#e0f2fe', borderLeft: '4px solid #0284c7' }}>
                  <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>💡 TypeScript 형식 안내</p>
                  <p style={{ margin: 0, fontSize: '13px' }}>
                    모든 테스트 코드는 TypeScript 형식으로 작성되었습니다. Playwright 설치 시 <code>npm init playwright@latest</code> 명령을 사용하면 TypeScript 설정이 자동으로 생성됩니다.
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
                    <strong>파일 확장자:</strong> <code>.spec.ts</code> (예: <code>login.spec.ts</code>)
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                    <strong>import 구문:</strong> <code>import &#123; test, expect &#125; from '@playwright/test';</code>
                  </p>
                </div>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 1: 로그인 플로우</h4>
                  <p style={styles.text}>
                    <strong>설명:</strong> 로그인 기능을 테스트합니다. 올바른 계정 정보로 로그인 성공하는 경우, 잘못된 정보로 실패하는 경우, 차단된 계정으로 접근이 차단되는 경우를 검증합니다.
                  </p>
                  <p style={styles.text}>
                    <strong>주요 개념:</strong>
                  </p>
                  <ul style={styles.list}>
                    <li><code>page.goto()</code>: 특정 URL로 이동합니다.</li>
                    <li><code>page.click()</code>: 요소를 클릭합니다.</li>
                    <li><code>page.fill()</code>: 입력창에 텍스트를 입력합니다.</li>
                    <li><code>expect().toBeVisible()</code>: 요소가 화면에 보이는지 확인합니다.</li>
                    <li><code>expect().toContainText()</code>: 요소에 특정 텍스트가 포함되어 있는지 확인합니다.</li>
                  </ul>
                  <pre style={styles.code}>{`// 로그인 성공 테스트
// 목적: 올바른 계정 정보로 로그인이 정상적으로 되는지 확인
test('로그인 성공', async ({ page }) => {
  // 1. 홈페이지로 이동
  await page.goto('/');
  
  // 2. 로그인 버튼 클릭
  await page.click('#home-login');
  
  // 3. 아이디 입력
  await page.fill('#login-username', 'test');
  
  // 4. 비밀번호 입력
  await page.fill('#login-password', '1234');
  
  // 5. 로그인 제출 버튼 클릭
  await page.click('#login-submit');
  
  // 6. 로그인 성공 시 로그아웃 버튼이 보여야 함
  await expect(page.locator('#home-logout')).toBeVisible();
});

// 로그인 실패 테스트
// 목적: 잘못된 계정 정보로 로그인 시 에러 메시지가 표시되는지 확인
test('잘못된 계정 로그인 실패', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  // 존재하지 않는 계정 정보 입력
  await page.fill('#login-username', 'wronguser');
  await page.fill('#login-password', 'wrongpass');
  await page.click('#login-submit');
  
  // 에러 메시지가 표시되는지 확인
  await expect(page.locator('#login-error'))
    .toContainText('아이디 또는 비밀번호 오류');
});

// 차단된 계정 테스트
// 목적: 차단된 계정으로 로그인 시 접근이 차단되는지 확인
test('차단된 계정 로그인 차단', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  // 차단된 계정(test2) 정보 입력
  await page.fill('#login-username', 'test2');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // 차단 메시지가 표시되는지 확인
  await expect(page.locator('#login-error'))
    .toContainText('차단된 계정');
});`}</pre>
                </div>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 2: 상품 상세 오류 검증</h4>
                  <p style={styles.text}>
                    <strong>설명:</strong> 존재하지 않는 상품을 조회할 때 404 에러가 발생하는지 확인합니다. UI를 통한 방법과 API 직접 호출 두 가지 방법으로 테스트합니다.
                  </p>
                  <p style={styles.text}>
                    <strong>주요 개념:</strong>
                  </p>
                  <ul style={styles.list}>
                    <li><code>page.on('dialog')</code>: 브라우저의 alert, confirm 창을 감지하고 처리합니다.</li>
                    <li><code>page.request.get()</code>: API를 직접 호출합니다 (UI 거치지 않음).</li>
                    <li><code>response.status()</code>: HTTP 상태 코드를 확인합니다.</li>
                  </ul>
                  <pre style={styles.code}>{`// 상품 404 에러 테스트 - UI 방식
// 목적: 존재하지 않는 상품 클릭 시 404 에러 alert이 표시되는지 확인
test('상품 16번 (가습기) 조회 시 404 에러', async ({ page }) => {
  await page.goto('/');
  
  // 상품 16번 (존재하지 않음) 클릭
  const product16 = page.locator('[data-product-id="16"]');
  await product16.click();
  
  // alert 창 감지 및 검증
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('404');
    await dialog.accept(); // 확인 버튼 클릭
  });
});

// 상품 404 에러 테스트 - API 직접 호출 방식
// 목적: API 레벨에서 404 에러와 에러 코드가 정확한지 확인
test('존재하지 않는 상품 404 - API 직접 호출', async ({ page }) => {
  await page.goto('/');
  
  // API 직접 호출
  const response = await page.request.get('/api/products/16');
  
  // HTTP 상태 코드 검증
  expect(response.status()).toBe(404);
  
  // 응답 본문 검증
  const body = await response.json();
  expect(body.message).toBe('상품 없음');
  expect(body.code).toBe('PRODUCT_NOT_FOUND');
});`}</pre>
                </div>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 3: 권한 검증</h4>
                  <p style={styles.text}>
                    <strong>설명:</strong> 관리자 기능에 대한 접근 권한을 테스트합니다. 비로그인 사용자와 일반 사용자가 관리자 페이지나 API에 접근할 때 적절히 차단되는지 확인합니다.
                  </p>
                  <p style={styles.text}>
                    <strong>주요 개념:</strong>
                  </p>
                  <ul style={styles.list}>
                    <li><code>page.evaluate()</code>: 브라우저 컨텍스트에서 JavaScript 코드를 실행합니다 (localStorage 접근 등).</li>
                    <li><code>headers</code>: HTTP 요청 헤더를 설정합니다 (인증 토큰 등).</li>
                  </ul>
                  <pre style={styles.code}>{`// 비로그인 권한 테스트
// 목적: 로그인하지 않은 사용자가 관리자 기능 접근 시 차단되는지 확인
test('비로그인 시 관리자 버튼 클릭하면 오류 발생', async ({ page }) => {
  await page.goto('/');
  
  // 관리자 버튼 존재 확인
  await expect(page.locator('#home-admin-btn')).toBeVisible();
  
  // alert 감지 설정
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('관리자 권한');
    await dialog.accept();
  });
  
  // 관리자 버튼 클릭
  await page.click('#home-admin-btn');
});

// 일반 사용자 권한 테스트
// 목적: 일반 사용자가 관리자 API 호출 시 403 에러가 발생하는지 확인
test('일반 사용자는 관리자 API 접근 불가', async ({ page }) => {
  // 일반 사용자로 로그인 (헬퍼 함수 사용)
  await loginAs(page, 'test', '1234');
  
  // localStorage에서 토큰 가져오기
  const token = await page.evaluate(() => 
    localStorage.getItem('token')
  );
  
  // 관리자 API 호출 (인증 토큰 포함)
  const response = await page.request.get('/api/admin', {
    headers: { Authorization: \`Bearer \${token}\` }
  });
  
  // 403 Forbidden 에러 확인
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.message).toContain('관리자 권한');
});`}</pre>
                </div>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 4: 검색 오류 검증</h4>
                  <p style={styles.text}>
                    <strong>설명:</strong> 검색 기능의 입력 검증을 테스트합니다. 빈 검색어나 너무 긴 검색어를 입력했을 때 적절한 에러 처리가 되는지 확인합니다.
                  </p>
                  <pre style={styles.code}>{`// 빈 검색어 테스트
// 목적: 검색어 없이 검색 버튼 클릭 시 400 에러가 발생하는지 확인
test('빈 검색어로 검색 버튼 클릭 시 400 오류', async ({ page }) => {
  await page.goto('/');
  
  // 검색어 입력 없이 검색 버튼 클릭
  await page.click('#home-search-btn');
  
  // 에러 alert 확인
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('400');
    expect(dialog.message()).toContain('검색어를 입력해주세요');
    await dialog.accept();
  });
});

test('검색 API - 빈 검색어 파라미터', async ({ page }) => {
  const response = await page.request.get('/api/search?q=');
  
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.code).toBe('EMPTY_QUERY');
});

test('검색 API - 긴 검색어', async ({ page }) => {
  const response = await page.request.get(
    '/api/search?q=' + 'a'.repeat(101)
  );
  
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.code).toBe('QUERY_TOO_LONG');
});`}</pre>
                </div>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 5: API 검증</h4>
                  <pre style={styles.code}>{`test('재고 API - HEAD 메서드', async ({ page }) => {
  const response = await page.request.head(
    '/api/inventory?productId=1'
  );
  
  expect(response.status()).toBe(200);
  expect(response.headers()['x-stock-count']).toBeDefined();
  expect(response.headers()['x-warehouse']).toBe('Seoul');
});

test('리뷰 작성 - 입력 검증', async ({ page }) => {
  await loginAs(page, 'test', '1234');
  const token = await page.evaluate(() => 
    localStorage.getItem('token')
  );
  
  // 너무 짧은 리뷰
  const response = await page.request.post('/api/reviews', {
    headers: { Authorization: \`Bearer \${token}\` },
    data: {
      productId: 1,
      rating: 5,
      comment: '좋아요' // 10자 미만
    }
  });
  
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.code).toBe('COMMENT_TOO_SHORT');
});`}</pre>
                </div>
              </section>
            </div>
          )}

          {/* ============ TAB: flows ============ */}
          {activeTab === "flows" && (
            <div role="tabpanel" id="tab-panel-flows" aria-labelledby="tab-flows">
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🔄 시스템 흐름 테스트 (UI + API 통합)</h3>
                <p style={styles.text}>
                  실제 사용자 시나리오를 따라 UI 검증과 API 검증을 결합한 End-to-End 테스트입니다.
                </p>
              </section>

              {/* 흐름 1: 회원가입 → 로그인 → 상품 주문 */}
              <section style={styles.section}>
                <h4 style={styles.subsectionTitle}>🛒 Flow 1: 비회원 → 로그인 → 상품 주문</h4>
                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>단계별 검증</h5>
                  <ol style={{ ...styles.list, paddingLeft: '20px' }}>
                    <li>
                      <strong>홈페이지 진입</strong>
                      <ul style={styles.list}>
                        <li>UI: 상품 카드 표시 확인 (className="product-card")</li>
                        <li>UI: 로그인 버튼 표시 확인 (id="login-button")</li>
                      </ul>
                    </li>
                    <li>
                      <strong>로그인 시도</strong>
                      <ul style={styles.list}>
                        <li>UI: 로그인 폼 표시 (id="login-form")</li>
                        <li>UI: username, password 입력</li>
                        <li>API: POST /api/login → 200 응답 확인</li>
                        <li>API: token 포함 여부 확인</li>
                        <li>UI: localStorage에 token 저장 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>상품 상세 페이지 진입</strong>
                      <ul style={styles.list}>
                        <li>UI: 상품 카드 클릭 (data-testid="product-card-1")</li>
                        <li>API: GET /api/products/1 → 200 응답</li>
                        <li>UI: 상품 정보 표시 확인</li>
                        <li>API: GET /api/inventory?productId=1 → 재고 정보 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>장바구니 담기</strong>
                      <ul style={styles.list}>
                        <li>UI: 수량 조절 (className="quantity-btn")</li>
                        <li>UI: "장바구니 담기" 버튼 클릭</li>
                        <li>UI: alert 확인 ("장바구니에 상품이 추가되었습니다")</li>
                        <li>UI: localStorage cart 업데이트 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>주문하기</strong>
                      <ul style={styles.list}>
                        <li>UI: 장바구니 페이지 이동</li>
                        <li>UI: "주문하기" 버튼 클릭</li>
                        <li>API: POST /api/user-actions (action: "order") → 재고 검증</li>
                        <li>API: 재고 부족 시 409 에러 확인</li>
                        <li>API: 재고 충분 시 200 응답 확인</li>
                        <li>UI: 주문 완료 페이지 표시</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Playwright 코드 예시</h5>
                  <pre style={styles.code}>{`test('전체 주문 흐름 (UI + API)', async ({ page }) => {
  // 1. 홈페이지 진입
  await page.goto('/');
  await expect(page.locator('.product-card').first()).toBeVisible();
  
  // 2. 로그인
  await page.click('#login-button');
  await page.fill('#username', 'test');
  await page.fill('#password', 'test1234');
  
  const [loginResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  expect(loginResponse.status()).toBe(200);
  const loginData = await loginResponse.json();
  expect(loginData.token).toBeTruthy();
  
  // 3. 상품 상세 진입
  const [productResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/products/1')),
    page.click('[data-testid="product-card-1"]')
  ]);
  
  expect(productResponse.status()).toBe(200);
  
  // 4. 재고 확인
  const inventoryResponse = await page.waitForResponse(
    res => res.url().includes('/api/inventory')
  );
  const inventory = await inventoryResponse.json();
  
  // 5. 장바구니 담기
  await page.click('.btn-add-to-cart');
  await expect(page.locator('text=장바구니에 상품이 추가')).toBeVisible();
  
  // 6. 주문
  await page.click('[aria-label*="장바구니"]');
  
  const [orderResponse] = await Promise.all([
    page.waitForResponse(res => 
      res.url().includes('/api/user-actions') && 
      res.request().method() === 'POST'
    ),
    page.click('text=주문하기')
  ]);
  
  const orderData = await orderResponse.json();
  
  if (inventory.stock > 0) {
    expect(orderResponse.status()).toBe(200);
    await expect(page.locator('text=주문 완료')).toBeVisible();
  } else {
    expect(orderResponse.status()).toBe(409);
    expect(orderData.code).toBe('INSUFFICIENT_STOCK');
  }
});`}</pre>
                </div>
              </section>

              {/* 흐름 2: 리뷰 작성 → 수정 → 삭제 */}
              <section style={styles.section}>
                <h4 style={styles.subsectionTitle}>✍️ Flow 2: 리뷰 작성 → 수정 → 삭제</h4>
                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>단계별 검증</h5>
                  <ol style={{ ...styles.list, paddingLeft: '20px' }}>
                    <li>
                      <strong>로그인 상태로 상품 상세 페이지 진입</strong>
                      <ul style={styles.list}>
                        <li>API: GET /api/reviews?productId=1 → 기존 리뷰 목록 확인</li>
                        <li>UI: "리뷰 작성" 버튼 표시 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>리뷰 작성</strong>
                      <ul style={styles.list}>
                        <li>UI: "리뷰 작성" 버튼 클릭</li>
                        <li>UI: 별점 선택 (1-5)</li>
                        <li>UI: 리뷰 내용 입력 (최소 10자)</li>
                        <li>API: POST /api/reviews → 201 응답 확인</li>
                        <li>API: 중복 작성 시 409 에러 확인</li>
                        <li>UI: 리뷰 목록 새로고침 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>리뷰 수정</strong>
                      <ul style={styles.list}>
                        <li>UI: 본인 리뷰에 "수정" 버튼 표시 확인</li>
                        <li>UI: "수정" 버튼 클릭 → 수정 폼 표시</li>
                        <li>UI: 별점/내용 변경</li>
                        <li>API: PATCH /api/reviews → 200 응답 확인</li>
                        <li>API: 타인 리뷰 수정 시 403 에러 확인</li>
                        <li>UI: 수정된 내용 즉시 반영</li>
                      </ul>
                    </li>
                    <li>
                      <strong>리뷰 삭제</strong>
                      <ul style={styles.list}>
                        <li>UI: "삭제" 버튼 클릭 → confirm 대화상자</li>
                        <li>API: DELETE /api/reviews → 200 응답 확인</li>
                        <li>API: 타인 리뷰 삭제 시 403 에러 확인</li>
                        <li>UI: 리뷰 목록에서 제거 확인</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Playwright 코드 예시</h5>
                  <pre style={styles.code}>{`test('리뷰 CRUD 흐름', async ({ page }) => {
  // 로그인
  await page.goto('/');
  await page.click('#login-button');
  await page.fill('#username', 'test');
  await page.fill('#password', 'test1234');
  await page.click('#login-submit');
  
  // 상품 상세 진입
  await page.click('[data-testid="product-card-1"]');
  await page.waitForSelector('#reviews-section');
  
  // 리뷰 작성
  await page.click('text=리뷰 작성');
  await page.click('button:has-text("⭐"):nth-child(5)'); // 5점
  await page.fill('textarea', '정말 좋은 상품입니다. 강력 추천합니다!');
  
  const [createResponse] = await Promise.all([
    page.waitForResponse(res => 
      res.url().includes('/api/reviews') && 
      res.request().method() === 'POST'
    ),
    page.click('button:has-text("등록")')
  ]);
  
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  const reviewId = created.review.id;
  
  // 리뷰 표시 확인
  await expect(page.locator(\`.review-item:has-text("정말 좋은")\`)).toBeVisible();
  
  // 리뷰 수정
  await page.locator(\`.review-item:has-text("정말 좋은")\`)
    .locator('button:has-text("수정")').click();
  await page.fill('textarea', '수정된 리뷰입니다. 역시 좋은 상품이네요!');
  
  const [updateResponse] = await Promise.all([
    page.waitForResponse(res => 
      res.url().includes('/api/reviews') && 
      res.request().method() === 'PATCH'
    ),
    page.click('button:has-text("저장")')
  ]);
  
  expect(updateResponse.status()).toBe(200);
  await expect(page.locator('text=수정된 리뷰')).toBeVisible();
  
  // 리뷰 삭제
  page.on('dialog', dialog => dialog.accept());
  
  const [deleteResponse] = await Promise.all([
    page.waitForResponse(res => 
      res.url().includes('/api/reviews') && 
      res.request().method() === 'DELETE'
    ),
    page.locator(\`.review-item:has-text("수정된")\`)
      .locator('button:has-text("삭제")').click()
  ]);
  
  expect(deleteResponse.status()).toBe(200);
  await expect(page.locator('text=수정된 리뷰')).not.toBeVisible();
});`}</pre>
                </div>
              </section>

              {/* 흐름 3: 권한 검증 흐름 */}
              <section style={styles.section}>
                <h4 style={styles.subsectionTitle}>🔐 Flow 3: 권한 검증 (비로그인 → 일반 → 관리자)</h4>
                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>단계별 검증</h5>
                  <ol style={{ ...styles.list, paddingLeft: '20px' }}>
                    <li>
                      <strong>비로그인 상태에서 관리자 페이지 접근</strong>
                      <ul style={styles.list}>
                        <li>UI: "관리자" 버튼 클릭</li>
                        <li>API: GET /api/admin → 401 에러 (AUTH_NO_TOKEN)</li>
                        <li>UI: alert 표시 ("토큰이 없습니다")</li>
                        <li>UI: 홈으로 리다이렉트</li>
                      </ul>
                    </li>
                    <li>
                      <strong>일반 계정으로 관리자 페이지 접근</strong>
                      <ul style={styles.list}>
                        <li>UI: 일반 계정(test/test1234)으로 로그인</li>
                        <li>UI: "관리자" 버튼 클릭</li>
                        <li>API: GET /api/admin → 403 에러 (AUTH_FORBIDDEN)</li>
                        <li>UI: alert 표시 ("관리자 권한이 필요합니다")</li>
                        <li>UI: 홈으로 리다이렉트</li>
                      </ul>
                    </li>
                    <li>
                      <strong>관리자 계정으로 접근</strong>
                      <ul style={styles.list}>
                        <li>UI: 관리자 계정(admin/admin1234)으로 로그인</li>
                        <li>UI: "관리자" 버튼 클릭</li>
                        <li>API: GET /api/admin → 200 응답</li>
                        <li>UI: 관리자 페이지 표시 (상품 목록)</li>
                        <li>API: POST /api/admin → 상품 추가</li>
                        <li>API: PUT /api/admin → 상품 수정</li>
                        <li>API: DELETE /api/admin → 상품 삭제</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Playwright 코드 예시</h5>
                  <pre style={styles.code}>{`test('권한 검증 흐름', async ({ page }) => {
  // 1. 비로그인 상태
  await page.goto('/');
  
  page.on('dialog', dialog => {
    expect(dialog.message()).toContain('토큰이 없습니다');
    dialog.accept();
  });
  
  const [noAuthResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('button:has-text("관리자")')
  ]);
  
  expect(noAuthResponse.status()).toBe(401);
  const noAuthData = await noAuthResponse.json();
  expect(noAuthData.code).toBe('AUTH_NO_TOKEN');
  
  // 2. 일반 계정
  await page.click('#login-button');
  await page.fill('#username', 'test');
  await page.fill('#password', 'test1234');
  await page.click('#login-submit');
  
  page.on('dialog', dialog => {
    expect(dialog.message()).toContain('관리자 권한');
    dialog.accept();
  });
  
  const [forbiddenResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('button:has-text("관리자")')
  ]);
  
  expect(forbiddenResponse.status()).toBe(403);
  const forbiddenData = await forbiddenResponse.json();
  expect(forbiddenData.code).toBe('AUTH_FORBIDDEN');
  
  // 3. 관리자 계정
  await page.click('button:has-text("로그아웃")');
  await page.click('#login-button');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin1234');
  await page.click('#login-submit');
  
  const [adminResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('button:has-text("관리자")')
  ]);
  
  expect(adminResponse.status()).toBe(200);
  await expect(page.locator('text=상품 관리')).toBeVisible();
});`}</pre>
                </div>
              </section>
            </div>
          )}

          {/* ============ TAB: api ============ */}
          {activeTab === "api" && (
            <div role="tabpanel" id="tab-panel-api" aria-labelledby="tab-api">
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🌐 API 목록 및 개요</h3>

                <h4 style={styles.subsectionTitle}>기존 API (CRUD 중심)</h4>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>API</th>
                      <th style={styles.th}>Method</th>
                      <th style={styles.th}>인증</th>
                      <th style={styles.th}>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={styles.td}>/api/login</td><td style={styles.td}>POST</td><td style={styles.td}>❌</td><td style={styles.td}>로그인</td></tr>
                    <tr><td style={styles.td}>/api/products</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>상품 목록 조회</td></tr>
                    <tr><td style={styles.td}>/api/products/:id</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>상품 상세 조회</td></tr>
                    <tr><td style={styles.td}>/api/admin</td><td style={styles.td}>GET</td><td style={styles.td}>✅ (ADMIN)</td><td style={styles.td}>상품 관리 - 조회</td></tr>
                    <tr><td style={styles.td}>/api/admin</td><td style={styles.td}>POST</td><td style={styles.td}>✅ (ADMIN)</td><td style={styles.td}>상품 관리 - 추가</td></tr>
                    <tr><td style={styles.td}>/api/admin</td><td style={styles.td}>PUT</td><td style={styles.td}>✅ (ADMIN)</td><td style={styles.td}>상품 관리 - 수정</td></tr>
                    <tr><td style={styles.td}>/api/admin</td><td style={styles.td}>DELETE</td><td style={styles.td}>✅ (ADMIN)</td><td style={styles.td}>상품 관리 - 삭제</td></tr>
                  </tbody>
                </table>

                <h4 style={{ ...styles.subsectionTitle, marginTop: '24px' }}>검증 연습용 API</h4>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>API</th>
                      <th style={styles.th}>Method</th>
                      <th style={styles.th}>인증</th>
                      <th style={styles.th}>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={styles.td}>/api/search</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>상품 검색 (쿼리 파라미터)</td></tr>
                    <tr><td style={styles.td}>/api/reviews</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>리뷰 조회</td></tr>
                    <tr><td style={styles.td}>/api/reviews</td><td style={styles.td}>POST</td><td style={styles.td}>✅</td><td style={styles.td}>리뷰 작성</td></tr>
                    <tr><td style={styles.td}>/api/reviews</td><td style={styles.td}>PATCH</td><td style={styles.td}>✅</td><td style={styles.td}>리뷰 수정</td></tr>
                    <tr><td style={styles.td}>/api/reviews</td><td style={styles.td}>DELETE</td><td style={styles.td}>✅</td><td style={styles.td}>리뷰 삭제</td></tr>
                    <tr><td style={styles.td}>/api/inventory</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>재고 조회</td></tr>
                    <tr><td style={styles.td}>/api/inventory</td><td style={styles.td}>HEAD</td><td style={styles.td}>❌</td><td style={styles.td}>재고 존재 확인 (헤더만)</td></tr>
                    <tr><td style={styles.td}>/api/status-codes</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>상태 코드 연습</td></tr>
                  </tbody>
                </table>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📋 HTTP 메서드별 테스트 포인트</h3>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>GET - 조회</h4>
                  <pre style={styles.code}>{`// 1. 기본 목록 조회
GET /api/products → 200, { products: [...] }

// 2. 단일 조회
GET /api/products/1 → 200, { id: 1, name: "...", ... }

// 3. 존재하지 않는 리소스 (가습기 ID 16)
GET /api/products/16 → 404, { code: "PRODUCT_NOT_FOUND" }

// 4. 검색 쿼리 파라미터
GET /api/search?q=블루투스 → 200, { query, count, products }

// 5. 복합 필터
GET /api/search?category=전자기기&minPrice=50000&sort=price-asc → 200`}</pre>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>POST - 생성</h4>
                  <pre style={styles.code}>{`// 리뷰 작성 (인증 필수)
POST /api/reviews
  Headers: { Authorization: "Bearer <token>" }
  Body: { productId: 1, rating: 5, comment: "정말 좋은 상품입니다! 강력 추천합니다." }
  → 201, { review: { id, rating, username, ... } }

// 필수 필드 누락 → 400 (RATING_REQUIRED)
// 별점 범위 초과 (1-5) → 400 (INVALID_RATING)
// 리뷰 10자 미만 → 400 (COMMENT_TOO_SHORT)
// 중복 리뷰 → 409 (REVIEW_ALREADY_EXISTS)
// 토큰 없음 → 401 (AUTH_NO_TOKEN)`}</pre>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>PATCH - 부분 수정</h4>
                  <pre style={styles.code}>{`// 리뷰 수정 (인증 필수, 본인 리뷰만)
PATCH /api/reviews
  Headers: { Authorization: "Bearer <token>" }
  Body: { id: 1, rating: 4 }
  → 200, { review: { ... } }

// 타인 리뷰 수정 시도 → 403`}</pre>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>HEAD - 메타데이터만</h4>
                  <pre style={styles.code}>{`// 재고 존재 확인 (응답 본문 없음, 헤더만 반환)
HEAD /api/inventory?productId=1
  → 200
  Response Headers:
    x-product-id: "1"
    x-stock-count: "<재고수>"
    x-stock-status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
    x-warehouse: "Seoul"`}</pre>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>검색 API 검증 포인트</h4>
                  <pre style={styles.code}>{`// 빈 검색어 → 400 (EMPTY_QUERY)
GET /api/search?q=  →  400, { code: "EMPTY_QUERY", message: "검색어를 입력해주세요" }

// 검색어 100자 초과 → 400 (QUERY_TOO_LONG)
GET /api/search?q=aaa...(101자)  →  400, { code: "QUERY_TOO_LONG" }

// 잘못된 정렬 옵션 → 400 (INVALID_SORT_OPTION)
GET /api/search?sort=invalid  →  400, { code: "INVALID_SORT_OPTION" }

// 가격 범위 역전 → 400 (INVALID_PRICE_RANGE)
GET /api/search?minPrice=200000&maxPrice=50000  →  400`}</pre>
                </div>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🔐 인증/권한 검증</h3>
                <pre style={styles.code}>{`// 토큰 없이 보호된 API 호출 → 401 (AUTH_NO_TOKEN)
POST /api/reviews (Authorization 헤더 없음) → 401

// 잘못된 토큰 → 401 (AUTH_INVALID_TOKEN)
POST /api/reviews (Authorization: Bearer invalid-token) → 401

// 권한 부족 (일반 사용자 → 관리자 API) → 403 (AUTH_FORBIDDEN)
GET /api/admin (일반 사용자 토큰) → 403`}</pre>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📊 상태 코드 연습 API</h3>
                <p style={styles.text}>
                  <code>/api/status-codes?code=N</code> 으로 원하는 상태 코드를 직접 트리거할 수 있습니다.
                </p>
                
                <div style={{ ...styles.note, marginBottom: '20px', padding: '16px', backgroundColor: '#e0f2fe', borderLeft: '4px solid #0284c7' }}>
                  <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>💡 사용 방법</p>
                  <p style={{ margin: 0, fontSize: '13px', marginBottom: '8px' }}>
                    이 API는 다양한 HTTP 상태 코드를 테스트하기 위한 연습용 엔드포인트입니다. 
                    쿼리 파라미터 <code>code</code>에 원하는 상태 코드 번호를 넣으면 해당 상태 코드로 응답합니다.
                  </p>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
                    <strong>사용 예시:</strong>
                  </p>
                  <ul style={{ ...styles.list, marginTop: '4px', fontSize: '13px' }}>
                    <li>브라우저 주소창에 직접 입력: <code>https://your-domain.com/api/status-codes?code=404</code></li>
                    <li>Playwright 테스트: <code>await page.request.get('/api/status-codes?code=500')</code></li>
                    <li>fetch 사용: <code>fetch('/api/status-codes?code=429').then(res =&gt; console.log(res.status))</code></li>
                  </ul>
                </div>

                <h4 style={styles.subsectionTitle}>지원하는 상태 코드</h4>
                <pre style={styles.code}>{`GET /api/status-codes?code=200 → 200 OK
  응답: { "message": "200 상태 코드 응답", "code": 200 }

GET /api/status-codes?code=404 → 404 Not Found
  응답: { "message": "404 상태 코드 응답", "code": 404 }

GET /api/status-codes?code=429 → 429 Too Many Requests
  응답: { "message": "429 상태 코드 응답", "code": 429 }
  헤더: Retry-After: 60 (60초 후 재시도)

GET /api/status-codes?code=500 → 500 Internal Server Error
  응답: { "message": "500 상태 코드 응답", "code": 500 }`}</pre>

                <h4 style={{ ...styles.subsectionTitle, marginTop: '16px' }}>Playwright 테스트 예시</h4>
                <pre style={styles.code}>{`// 404 Not Found 테스트
test('상태 코드 404 테스트', async ({ page }) => {
  const response = await page.request.get('/api/status-codes?code=404');
  expect(response.status()).toBe(404);
  
  const data = await response.json();
  expect(data.code).toBe(404);
});

// 429 Rate Limit 테스트 (Retry-After 헤더 검증)
test('상태 코드 429 + Retry-After 헤더 테스트', async ({ page }) => {
  const response = await page.request.get('/api/status-codes?code=429');
  expect(response.status()).toBe(429);
  
  const retryAfter = response.headers()['retry-after'];
  expect(retryAfter).toBe('60');
});

// 500 Server Error 테스트
test('상태 코드 500 테스트', async ({ page }) => {
  const response = await page.request.get('/api/status-codes?code=500');
  expect(response.status()).toBe(500);
});`}</pre>
              </section>
            </div>
          )}

          {/* ============ TAB: skills ============ */}
          {activeTab === "skills" && (
            <div role="tabpanel" id="tab-panel-skills" aria-labelledby="tab-skills">
              {/* 연습 가능한 QA 역량 */}
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📚 연습 가능한 QA 자동화 역량</h3>

                <div style={styles.skillGrid}>
                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>🎯 셀렉터 전략</h4>
                    <ul style={styles.list}>
                      <li>ID, class, aria-label 활용</li>
                      <li>의미론적 셀렉터 우선</li>
                      <li>data-* 속성 지양</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>🔍 상태 검증</h4>
                    <ul style={styles.list}>
                      <li>로딩 상태 (isLoading)</li>
                      <li>비활성 상태 (disabled)</li>
                      <li>에러 표시 (role="alert")</li>
                      <li>조건부 렌더링</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>🌐 API 테스팅</h4>
                    <ul style={styles.list}>
                      <li>HTTP status code 검증</li>
                      <li>응답 메시지/코드 확인</li>
                      <li>다양한 HTTP 메서드</li>
                      <li>커스텀 헤더 검증</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>🔐 권한 테스트</h4>
                    <ul style={styles.list}>
                      <li>인증/인가 플로우</li>
                      <li>토큰 기반 인증</li>
                      <li>역할별 접근 제어</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>❌ 에러 시나리오</h4>
                    <ul style={styles.list}>
                      <li>404 Not Found (상품 16)</li>
                      <li>403 Forbidden</li>
                      <li>400 Validation 실패</li>
                      <li>빈 검색어 오류</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>📝 폼 검증</h4>
                    <ul style={styles.list}>
                      <li>실시간 validation</li>
                      <li>필드별 에러 메시지</li>
                      <li>disabled 조건 검증</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 추가 리소스 */}
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📖 추가 리소스</h3>
                <ul style={styles.list}>
                  <li>
                    <strong>API 문서:</strong> 프로젝트 루트의 <code>API_TESTING_GUIDE.md</code> 참고 (위 "API 문서" 탭에 요약 포함)
                  </li>
                  <li>
                    <strong>테스트 계정:</strong>
                    <ul style={styles.nestedList}>
                      <li>일반: test / 1234</li>
                      <li>관리자: admin / 1234</li>
                      <li>차단: test2 / 1234</li>
                    </ul>
                  </li>
                  <li>
                    <strong>에러 케이스:</strong>
                    <ul style={styles.nestedList}>
                      <li>상품 16 (가습기 초음파 3L 대용량 LED 무드등): 404 에러</li>
                      <li>검색어 빈 문자열: 400 오류 (EMPTY_QUERY)</li>
                      <li>검색어 100자 초과: 400 오류 (QUERY_TOO_LONG)</li>
                      <li>비로그인 관리자 버튼 클릭: 권한 오류</li>
                    </ul>
                  </li>
                </ul>
              </section>
            </div>
          )}
        </div>
        <div style={styles.footer}>
          <button
            id="qa-guide-close-bottom"
            className="btn btn-primary"
            onClick={onClose}
            style={styles.closeButton}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  tabNav: {
    display: 'flex',
    gap: '4px',
    padding: '12px 32px',
    borderBottom: '1px solid #e5e7eb',
    overflowX: 'auto',
    flexShrink: 0,
  },
  tabBtn: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    color: '#1a1a1a',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
    marginTop: 0,
  },
  subsection: {
    marginBottom: '20px',
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    marginTop: 0,
  },
  text: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: 1.6,
    margin: '0 0 12px 0',
  },
  list: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.8,
    paddingLeft: '24px',
    margin: '8px 0',
  },
  nestedList: {
    paddingLeft: '20px',
    marginTop: '4px',
  },
  note: {
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '8px',
    borderLeft: '4px solid #fbbf24',
    margin: '12px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    marginTop: '12px',
  },
  th: {
    backgroundColor: '#f3f4f6',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#1f2937',
    borderBottom: '2px solid #e5e7eb',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    color: '#4b5563',
  },
  errorCase: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  codeBlock: {
    backgroundColor: '#1f2937',
    color: '#d1d5db',
    padding: '12px 16px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: 1.6,
    overflowX: 'auto',
    margin: '12px 0',
    whiteSpace: 'pre',
  },
  scenario: {
    marginBottom: '24px',
  },
  code: {
    backgroundColor: '#1f2937',
    color: '#d1d5db',
    padding: '16px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: 1.6,
    overflowX: 'auto',
    margin: '12px 0',
  },
  skillGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  },
  skillCard: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
  },
  skillTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
    marginTop: 0,
  },
  footer: {
    padding: '20px 32px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'center',
  },
  closeButton: {
    padding: '12px 32px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
