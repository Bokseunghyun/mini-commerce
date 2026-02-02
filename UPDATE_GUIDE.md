# QA 자동화 연습용 E-Commerce 데모 사이트 - 업데이트 가이드

## ✅ 완료된 작업

### 1. 상품 상세 → 홈페이지 이동
- ProductDetail에서 "목록" 버튼 클릭 시 HomePage로 이동하도록 변경
- `App.jsx`의 `onBack={() => setPage("home")}` 적용 완료

### 2. 위시리스트 기능 추가
- App.jsx에 wishlist 상태 추가
- toggleWishlist, isInWishlist 함수 구현
- HomePage에 위시리스트 props 전달

### 3. 장바구니 체크박스 기능
- 전체 선택/해제 기능
- 개별 상품 선택/해제
- 선택된 상품만 주문 가능
- ID 3, 4번 상품 포함 시 주문 오류 표시 및 주문 차단

### 4. 상품 오류 처리
- ID 3, 4: 상세 페이지 진입 시 500 에러 (기존 유지)
- ID 16 (LED 무드등): 404 에러로 변경
- LED 무드등 이미지 교체 완료

### 5. 관리자 페이지 접근 권한 수정
- 비로그인, 일반 계정도 어드민 페이지 접근 가능하도록 변경
- 기능은 제한적으로 표시 가능

## 🔨 추가 작업 필요 사항

### 1. ProductDetail.jsx에 리뷰 섹션 추가
다음 컴포넌트를 ProductDetail.jsx에 추가해야 합니다:

```jsx
// ProductDetail.jsx에 추가할 리뷰 섹션
import { useState, useEffect } from 'react';

function ReviewSection({ productId, apiBase, isLoggedIn }) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/reviews?productId=${productId}`);
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews || []);
      }
    } catch (e) {
      console.error('리뷰 로드 실패', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="review-section">
      <h2>상품 리뷰 ({reviews.length})</h2>
      {isLoading ? (
        <p>리뷰를 불러오는 중...</p>
      ) : reviews.length === 0 ? (
        <p>첫 리뷰를 작성해보세요!</p>
      ) : (
        <div className="reviews-list">
          {reviews.map(review => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <span className="review-author">{review.username}</span>
                <span className="review-rating">{"⭐".repeat(review.rating)}</span>
              </div>
              <p className="review-comment">{review.comment}</p>
              <span className="review-date">
                {new Date(review.createdAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

### 2. HomePage에 위시리스트 UI 추가
HomePage의 ProductCard 컴포넌트에 하트 아이콘 추가:

```jsx
// HomePage.jsx의 ProductCard에 추가
<button 
  className="wishlist-btn"
  onClick={(e) => {
    e.stopPropagation();
    onToggleWishlist(product);
  }}
>
  {isInWishlist(product.id) ? '❤️' : '🤍'}
</button>
```

### 3. 가이드 모달 컴포넌트 추가
새로운 GuideModal.jsx 컴포넌트 생성 필요:

```jsx
// src/components/GuideModal.jsx
import { useState } from 'react';

export default function GuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  const tabs = {
    overview: {
      title: '프로젝트 개요',
      content: `이 사이트는 QA 자동화 연습용 데모 E-Commerce입니다.
      
- Vercel 무료 배포
- DB 없이 메모리 기반
- 의도적 오류 케이스 포함
- API 테스트 가능`
    },
    features: {
      title: '주요 기능',
      content: `1. 상품 목록/상세/검색
2. 장바구니 (체크박스 선택)
3. 위시리스트
4. 로그인/로그아웃
5. 리뷰 작성
6. 관리자 페이지`
    },
    testCases: {
      title: '테스트 케이스',
      content: `의도적 오류:
- ID 3, 4: 상세 페이지 500 에러
- ID 3, 4: 장바구니 주문 차단
- ID 16: 404 에러

정상 동작:
- 나머지 모든 상품 정상 작동
- 리뷰 CRUD
- 검색/필터/정렬`
    },
    api: {
      title: 'API 엔드포인트',
      content: `GET    /api/products
GET    /api/products/:id
GET    /api/reviews
POST   /api/reviews
POST   /api/login
POST   /api/user-actions
GET    /api/admin`
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📖 사용 가이드</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-tabs">
          {Object.keys(tabs).map(tabKey => (
            <button
              key={tabKey}
              className={`tab ${activeTab === tabKey ? 'active' : ''}`}
              onClick={() => setActiveTab(tabKey)}
            >
              {tabs[tabKey].title}
            </button>
          ))}
        </div>

        <div className="modal-body">
          <pre>{tabs[activeTab].content}</pre>
        </div>
      </div>
    </div>
  );
}
```

HomePage.jsx에 가이드 버튼 추가:
```jsx
const [showGuide, setShowGuide] = useState(false);

// Header에 추가
<button className="guide-btn" onClick={() => setShowGuide(true)}>
  📖 가이드
</button>

<GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} />
```

### 4. 검색/카테고리 필터 시 높이 유지
HomePage.jsx에 CSS 추가:

```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  min-height: 600px; /* 최소 높이 보장 */
}

.empty-results {
  grid-column: 1 / -1;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
```

### 5. AdminPage 권한 체크 UI 개선
AdminPage.jsx에 권한별 안내 메시지:

```jsx
{!isLoggedIn && (
  <div className="notice">
    ℹ️ 로그인하지 않아도 조회는 가능하지만, 수정은 관리자 권한이 필요합니다.
  </div>
)}

{isLoggedIn && userRole !== 'ADMIN' && (
  <div className="notice">
    ℹ️ 일반 사용자는 조회만 가능합니다. 수정은 관리자만 가능합니다.
  </div>
)}
```

## 📝 추가 개선 제안

1. **위시리스트 페이지** - 별도 페이지 생성
2. **주문 내역** - OrderHistory 페이지
3. **상품 비교** - 여러 상품 비교 기능
4. **쿠폰/할인** - 할인 코드 입력 기능
5. **배송 추적** - 가상의 배송 상태
6. **알림 기능** - 재입고 알림 등

## 🧪 QA 자동화 테스트 시나리오

### E2E 테스트
1. 로그인 → 상품 검색 → 장바구니 → 주문
2. 비로그인 상태 장바구니 시도 → 로그인 페이지 리다이렉트
3. ID 3,4 장바구니 담기 → 체크박스 선택 → 주문 오류 확인
4. ID 16 상품 클릭 → 404 확인
5. 위시리스트 추가/제거

### API 테스트
1. 상품 목록 GET 200
2. 존재하지 않는 상품 GET 404
3. ID 3,4 상품 GET 500
4. ID 16 상품 GET 404
5. 인증 없이 리뷰 POST 401
6. 인증 후 리뷰 POST 201

## 🚀 배포

```bash
# Vercel 배포
vercel --prod

# 환경 변수 설정
VITE_API_BASE_URL=https://your-domain.vercel.app
```

## 📚 문서

- API_TESTING_GUIDE.md - API 테스트 가이드
- QA_TEST_GUIDE.md - QA 테스트 가이드  
- SELECTOR_PRACTICE_GUIDE.md - 셀렉터 연습 가이드

## 🎯 학습 목표

이 프로젝트를 통해 다음을 연습할 수 있습니다:

1. **API 테스트** - 다양한 HTTP 상태 코드, 오류 처리
2. **UI 자동화** - Playwright, Selenium 등
3. **테스트 시나리오 작성** - 정상/예외 케이스
4. **버그 리포팅** - 의도적 오류 찾기 및 문서화
5. **테스트 전략** - 우선순위, 커버리지
