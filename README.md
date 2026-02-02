# Mini Commerce - QA 자동화 & API 검증 연습 프로젝트

완벽한 QA 자동화 테스트와 RESTful API 검증 연습을 위한 이커머스 데모 사이트

## 🎯 프로젝트 목적

- **QA 자동화 테스트** 연습 (Playwright, Cypress, Selenium)
- **RESTful API 검증** 연습 (Postman, Thunder Client, fetch API)
- **UI 테스트** 연습 (다양한 선택자, 시나리오)
- **포트폴리오** 프로젝트로 활용 가능

## 🚀 빠른 시작

```bash
npm install
npm run dev        # 프론트엔드 (port 5173)
npm run start-api  # API 서버 (port 3000) - 별도 터미널
```

## 🔑 테스트 계정

- **일반 사용자**: test / test1234
- **관리자**: admin / admin1234

## 📊 주요 기능

### 18개 상품 (카테고리별)
- 전자기기 6개
- 액세서리 6개
- 생활 6개

### 10개 API 엔드포인트
- 기본 CRUD (로그인, 상품, 장바구니, 주문, 관리자)
- 고급 API (검색, 리뷰, 재고, 위시리스트, 상태코드)

## 📖 상세 문서

- [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) - API 검증 완벽 가이드
- [API_TEST_COLLECTION.md](API_TEST_COLLECTION.md) - API 테스트 컬렉션
- [QA_TEST_GUIDE.md](QA_TEST_GUIDE.md) - QA 테스트 시나리오
- [SELECTOR_PRACTICE_GUIDE.md](SELECTOR_PRACTICE_GUIDE.md) - 선택자 연습
- [PROJECT_EVALUATION.md](PROJECT_EVALUATION.md) - 프로젝트 평가

## 🌐 Vercel 배포

```bash
vercel --prod
```

환경 변수 설정:
- VITE_API_BASE_URL=https://your-domain.vercel.app
- JWT_SECRET=your-secret-key
