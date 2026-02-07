# 🎨 UI 자동화 검증 가이드 (요약본)

---

## 📚 목차
1. [기본 개념](#1-기본-개념)
2. [핵심 함수들](#2-핵심-함수들)
3. [실전 패턴](#3-실전-패턴)
4. [자주 하는 실수](#4-자주-하는-실수)

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

// ID
page.locator('#login-button')

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

// 최소 1개 이상
await expect(page.locator('.item')).toHaveCount({ min: 1 });
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
  // 1. 페이지 이동 및 로딩 대기
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // 2. 로그인 버튼 클릭
  await page.click('#login-btn');
  
  // 3. 입력
  await page.fill('#username', 'test');
  await page.fill('#password', '1234');
  
  // 4. 제출
  await page.click('#submit');
  
  // 5. 결과 검증
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('#logout-btn')).toBeVisible();
  await expect(page.locator('.welcome')).toContainText('test');
});
```

### 패턴 2: 폼 유효성 검증
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
  
  // 로딩 스피너 대기
  await expect(page.locator('.spinner')).toBeVisible();
  
  // 스피너 사라지길 대기
  await page.locator('.spinner').waitFor({ state: 'hidden' });
  
  // 상품 목록 확인
  await expect(page.locator('.product-card')).toHaveCount({ min: 1 });
  
  // 첫 상품 확인
  await expect(page.locator('.product-card').first())
    .toContainText('상품명');
});
```

### 패턴 4: 조건부 요소
```typescript
import { test, expect } from '@playwright/test';

test('관리자 버튼은 관리자만 보임', async ({ page }) => {
  // 일반 사용자 로그인
  await page.goto('/');
  await page.click('#login');
  await page.fill('#username', 'user');
  await page.fill('#password', '1234');
  await page.click('#submit');
  
  // 관리자 버튼 없음
  await expect(page.locator('#admin-btn')).not.toBeVisible();
  
  // 로그아웃
  await page.click('#logout');
  
  // 관리자 로그인
  await page.click('#login');
  await page.fill('#username', 'admin');
  await page.fill('#password', '1234');
  await page.click('#submit');
  
  // 관리자 버튼 있음
  await expect(page.locator('#admin-btn')).toBeVisible();
});
```

### 패턴 5: 여러 요소 검증
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
page.locator('button').first()                   // 첫 번째
page.locator('button').nth(2)                    // 3번째 (0부터 시작)
```

---

## 6. 학습 로드맵

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

**🎯 다음 단계:** 실제 프로젝트의 로그인부터 테스트 작성!
