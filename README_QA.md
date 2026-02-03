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
```javascript
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
```javascript
page.locator('#login-username')    // 아이디 입력
page.locator('#login-password')    // 비밀번호 입력
page.locator('#login-submit')      // 로그인 버튼
page.locator('#login-error')       // 에러 메시지
page.locator('#back-to-home')      // 홈으로
```

### 상품
```javascript
page.locator('[data-product-id="1"]')  // 상품 카드
page.locator('.product-card')          // 모든 상품
```

## 🎬 Playwright 테스트 예시

### test/login.spec.js
```javascript
import { test, expect } from '@playwright/test';

test('로그인 성공', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  await expect(page.locator('#home-logout')).toBeVisible();
});

test('잘못된 계정 로그인 실패', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  await page.fill('#login-username', 'wrong');
  await page.fill('#login-password', 'wrong');
  await page.click('#login-submit');
  
  await expect(page.locator('#login-error'))
    .toContainText('아이디 또는 비밀번호 오류');
});
```

### test/products.spec.js
```javascript
test('상품 3번 500 에러', async ({ page }) => {
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('500');
    await dialog.accept();
  });
  
  await page.goto('/');
  await page.click('[data-product-id="3"] button.view-btn');
});

test('존재하지 않는 상품 404', async ({ page }) => {
  const response = await page.request.get('/api/products/99');
  expect(response.status()).toBe(404);
  
  const body = await response.json();
  expect(body.code).toBe('PRODUCT_NOT_FOUND');
});
```

### test/permissions.spec.js
```javascript
test('일반 사용자는 관리자 버튼 미노출', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  await expect(page.locator('#home-admin-btn')).not.toBeVisible();
});

test('관리자는 관리자 버튼 노출', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  await page.fill('#login-username', 'admin');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  await expect(page.locator('#home-admin-btn')).toBeVisible();
});
```

### test/api.spec.js
```javascript
test('재고 API HEAD 메서드', async ({ page }) => {
  const response = await page.request.head(
    '/api/inventory?productId=1'
  );
  
  expect(response.status()).toBe(200);
  expect(response.headers()['x-stock-count']).toBeDefined();
});

test('리뷰 작성 짧은 코멘트 검증', async ({ page }) => {
  // 로그인 후 토큰 얻기
  await page.goto('/');
  await page.click('#home-login');
  await page.fill('#login-username', 'test');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  const token = await page.evaluate(() => 
    localStorage.getItem('token')
  );
  
  const response = await page.request.post('/api/reviews', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      productId: 1,
      rating: 5,
      comment: '좋아요' // 10자 미만
    }
  });
  
  expect(response.status()).toBe(400);
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
