# 코드 수정 요약

## 1. 수정된 파일 목록

### A. 신규 파일
- `src/pages/QAGuide.jsx` - QA 자동화 가이드 모달 컴포넌트

### B. 수정된 파일
- `src/pages/HomePage.jsx` - QA 가이드 버튼 추가
- `src/pages/ProductDetail.jsx` - 재고/리뷰 API 연동 추가 (예정)
- `api/products/[id].js` - 404/403 에러 케이스 추가 (예정)

## 2. 주요 수정 사항

### HomePage.jsx 
**변경 이유**: QA 가이드 접근성 제공
- QAGuide 컴포넌트 import 추가
- showQAGuide state 추가
- "QA 가이드" 버튼 추가 (id="qa-guide-btn")
- QAGuide 모달 렌더링 추가
- qaGuideBtn 스타일 추가

### QAGuide.jsx (신규)
**생성 이유**: QA 자동화 학습 가이드 제공
- 프로젝트 개요 설명
- UI/API 테스트 포인트 목록
- 의도적 오류 케이스 설명
- Playwright 시나리오 예시 제공
- 연습 가능한 QA 역량 정리

## 3. 추가 필요 작업

### ProductDetail.jsx 수정 필요
1. 재고 정보 표시
   - `/api/inventory?productId={id}` 호출
   - stock 정보 UI 표시
   - id="stock-info" 추가

2. 리뷰 목록 표시
   - `/api/reviews?productId={id}` 호출
   - 리뷰 리스트 렌더링
   - className="review-item" 추가

### API 수정 필요

#### api/products/[id].js
현재 상태:
- ID 3, 4: 500 에러
- 존재하지 않는 ID: 404 에러

추가 필요:
- ID 999: 403 Forbidden (접근 권한 없음)
- 명확한 에러 응답 구조

```javascript
// 403 케이스 추가 예시
if (productId === 999) {
  return res.status(403).json({
    message: '접근 권한이 없는 상품입니다',
    code: 'FORBIDDEN_PRODUCT'
  });
}
```

## 4. QA 자동화 검증 포인트

### 현재 구현된 케이스
✅ 로그인 validation (id, class, aria-label)
✅ 관리자 버튼 권한 제어 (ADMIN role 체크)
✅ 에러 메시지 표시 (role="alert")
✅ disabled 상태 관리
✅ 로딩 상태 표시

### 구현 예정 케이스
⏳ 상품 상세 404/500/403 에러
⏳ 재고 API 연동 및 표시
⏳ 리뷰 API 연동 및 표시
⏳ 검색 API 사용
⏳ 재고 API HEAD 메서드

## 5. 사용되지 않는 API 활용 계획

### search.js
- HomePage 검색 기능을 API 연동으로 변경
- 현재: 클라이언트 필터링
- 변경: `/api/search?q={keyword}` 호출

### inventory.js
- ProductDetail에서 재고 정보 표시
- GET, HEAD 메서드 테스트 가능

### reviews.js  
- ProductDetail에서 리뷰 목록 표시
- GET /api/reviews?productId={id}

### status-codes.js
- 각종 HTTP 상태 코드 테스트용
- API 테스트 연습에 활용

## 6. 필요한 추가 질문

1. **ProductDetail 재고/리뷰 UI**: 상단 배치 vs 하단 배치?
2. **검색 API 연동**: 실시간 검색 vs 버튼 클릭 검색?
3. **에러 모달**: alert() vs 커스텀 모달?
4. **status-codes.js 활용 방법**: 별도 테스트 페이지 필요 여부?

