# QA 자동화 프로젝트 - 최종 가이드

## 🎯 프로젝트 목적
- QA 자동화 연습
- 포트폴리오 데모
- Playwright / Selenium 학습

## 📦 기술 스택
- **Frontend**: React 19 (Vite)
- **Backend**: Vercel Serverless Functions
- **Database**: 없음 (메모리 기반)
- **배포**: Vercel (무료 플랜)

## 🚀 빠른 시작

### 1. 로컬 개발
```bash
npm install
npm run dev
# → http://localhost:5173
```

### 2. API 서버 (옵션)
```bash
npm run start-api
# → http://localhost:3000/api/*
```

### 3. QA 가이드 확인
웹사이트 접속 → 우측 상단 "📘 QA 가이드" 버튼 클릭

## 🔑 테스트 계정
| 계정 | ID | PW | 역할 | 설명 |
|------|----|----|------|------|
| 일반 | test | 1234 | USER | 일반 사용자 |
| 관리자 | admin | 1234 | ADMIN | 모든 권한 |
| 차단 | test2 | 1234 | BLOCKED | 403 에러 테스트용 |

## 💥 의도적 오류 케이스

### 상품 상세 API
| 상품 ID | 응답 | 설명 |
|---------|------|------|
| 1, 2, 5-18 | 200 OK | 정상 |
| 3, 4 | 500 Server Error | 의도적 장애 |
| 99 | 404 Not Found | 존재하지 않음 |
| 999 | 403 Forbidden | 접근 권한 없음 |

### 로그인 API  
| 입력 | 응답 |
|------|------|
| 빈 입력 | 400 Bad Request |
| 잘못된 계정 | 401 Unauthorized |
| 차단 계정 (test2) | 403 Forbidden |

## 📋 주요 UI 셀렉터

### 홈페이지
```typescript
// 버튼
page.locator('#qa-guide-btn')      // QA 가이드
page.locator('#home-search-btn')   // 검색
page.locator('#home-cart-btn')     // 장바구니
page.locator('#home-admin-btn')    // 관리자 (ADMIN만)
page.locator('#home-login')        // 로그인
page.locator('#home-logout')       // 로그아웃

// 입력
page.locator('#home-search')       // 검색창

// 카테고리
page.locator('#category-전체')
page.locator('#category-전자기기')
page.locator('#category-액세서리')
page.locator('#category-생활')
```

### 로그인 페이지
```typescript
page.locator('#login-username')    // 아이디 입력
page.locator('#login-password')    // 비밀번호 입력
page.locator('#login-submit')      // 로그인 버튼
page.locator('#login-error')       // 에러 메시지
page.locator('#back-to-home')      // 홈으로
```

### 상품
```typescript
page.locator('[data-product-id="1"]')  // 상품 카드
page.locator('.product-card')          // 모든 상품
```

## 🎬 Playwright 테스트 예시 (TypeScript)

### 초보자를 위한 설명
아래 예제들은 Playwright를 사용한 자동화 테스트 코드입니다. 각 테스트는 실제 사용자가 웹사이트를 사용하는 것처럼 동작하며, 예상한 결과가 나오는지 자동으로 검증합니다.

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
 * 목적: 일반 사용자(test)로 로그인 시 관리자 버튼이 보이지 않는지 확인
 * 
 * 배경: 관리자 기능은 ADMIN 역할을 가진 사용자만 접근 가능해야 함
 * 
 * 테스트 흐름:
 * 1. 일반 사용자(test) 계정으로 로그인
 * 2. 관리자 버튼이 화면에 보이지 않는지 확인
 */
test('일반 사용자는 관리자 버튼 미노출', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  // 일반 사용자 계정 (Role: USER)
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // not.toBeVisible()은 요소가 보이지 않음을 검증
  // 일반 사용자에게는 관리자 버튼이 렌더링되지 않아야 함
  await expect(page.locator('#home-admin-btn')).not.toBeVisible();
});

/**
 * 관리자 권한 테스트
 * 목적: 관리자(admin) 계정으로 로그인 시 관리자 버튼이 보이는지 확인
 * 
 * 테스트 흐름:
 * 1. 관리자(admin) 계정으로 로그인
 * 2. 관리자 버튼이 화면에 보이는지 확인
 */
test('관리자는 관리자 버튼 노출', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  // 관리자 계정 (Role: ADMIN)
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  // toBeVisible()은 요소가 화면에 보임을 검증
  // 관리자에게는 관리자 페이지로 이동하는 버튼이 표시되어야 함
  await expect(page.locator('#home-admin-btn')).toBeVisible();
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

## 📚 사용 가능한 API

| API | 메서드 | 설명 | 인증 |
|-----|--------|------|------|
| /api/login | POST | 로그인 | ❌ |
| /api/products | GET | 상품 목록 | ❌ |
| /api/products/:id | GET | 상품 상세 | ❌ |
| /api/search | GET | 상품 검색 | ❌ |
| /api/inventory | GET/HEAD | 재고 조회 | ❌ |
| /api/reviews | GET | 리뷰 목록 | ❌ |
| /api/reviews | POST | 리뷰 작성 | ✅ |
| /api/reviews | PATCH | 리뷰 수정 | ✅ |
| /api/reviews | DELETE | 리뷰 삭제 | ✅ |
| /api/admin | GET/POST/PUT/DELETE | 관리자 기능 | ✅ ADMIN |
| /api/user-actions | POST | 장바구니/주문 | ✅ |

## 🎓 학습 가능한 QA 역량

1. **셀렉터 전략**: ID, class, ARIA 활용
2. **상태 검증**: loading, disabled, error
3. **API 테스팅**: HTTP 메서드, 상태 코드, 응답 구조
4. **권한 테스트**: 인증/인가 플로우
5. **에러 시나리오**: 400/401/403/404/500
6. **폼 검증**: Validation, 에러 메시지
7. **E2E 시나리오**: 전체 사용자 플로우

## 📝 변경 이력

### v1.1 (2026-02-03)
- ✅ QA 가이드 컴포넌트 추가
- ✅ 403 Forbidden 에러 케이스 추가 (상품 ID 999)
- ✅ HomePage에 QA 가이드 버튼 추가
- ✅ 모든 주요 UI에 id/class/aria-label 정리

### v1.0 (기존)
- 로그인/상품/장바구니/주문 기본 기능
- 관리자 페이지 (CRUD)
- API 기본 구조

## 🔍 추가 개선 권장사항

### 1. ProductDetail 재고/리뷰 연동
현재는 API만 있고 UI 미연동. 추가 권장:
- inventory API 호출하여 재고 표시
- reviews API 호출하여 리뷰 목록 표시

### 2. 검색 API 연동
현재 클라이언트 필터링. API 연동 권장:
- search API 사용
- 쿼리 파라미터 validation 테스트

### 3. status-codes API 활용
별도 테스트 페이지 생성하여 다양한 HTTP 상태 코드 테스트

## 📞 문의
프로젝트 관련 문의는 프로젝트 README 참고

---
**만든 날짜**: 2026-02-03  
**목적**: QA 자동화 연습 & 포트폴리오
