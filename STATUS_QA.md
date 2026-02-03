# 구현 완료 현황

## ✅ 완료된 작업

### 1. QA 가이드 시스템
- **QAGuide.jsx** 컴포넌트 생성
  - 프로젝트 개요
  - UI/API 테스트 포인트 상세 설명
  - 의도적 오류 케이스 목록
  - Playwright 시나리오 예시 (4개 시나리오)
  - QA 역량 매핑

- **HomePage.jsx** 수정
  - QA 가이드 버튼 추가 (id="qa-guide-btn")
  - 모달 state 관리
  - 스타일 추가

### 2. API 에러 케이스 개선
- **api/products/[id].js** 수정
  - 403 에러 케이스 추가 (상품 ID 999)
  - 에러 응답 구조 일관성 유지 (message + code)

### 3. QA 자동화 친화적 구조
모든 주요 UI 요소에 식별자 포함:
- ✅ 로그인 페이지 (id, class, aria-label 모두 포함)
- ✅ 홈페이지 헤더 (검색, 장바구니, 관리자, 로그인/아웃 버튼)
- ✅ 상품 카드 (각 상품별 data-product-id)
- ✅ 에러 메시지 (role="alert")
- ✅ 로딩 상태 표시

## ⏳ 시간 제약으로 미완료 (권장 사항)

### ProductDetail.jsx 개선
현재 ProductDetail은 기존 코드 유지. 추후 추가 권장:

```jsx
// 재고 정보 표시
const [stockInfo, setStockInfo] = useState(null);

useEffect(() => {
  fetch(`/api/inventory?productId=${product.id}`)
    .then(res => res.json())
    .then(data => setStockInfo(data));
}, [product.id]);

// 리뷰 목록 표시
const [reviews, setReviews] = useState([]);

useEffect(() => {
  fetch(`/api/reviews?productId=${product.id}`)
    .then(res => res.json())
    .then(data => setReviews(data.reviews || []));
}, [product.id]);
```

UI 추가:
```jsx
{/* 재고 정보 */}
<div id="stock-info" className="stock-info">
  {stockInfo && (
    <>
      <span>재고: {stockInfo.stock}개</span>
      <span>창고: {stockInfo.warehouse}</span>
    </>
  )}
</div>

{/* 리뷰 목록 */}
<div id="reviews-section" className="reviews-section">
  {reviews.map(review => (
    <div key={review.id} className="review-item">
      <div className="review-rating">⭐ {review.rating}</div>
      <div className="review-comment">{review.comment}</div>
    </div>
  ))}
</div>
```

### 검색 API 연동
현재 HomePage는 클라이언트 필터링 사용. API 연동 권장:

```jsx
const handleSearchSubmit = async (e) => {
  e.preventDefault();
  const response = await fetch(
    `/api/search?q=${searchKeyword}&category=${activeCategory}`
  );
  const data = await response.json();
  setProducts(data.products);
};
```

## 📋 QA 테스트 케이스 정리

### 로그인 테스트
| 케이스 | 입력 | 예상 결과 | 셀렉터 |
|--------|------|-----------|--------|
| 성공 | test/1234 | 로그인 성공 | #login-submit |
| 실패 | wrong/wrong | 401 에러 메시지 | #login-error |
| 차단 | test2/1234 | 403 차단 메시지 | #login-error |
| Validation | 빈 입력 | disabled 버튼 | #login-submit:disabled |

### 상품 상세 테스트
| 상품 ID | 예상 결과 | Status Code |
|---------|-----------|-------------|
| 1 | 정상 조회 | 200 |
| 3 | 서버 오류 | 500 |
| 4 | 서버 오류 | 500 |
| 99 | 상품 없음 | 404 |
| 999 | 접근 권한 없음 | 403 |

### 권한 테스트
| 계정 | 관리자 버튼 | 관리자 API |
|------|-------------|-----------|
| 비로그인 | 미노출 | 401 |
| test | 미노출 | 403 |
| admin | 노출 | 200 |

### API 테스트
| API | 메서드 | 검증 포인트 |
|-----|--------|------------|
| /api/login | POST | message, status |
| /api/products | GET | products array |
| /api/products/:id | GET | 404/500/403 |
| /api/admin | GET/POST/PUT/DELETE | 401/403 |
| /api/inventory | GET/HEAD | 커스텀 헤더 |
| /api/reviews | GET/POST/PATCH/DELETE | validation |
| /api/search | GET | 쿼리 파라미터 |

## 🎯 이 프로젝트로 연습 가능한 QA 역량

1. **셀렉터 전략**
   - ID 우선 (#login-submit)
   - Semantic class (.login-button)
   - ARIA 속성 (aria-label)
   - 조합 전략

2. **상태 검증**
   - Loading: spinner 확인
   - Disabled: :disabled 셀렉터
   - Error: role="alert"
   - Conditional rendering

3. **API 테스팅**
   - Status code 검증
   - Response body 검증
   - HTTP 메서드별 테스트
   - 에러 응답 구조

4. **E2E 시나리오**
   - 로그인 → 상품 조회 → 장바구니 → 주문
   - 권한별 접근 제어
   - 에러 복구 플로우

5. **접근성 테스팅**
   - ARIA 속성
   - Semantic HTML
   - 키보드 네비게이션

