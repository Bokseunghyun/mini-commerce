# 🚀 빠른 시작 가이드

## 📦 다운로드 후 바로 실행하기

### 1단계: 압축 해제
```bash
unzip mini-commerce-updated.zip
cd mini-commerce-updated
```

### 2단계: 의존성 설치
```bash
npm install
```

### 3단계: 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속!

---

## 👤 테스트 계정

### 일반 사용자
- ID: **user**
- PW: **password**

### 관리자
- ID: **admin**
- PW: **admin123**

---

## ✨ 주요 변경사항 요약

### ✅ 완료된 수정사항

1. **첫 진입 페이지를 HomePage로 변경**
   - 로그인 페이지 대신 홈페이지가 첫 화면으로 표시됩니다

2. **HomePage 버튼 색상을 검은색 계열로 통일**
   - 모든 주요 버튼: #1a1a1a
   - 상품목록과 동일한 스타일 적용

3. **상품목록 검색 시 UI 너비 고정**
   - 검색 전후 레이아웃이 변하지 않습니다
   - minWidth 설정으로 일관성 유지

4. **장바구니 0개일 때도 UI 너비 동일**
   - 카운트 뱃지 유무와 관계없이 버튼 크기 유지
   - minWidth: 110px 적용

5. **비로그인 상태 바로구매 시 API 오류 발생 (QA용)**
   - 의도적으로 401 Unauthorized 오류 발생
   - API 검증 테스트용

6. **비로그인 상태 장바구니 담기 시 로그인 유도**
   - confirm 다이얼로그 표시
   - 확인 시 로그인 페이지로 자동 이동

7. **모든 페이지에서 장바구니 클릭 시 로그인 유도**
   - HomePage, ProductList, ProductDetail 모두 동일 로직 적용
   - 일관된 사용자 경험 제공

8. **페이지 간 자연스러운 흐름**
   - 뒤로가기 버튼 추가
   - 홈 ↔ 상품목록 ↔ 상품상세 ↔ 장바구니 원활한 이동

9. **Admin 기능 추가 (신규)**
   - 관리자 전용 페이지 (AdminPage.jsx)
   - 상품 정보 수정 (이름, 가격, 할인율)
   - 상품 활성화/비활성화
   - 권한 기반 접근 제어
   - HomePage 헤더에 관리자 버튼 자연스럽게 통합

10. **QA 테스트용 의도적 오류 추가**
    - 비로그인 바로구매 → 401 오류
    - 존재하지 않는 상품(ID: 99) → 404 오류
    - 가격 0원 상품 → 클라이언트 오류 처리
    - 다양한 API 오류 시나리오 제공

---

## 🧪 Playwright 테스트 시나리오

### 시나리오 1: 로그인 플로우
```javascript
// 홈페이지 확인
await expect(page).toHaveURL(/localhost:5173/);
await expect(page.locator('[data-testid="home-page"]')).toBeVisible();

// 비로그인 상태에서 장바구니 담기 시도
await page.click('[data-testid="add-cart-btn-1"]');
await expect(page.locator('text=로그인이 필요한 서비스입니다')).toBeVisible();

// 로그인 페이지로 이동
await page.click('text=확인');
await expect(page.locator('[data-testid="login-page"]')).toBeVisible();
```

### 시나리오 2: UI 일관성 테스트
```javascript
// 장바구니 버튼 너비 측정 (0개)
const emptyButton = await page.locator('[data-testid="cart-button"]');
const emptyBox = await emptyButton.boundingBox();

// 로그인 후 상품 담기
// ... 로그인 & 장바구니 담기

// 장바구니 버튼 너비 측정 (1개 이상)
const filledButton = await page.locator('[data-testid="cart-button"]');
const filledBox = await filledButton.boundingBox();

// 너비 동일성 확인
expect(emptyBox.width).toBe(filledBox.width);
```

### 시나리오 3: API 오류 테스트
```javascript
// 비로그인 상태에서 바로구매
await page.click('[data-testid="product-card-1"]');
await page.click('[data-testid="buy-now-button"]');

// API 오류 확인
await expect(page.locator('text=API 오류 발생')).toBeVisible();
await expect(page.locator('text=401')).toBeVisible();
```

### 시나리오 4: Admin 기능 테스트
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
await page.fill('input[value="129000"]', '99000');
await page.click('button:has-text("저장")');
await expect(page.locator('text=상품 정보가 수정되었습니다')).toBeVisible();
```

---

## 📋 주요 파일

### 신규 추가
- `src/pages/AdminPage.jsx` - 관리자 페이지
- `CHANGES.md` - 상세 변경사항
- `README_UPDATED.md` - 업데이트된 README

### 주요 수정
- `src/App.jsx` - 첫 진입 페이지 변경, 로그인 검증 강화
- `src/pages/HomePage.jsx` - 버튼 색상 통일, 로그인 상태 구분
- `src/pages/ProductList.jsx` - UI 너비 고정
- `src/pages/ProductDetail.jsx` - 로그인 검증 추가
- `src/pages/login.jsx` - 뒤로가기 버튼 추가

---

## 🎯 테스트 포인트

### 필수 테스트 항목
- [ ] 홈페이지가 첫 진입 페이지로 표시되는가?
- [ ] 비로그인 상태에서 장바구니 담기 시 로그인 유도 다이얼로그가 표시되는가?
- [ ] 비로그인 상태에서 바로구매 시 API 401 오류가 발생하는가?
- [ ] 장바구니 0개일 때와 1개 이상일 때 버튼 너비가 동일한가?
- [ ] 검색 전후 UI 레이아웃이 변하지 않는가?
- [ ] 일반 사용자는 관리자 페이지에 접근할 수 없는가?
- [ ] 관리자는 상품 정보를 수정할 수 있는가?
- [ ] 모든 페이지 간 이동이 자연스러운가?

### 추가 테스트 항목
- [ ] 장바구니 수량 증가/감소가 정상 작동하는가?
- [ ] 주문 완료 후 장바구니가 비워지는가?
- [ ] 로그아웃 시 홈페이지로 이동하는가?
- [ ] 관리자 버튼이 admin 계정에서만 표시되는가?
- [ ] 상품 활성화/비활성화가 정상 작동하는가?

---

## 🔗 Vercel 배포

```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# 로그인
vercel login

# 배포
vercel
```

배포 후 Playwright 테스트 시 URL을 배포된 주소로 변경하세요!

---

## 💡 문제 해결

### node_modules 오류
```bash
rm -rf node_modules package-lock.json
npm install
```

### 포트 충돌
```bash
# 다른 포트로 실행
npm run dev -- --port 3000
```

### Vercel 배포 오류
- vercel.json 파일이 있는지 확인
- .env.production 파일 확인

---

## 📞 도움이 필요하신가요?

- `CHANGES.md` - 상세한 변경사항
- `README_UPDATED.md` - 전체 프로젝트 문서

Happy Testing! 🎉
