# Mini Commerce - Playwright QA Demo Site

Playwright 자동화 QA 연습을 위한 데모 이커머스 사이트입니다.

## 🎯 주요 기능

### 사용자 기능
- **홈페이지**: 상품 검색, 카테고리 필터링, 정렬
- **상품 목록**: 실시간 검색, 다양한 정렬 옵션
- **상품 상세**: 수량 선택, 장바구니 담기, 바로구매
- **장바구니**: 수량 조절, 상품 삭제, 주문하기
- **로그인/로그아웃**: 인증 시스템

### 관리자 기능 (신규 추가)
- 상품 정보 수정 (이름, 가격, 할인율)
- 상품 활성화/비활성화
- 관리자 전용 페이지 접근 제어

### QA 테스트 시나리오
1. **비로그인 상태 테스트**
   - 장바구니 담기 시 로그인 유도 확인
   - 바로구매 시 API 오류 (401) 발생 확인
   
2. **UI 일관성 테스트**
   - 검색 전후 레이아웃 너비 동일성 확인
   - 장바구니 0개/1개 이상일 때 버튼 너비 동일성 확인

3. **권한 테스트**
   - 일반 사용자의 관리자 페이지 접근 차단
   - 관리자 권한으로 상품 수정

## 🚀 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173` 접속

### 3. Vercel 배포
```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# 배포
vercel
```

## 👤 테스트 계정

### 일반 사용자
- **ID**: user
- **PW**: password

### 관리자
- **ID**: admin
- **PW**: admin123

## 📋 주요 변경사항

### 1. 첫 진입 페이지 변경
- ✅ HomePage를 첫 진입 페이지로 설정
- ✅ 로그인 후에도 홈으로 이동

### 2. 디자인 통일
- ✅ 모든 주요 버튼을 검은색 계열(#1a1a1a)로 통일
- ✅ 호버 효과 추가 (#333333)

### 3. UI 일관성 개선
- ✅ 검색 시 레이아웃 너비 고정
- ✅ 장바구니 0개일 때도 버튼 크기 유지 (minWidth: 110px)

### 4. 인증 로직 강화
- ✅ 비로그인 상태에서 장바구니 담기 → 로그인 유도
- ✅ 비로그인 상태에서 바로구매 → API 401 오류 발생
- ✅ 모든 페이지에서 일관된 인증 체크

### 5. Admin 기능 추가
- ✅ 관리자 전용 페이지 (AdminPage.jsx)
- ✅ 상품 CRUD 기능
- ✅ 권한 기반 접근 제어
- ✅ HomePage 헤더에 관리자 버튼 추가

### 6. QA 테스트용 기능
- ✅ 의도적 API 오류 시나리오
- ✅ 다양한 오류 케이스 시뮬레이션
- ✅ 에러 메시지 표시

## 🧪 Playwright 테스트 예시

### 로그인 플로우
```javascript
// 비로그인 상태에서 장바구니 담기
await page.click('[data-testid="add-cart-btn-1"]');
await expect(page.locator('text=로그인이 필요한 서비스입니다')).toBeVisible();

// 로그인
await page.fill('[data-testid="username-input"]', 'user');
await page.fill('[data-testid="password-input"]', 'password');
await page.click('[data-testid="login-button"]');

// 홈페이지 확인
await expect(page.locator('[data-testid="home-page"]')).toBeVisible();
```

### API 오류 테스트
```javascript
// 비로그인 상태에서 바로구매
await page.click('[data-testid="product-card-1"]');
await page.click('[data-testid="buy-now-button"]');
await expect(page.locator('text=API 오류 발생')).toBeVisible();
await expect(page.locator('text=401')).toBeVisible();
```

### UI 일관성 테스트
```javascript
// 장바구니 버튼 너비 측정
const emptyCartButton = await page.locator('[data-testid="cart-button"]');
const emptyWidth = await emptyCartButton.boundingBox();

// 상품 담기
await page.click('[data-testid="add-cart-btn-1"]');

const filledCartButton = await page.locator('[data-testid="cart-button"]');
const filledWidth = await filledCartButton.boundingBox();

// 너비 동일성 확인
expect(emptyWidth.width).toBe(filledWidth.width);
```

### Admin 기능 테스트
```javascript
// 관리자 로그인
await page.fill('[data-testid="username-input"]', 'admin');
await page.fill('[data-testid="password-input"]', 'admin123');
await page.click('[data-testid="login-button"]');

// 관리자 버튼 확인
await expect(page.locator('[data-testid="admin-button"]')).toBeVisible();

// 관리자 페이지 접근
await page.click('[data-testid="admin-button"]');
await expect(page.locator('text=관리자 페이지')).toBeVisible();

// 상품 수정
await page.click('button:has-text("수정")').first();
await page.fill('input[type="number"]', '99000');
await page.click('button:has-text("저장")');
await expect(page.locator('text=상품 정보가 수정되었습니다')).toBeVisible();
```

## 📁 프로젝트 구조

```
mini-commerce/
├── api/                    # API 라우트
│   ├── login.js           # 로그인 API
│   ├── products.js        # 상품 목록 API
│   ├── cart.js            # 장바구니 API
│   └── order.js           # 주문 API
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx       # 홈페이지 (첫 진입)
│   │   ├── ProductList.jsx    # 상품 목록
│   │   ├── ProductDetail.jsx  # 상품 상세
│   │   ├── cart.jsx           # 장바구니
│   │   ├── login.jsx          # 로그인
│   │   ├── AdminPage.jsx      # 관리자 페이지 (신규)
│   │   └── OrderComplete.jsx  # 주문 완료
│   └── App.jsx            # 메인 앱
├── CHANGES.md             # 변경사항 상세
└── README.md              # 이 파일
```

## 🔧 주요 컴포넌트

### HomePage
- 첫 진입 페이지
- 상품 검색, 카테고리 필터링
- 로그인/비로그인 상태 구분
- 관리자 버튼 (admin만 표시)

### AdminPage
- 관리자 전용 페이지
- 상품 정보 수정
- 상품 활성화/비활성화
- 권한 체크

### ProductList & ProductDetail
- 비로그인 상태 장바구니 담기 → 로그인 유도
- UI 일관성 유지
- API 오류 핸들링

## 🐛 의도적 오류 시나리오

### 1. 비로그인 바로구매 (401 오류)
```javascript
// buyNow 함수에서 빈 토큰으로 API 호출
// 상태 코드: 401
// 메시지: "인증 실패"
```

### 2. 존재하지 않는 상품 (404 오류)
```javascript
// ID가 99인 상품 조회 시
// 상태 코드: 404
// 메시지: "상품을 찾을 수 없습니다"
```

### 3. 0원 상품 주문 (가격 오류)
```javascript
// price가 0인 상품 주문 시
// 클라이언트에서 사전 차단
// 메시지: "상품 가격 오류(0원)"
```

## 📝 참고사항

- **DB 미연결**: 모든 데이터는 메모리에 저장됩니다
- **세션 관리**: localStorage를 사용합니다
- **API 모킹**: Vercel Serverless Functions 사용
- **상태 관리**: React useState 사용
- **라우팅**: 단일 페이지 내 조건부 렌더링

## 🤝 기여

이 프로젝트는 QA 테스트 연습용으로 제작되었습니다.
버그나 개선사항은 이슈로 등록해 주세요.

## 📄 라이선스

MIT License
