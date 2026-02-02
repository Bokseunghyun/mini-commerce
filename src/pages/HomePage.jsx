"use client";

import { useState } from "react";

// ============================================
// 로딩 스피너 컴포넌트
// ============================================
function LoadingSpinner() {
  return (
    <div style={styles.loadingContainer} data-testid="loading-spinner">
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>상품을 불러오는 중...</p>
    </div>
  );
}

// ============================================
// 빈 결과 컴포넌트
// ============================================
function EmptyResults({ searchTerm }) {
  return (
    <div style={styles.emptyResults} data-testid="empty-results">
      <p style={styles.emptyText}>"{searchTerm}" 검색 결과가 없습니다.</p>
      <p style={styles.emptySubtext}>다른 검색어로 시도해보세요.</p>
    </div>
  );
}

// ============================================
// 가이드 모달 컴포넌트
// ============================================
function GuideModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '개요' },
    { id: 'qa', label: 'QA 테스트' },
    { id: 'api', label: 'API 가이드' },
    { id: 'selector', label: 'Selector 연습' },
    { id: 'quickstart', label: '빠른 시작' },
  ];

  return (
    <div style={styles.modalOverlay} onClick={onClose} data-testid="guide-modal-overlay">
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()} data-testid="guide-modal">
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>📖 상세 가이드 문서</h2>
          <button onClick={onClose} style={styles.modalCloseBtn} data-testid="close-guide-modal" aria-label="닫기">
            ✕
          </button>
        </div>
        
        {/* 탭 메뉴 */}
        <div style={styles.tabContainer}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.id ? styles.tabButtonActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 내용 */}
        <div style={styles.modalBody}>
          {activeTab === 'overview' && <OverviewContent />}
          {activeTab === 'qa' && <QATestContent />}
          {activeTab === 'api' && <APITestContent />}
          {activeTab === 'selector' && <SelectorContent />}
          {activeTab === 'quickstart' && <QuickStartContent />}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 각 탭의 내용 컴포넌트들
// ============================================
function OverviewContent() {
  return (
    <div style={styles.guideContent}>
      <h3 style={styles.guideSection}>🧪 Playwright 테스트 연습용 데모 사이트</h3>
      <p style={styles.guidePara}>
        이 사이트는 QA 자동화 테스트 연습을 위해 만들어졌습니다. 
        다양한 상황과 에러 케이스를 포함하여 실전과 유사한 테스트 환경을 제공합니다.
      </p>

      <h3 style={styles.guideSection}>🔑 테스트 계정</h3>
      <ul style={styles.guideList}>
        <li><strong>일반 사용자:</strong> test / 1234</li>
        <li><strong>관리자:</strong> admin / 1234</li>
        <li><strong>차단된 계정:</strong> test2 / 1234 (403 에러 발생)</li>
      </ul>

      <h3 style={styles.guideSection}>⚠️ 의도적 에러 케이스</h3>
      <ul style={styles.guideList}>
        <li><strong>상품 3, 4번 상세 조회:</strong> 500 에러 발생</li>
        <li><strong>상품 3, 4번 주문:</strong> 422 에러 발생 (장바구니 담기는 가능)</li>
        <li><strong>비로그인 관리자 접근:</strong> 401 에러</li>
        <li><strong>일반 사용자 관리자 접근:</strong> 403 에러</li>
        <li><strong>검색어 없이 검색:</strong> Alert 메시지</li>
      </ul>

      <h3 style={styles.guideSection}>✨ 주요 기능</h3>
      <ul style={styles.guideList}>
        <li>실시간 검색 및 5가지 정렬 옵션</li>
        <li>카테고리 필터링 (전체/전자기기/액세서리/생활)</li>
        <li>장바구니: 추가/삭제/수량 조절/체크박스 선택</li>
        <li>상품 상세 보기 및 바로구매</li>
        <li>주문 완료 플로우</li>
        <li>관리자 상품 관리 (CRUD)</li>
      </ul>
    </div>
  );
}

function QATestContent() {
  return (
    <div style={styles.guideContent}>
      <h3 style={styles.guideSection}>📋 QA 자동화 테스트 가이드</h3>
      
      <h4 style={styles.guideSubSection}>1. 인증 테스트</h4>
      <ul style={styles.guideList}>
        <li><strong>로그인 성공:</strong> 올바른 계정으로 로그인 → 토큰 저장 → 홈페이지 이동</li>
        <li><strong>로그인 실패:</strong> 잘못된 계정 정보, 빈 입력값 → 에러 메시지 표시</li>
        <li><strong>로그아웃:</strong> 토큰 삭제 → 홈페이지 이동</li>
        <li><strong>차단된 계정:</strong> test2 / 1234 → 403 에러</li>
      </ul>

      <h4 style={styles.guideSubSection}>2. 상품 목록 테스트</h4>
      <ul style={styles.guideList}>
        <li><strong>카테고리 필터:</strong> 전체(10개), 전자기기(6개), 액세서리(3개), 생활(1개)</li>
        <li><strong>정렬:</strong> 기본순, 낮은 가격순, 높은 가격순, 이름순, 할인율순</li>
        <li><strong>검색:</strong> 상품명/설명 검색, 검색어 없으면 Alert, 결과 0개 시 메시지</li>
      </ul>

      <h4 style={styles.guideSubSection}>3. 장바구니 테스트</h4>
      <ul style={styles.guideList}>
        <li><strong>비로그인:</strong> 장바구니 담기 시 로그인 유도 팝업</li>
        <li><strong>로그인 후:</strong> 상품 추가, 수량 조절, 동일 상품 추가 시 수량 증가</li>
        <li><strong>체크박스:</strong> 전체 선택/개별 선택, 선택한 상품만 주문 가능</li>
        <li><strong>수량 조절:</strong> 최소 1개, +/- 버튼</li>
      </ul>

      <h4 style={styles.guideSubSection}>4. 주문 테스트</h4>
      <ul style={styles.guideList}>
        <li><strong>정상 주문:</strong> 장바구니에서 선택 → 주문하기 → 주문 완료 페이지</li>
        <li><strong>비로그인 바로구매:</strong> 401 에러 발생</li>
        <li><strong>3, 4번 상품 주문:</strong> 422 에러 (주문 불가 상품 포함)</li>
      </ul>

      <h4 style={styles.guideSubSection}>5. 관리자 기능 테스트</h4>
      <ul style={styles.guideList}>
        <li><strong>비로그인 접근:</strong> 401 에러</li>
        <li><strong>일반 사용자 접근:</strong> 403 에러</li>
        <li><strong>관리자 로그인:</strong> 상품 CRUD(생성/조회/수정/삭제) 가능</li>
      </ul>

      <h4 style={styles.guideSubSection}>6. 에러 상황 테스트</h4>
      <ul style={styles.guideList}>
        <li><strong>3번 상품 상세:</strong> 500 에러 발생</li>
        <li><strong>4번 상품 상세:</strong> 500 에러 발생</li>
        <li><strong>존재하지 않는 상품:</strong> 404 에러</li>
        <li><strong>잘못된 상품 ID:</strong> 400 에러</li>
      </ul>
    </div>
  );
}

function APITestContent() {
  return (
    <div style={styles.guideContent}>
      <h3 style={styles.guideSection}>🔌 API 테스트 가이드</h3>

      <h4 style={styles.guideSubSection}>인증 API</h4>
      <div style={styles.codeBlock}>
        <strong>POST /api/main?action=login</strong><br/>
        Body: &#123; username, password &#125;<br/>
        성공: 200 + token<br/>
        실패: 401 (잘못된 계정), 403 (차단된 계정)
      </div>

      <h4 style={styles.guideSubSection}>상품 API</h4>
      <div style={styles.codeBlock}>
        <strong>GET /api/products</strong><br/>
        성공: 200 + 상품 목록<br/>
        <br/>
        <strong>GET /api/products/:id</strong><br/>
        성공: 200 + 상품 상세<br/>
        실패: 400 (잘못된 ID), 404 (없는 상품), 500 (3,4번 상품)
      </div>

      <h4 style={styles.guideSubSection}>장바구니 & 주문 API</h4>
      <div style={styles.codeBlock}>
        <strong>POST /api/main?action=cart</strong><br/>
        Headers: Authorization: Bearer &#123;token&#125;<br/>
        Body: &#123; action: "remove", index, cart &#125;<br/>
        <br/>
        <strong>POST /api/main?action=order</strong><br/>
        Headers: Authorization: Bearer &#123;token&#125;<br/>
        Body: &#123; items: [...] &#125;<br/>
        성공: 200<br/>
        실패: 401 (비로그인), 422 (3,4번 상품 포함)
      </div>

      <h4 style={styles.guideSubSection}>관리자 API</h4>
      <div style={styles.codeBlock}>
        <strong>GET /api/admin</strong><br/>
        <strong>POST /api/admin</strong><br/>
        <strong>PUT /api/admin</strong><br/>
        <strong>DELETE /api/admin</strong><br/>
        Headers: Authorization: Bearer &#123;token&#125;<br/>
        실패: 401 (비로그인), 403 (권한 없음)
      </div>

      <h4 style={styles.guideSubSection}>재고 & 리뷰 API</h4>
      <div style={styles.codeBlock}>
        <strong>GET /api/main?action=inventory</strong><br/>
        <strong>POST /api/main?action=inventory</strong> (관리자만)<br/>
        <br/>
        <strong>GET /api/main?action=reviews?productId=1</strong><br/>
        <strong>POST /api/main?action=reviews</strong> (인증 필요)<br/>
        <strong>PATCH /api/main?action=reviews</strong> (본인만)<br/>
        <strong>DELETE /api/main?action=reviews</strong> (본인/관리자)
      </div>

      <h4 style={styles.guideSubSection}>에러 코드 정리</h4>
      <ul style={styles.guideList}>
        <li><strong>200:</strong> 성공</li>
        <li><strong>201:</strong> 생성 성공</li>
        <li><strong>400:</strong> 잘못된 요청 (필수 파라미터 누락, 유효성 검증 실패)</li>
        <li><strong>401:</strong> 인증 실패 (토큰 없음, 잘못된 토큰)</li>
        <li><strong>403:</strong> 권한 없음 (차단된 계정, 관리자 아님)</li>
        <li><strong>404:</strong> 리소스 없음</li>
        <li><strong>405:</strong> 허용되지 않은 메서드</li>
        <li><strong>422:</strong> 처리 불가 (3,4번 상품 주문)</li>
        <li><strong>500:</strong> 서버 오류 (3,4번 상품 상세 조회)</li>
      </ul>
    </div>
  );
}

function SelectorContent() {
  return (
    <div style={styles.guideContent}>
      <h3 style={styles.guideSection}>🎯 Selector 연습 가이드</h3>

      <h4 style={styles.guideSubSection}>기본 Selector</h4>
      <div style={styles.codeBlock}>
        // ID<br/>
        #home-search<br/>
        #home-cart-btn<br/>
        #checkout-btn<br/>
        <br/>
        // Class<br/>
        .search-input<br/>
        .cart-button<br/>
        .product-card<br/>
        <br/>
        // Name<br/>
        [name="searchKeyword"]<br/>
        [name="cartButton"]<br/>
        [name="loginButton"]
      </div>

      <h4 style={styles.guideSubSection}>Data Attributes</h4>
      <div style={styles.codeBlock}>
        [data-testid="home-page"]<br/>
        [data-testid="search-input"]<br/>
        [data-testid="cart-button"]<br/>
        [data-testid="view-detail-btn-1"]<br/>
        [data-testid="add-to-cart-btn-1"]<br/>
        [data-action="view"]
      </div>

      <h4 style={styles.guideSubSection}>복합 Selector</h4>
      <div style={styles.codeBlock}>
        // 버튼 텍스트로 찾기<br/>
        button:has-text("로그인")<br/>
        button:has-text("장바구니")<br/>
        <br/>
        // n번째 요소<br/>
        .product-card:nth-child(1)<br/>
        .category-btn:nth-child(2)<br/>
        <br/>
        // 부모-자식 관계<br/>
        .product-card button[data-action="view"]<br/>
        .header-actions .cart-button
      </div>

      <h4 style={styles.guideSubSection}>Playwright 추천 Selector</h4>
      <div style={styles.codeBlock}>
        // getByRole<br/>
        page.getByRole('button', &#123; name: '로그인' &#125;)<br/>
        page.getByRole('button', &#123; name: '장바구니' &#125;)<br/>
        <br/>
        // getByTestId<br/>
        page.getByTestId('home-page')<br/>
        page.getByTestId('search-input')<br/>
        <br/>
        // getByLabel<br/>
        page.getByLabel('상품 검색')<br/>
        page.getByLabel('장바구니로 이동')
      </div>

      <h4 style={styles.guideSubSection}>동적 ID Selector</h4>
      <div style={styles.codeBlock}>
        // 상품 ID가 동적인 경우<br/>
        #product-1-view<br/>
        #product-2-add<br/>
        [data-testid="view-detail-btn-1"]<br/>
        [data-testid="add-to-cart-btn-2"]
      </div>

      <h4 style={styles.guideSubSection}>연습 시나리오</h4>
      <ul style={styles.guideList}>
        <li>검색창 찾기: 3가지 방법으로 (id, class, data-testid)</li>
        <li>1번 상품의 "상세" 버튼 찾기: 동적 ID 사용</li>
        <li>카테고리 버튼 중 "전자기기" 찾기: 텍스트 기반</li>
        <li>로그인 버튼 찾기: role과 name 사용</li>
        <li>장바구니 개수 badge 찾기: 복합 selector</li>
      </ul>
    </div>
  );
}

function QuickStartContent() {
  return (
    <div style={styles.guideContent}>
      <h3 style={styles.guideSection}>🚀 빠른 시작 가이드</h3>

      <h4 style={styles.guideSubSection}>1. 로컬 실행</h4>
      <div style={styles.codeBlock}>
        # 의존성 설치<br/>
        npm install<br/>
        <br/>
        # 개발 서버 실행<br/>
        npm run dev<br/>
        <br/>
        # API 서버 실행 (로컬 테스트용)<br/>
        npm run start-api
      </div>

      <h4 style={styles.guideSubSection}>2. Playwright 설치</h4>
      <div style={styles.codeBlock}>
        # Playwright 설치<br/>
        npm init playwright@latest<br/>
        <br/>
        # 테스트 실행<br/>
        npx playwright test<br/>
        <br/>
        # UI 모드로 실행<br/>
        npx playwright test --ui<br/>
        <br/>
        # 특정 브라우저로 실행<br/>
        npx playwright test --project=chromium
      </div>

      <h4 style={styles.guideSubSection}>3. 첫 테스트 작성</h4>
      <div style={styles.codeBlock}>
        import &#123; test, expect &#125; from '@playwright/test';<br/>
        <br/>
        test('로그인 테스트', async (&#123; page &#125;) => &#123;<br/>
        &nbsp;&nbsp;await page.goto('http://localhost:5173');<br/>
        &nbsp;&nbsp;await page.getByRole('button', &#123; name: '로그인' &#125;).click();<br/>
        &nbsp;&nbsp;await page.getByLabel('아이디').fill('test');<br/>
        &nbsp;&nbsp;await page.getByLabel('비밀번호').fill('1234');<br/>
        &nbsp;&nbsp;await page.getByRole('button', &#123; name: '로그인' &#125;).click();<br/>
        &nbsp;&nbsp;await expect(page.getByRole('button', &#123; name: '로그아웃' &#125;)).toBeVisible();<br/>
        &#125;);
      </div>

      <h4 style={styles.guideSubSection}>4. 주요 테스트 패턴</h4>
      <ul style={styles.guideList}>
        <li><strong>페이지 이동:</strong> await page.goto(url)</li>
        <li><strong>요소 클릭:</strong> await page.getByRole('button').click()</li>
        <li><strong>입력:</strong> await page.getByLabel('검색').fill('이어폰')</li>
        <li><strong>검증:</strong> await expect(element).toBeVisible()</li>
        <li><strong>대기:</strong> await page.waitForSelector('.product-card')</li>
      </ul>

      <h4 style={styles.guideSubSection}>5. 디버깅 팁</h4>
      <ul style={styles.guideList}>
        <li><strong>Codegen:</strong> npx playwright codegen localhost:5173</li>
        <li><strong>Inspector:</strong> npx playwright test --debug</li>
        <li><strong>Trace:</strong> npx playwright show-trace trace.zip</li>
        <li><strong>Screenshot:</strong> await page.screenshot(&#123; path: 'screenshot.png' &#125;)</li>
      </ul>

      <h4 style={styles.guideSubSection}>6. Vercel 배포</h4>
      <div style={styles.codeBlock}>
        # Vercel CLI 설치<br/>
        npm install -g vercel<br/>
        <br/>
        # 배포<br/>
        vercel<br/>
        <br/>
        # 프로덕션 배포<br/>
        vercel --prod
      </div>
    </div>
  );
}

// ============================================
// 메인 HomePage 컴포넌트
// ============================================
export default function HomePage({
  products = [],
  cartCount = 0,
  onView,
  onAdd,
  onGoCart,
  onGoHome,
  onLogout,
  onLogin,
  onGoAdmin,
  isLoading = false,
  isLoggedIn = false,
  userRole = "",
}) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("default");
  const [showGuideModal, setShowGuideModal] = useState(false);

  const categories = ["전체", "전자기기", "액세서리", "생활"];

  // ============================================
  // 검색 필터링 (appliedKeyword 기준 - 검색 버튼 클릭 후 적용)
  // ============================================
  const filteredBySearch = products.filter((product) => {
    const searchLower = appliedKeyword.toLowerCase().trim();
    if (!searchLower) return true;

    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.description?.toLowerCase().includes(searchLower)
    );
  });

  // ============================================
  // 카테고리 필터링
  // ============================================
  const filteredByCategory = filteredBySearch.filter((product) => {
    if (activeCategory === "전체") return true;
    return product.category === activeCategory;
  });

  // ============================================
  // 정렬
  // ============================================
  const sortedProducts = [...filteredByCategory].sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return (a.price || 0) - (b.price || 0);
      case "price-desc":
        return (b.price || 0) - (a.price || 0);
      case "name":
        return (a.name || "").localeCompare(b.name || "", "ko-KR");
      case "discount":
        return (b.discountRate || 0) - (a.discountRate || 0);
      default:
        return 0;
    }
  });

  const handleCategoryClick = (category) => {
    setActiveCategory(category);
  };

  const handleSearchChange = (e) => {
    setSearchKeyword(e.target.value);
  };

  // 검색 버튼 클릭 또는 엔터키 시 appliedKeyword 업데이트
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedKeyword = searchKeyword.trim();
    
    if (!trimmedKeyword) {
      alert('검색어를 입력해주세요.');
      return;
    }
    
    setAppliedKeyword(trimmedKeyword);
  };

  // 장바구니 버튼 클릭 핸들러 (로그인 유도)
  const handleCartClick = () => {
    if (!isLoggedIn) {
      if (confirm('로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?')) {
        onLogin?.();
      }
      return;
    }
    onGoCart?.();
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="home-page" style={styles.page} data-testid="home-page">
        {/* Header */}
        <header
          id="home-header"
          className="home-header"
          style={styles.header}
          data-testid="home-header"
          role="banner"
        >
          <div style={styles.headerInner}>
            <div
              id="shop-logo"
              className="logo shop-logo"
              style={styles.logo}
              onClick={onGoHome}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onGoHome?.()}
              data-testid="logo"
              aria-label="ShopDemo 홈으로 이동"
            >
              ShopDemo
            </div>

            <form onSubmit={handleSearchSubmit} style={styles.searchForm} className="search-form">
              <input
                type="text"
                id="home-search"
                name="searchKeyword"
                className="search-input"
                aria-label="상품 검색"
                placeholder="상품을 검색하세요"
                value={searchKeyword}
                onChange={handleSearchChange}
                style={styles.searchInput}
                data-testid="search-input"
              />
              <button
                type="submit"
                id="home-search-btn"
                className="btn btn-secondary search-button"
                aria-label="검색"
                style={styles.searchBtn}
                data-testid="search-button"
              >
                검색
              </button>
            </form>

            <div style={styles.headerActions} className="header-actions">
              {/* 장바구니 버튼 - 로그인 유도 포함 */}
              <button
                type="button"
                id="home-cart-btn"
                name="cartButton"
                className="btn btn-cart cart-button"
                aria-label="장바구니로 이동"
                onClick={handleCartClick}
                style={styles.cartBtn}
                data-testid="cart-button"
              >
                장바구니
                {cartCount > 0 && (
                  <span
                    id="cart-badge"
                    className="cart-count badge"
                    style={styles.cartCount}
                    data-testid="cart-badge"
                    aria-live="polite"
                  >
                    {cartCount}
                  </span>
                )}
              </button>

              {/* 가이드 버튼 - 항상 표시 */}
              <button
                type="button"
                id="home-guide-btn"
                name="guideButton"
                className="btn btn-guide guide-button"
                aria-label="가이드 보기"
                onClick={() => setShowGuideModal(true)}
                style={styles.guideBtn}
                data-testid="guide-button"
              >
                📖 가이드
              </button>

              {/* 관리자 버튼 - 항상 표시 (비로그인/일반 사용자는 API 403 에러 발생) */}
              <button
                type="button"
                id="home-admin-btn"
                name="adminButton"
                className="btn btn-admin admin-button"
                aria-label="관리자 페이지"
                onClick={onGoAdmin}
                style={styles.adminBtn}
                data-testid="admin-button"
              >
                관리자
              </button>

              {/* 로그인 / 로그아웃 토글 */}
              {isLoggedIn ? (
                <button
                  type="button"
                  id="home-logout"
                  name="logoutButton"
                  className="btn btn-ghost logout-button"
                  aria-label="로그아웃"
                  onClick={onLogout}
                  style={styles.logoutBtn}
                  data-testid="logout-button"
                >
                  로그아웃
                </button>
              ) : (
                <button
                  type="button"
                  id="home-login"
                  name="loginButton"
                  className="btn btn-ghost login-button"
                  aria-label="로그인"
                  onClick={onLogin}
                  style={styles.loginBtn}
                  data-testid="login-button"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </header>

        {/* 가이드 모달 */}
        {showGuideModal && <GuideModal onClose={() => setShowGuideModal(false)} />}

        {/* Main Banner */}
        <section className="main-banner" style={styles.banner} data-testid="main-banner">
          <div style={styles.bannerContent}>
            <h1 style={styles.bannerTitle}>겨울 시즌 특가 세일</h1>
            <p style={styles.bannerSubtitle}>최대 50% 할인된 가격으로 만나보세요</p>
          </div>
        </section>

        {/* Category Filter */}
        <section className="category-section" style={styles.categorySection} data-testid="category-section">
          <div style={styles.container}>
            <div className="category-list" style={styles.categoryList}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  id={`category-${cat}`}
                  name={`category-${cat}`}
                  className={`category-btn btn ${cat === activeCategory ? "active" : ""}`}
                  aria-label={`${cat} 카테고리`}
                  aria-pressed={cat === activeCategory}
                  onClick={() => handleCategoryClick(cat)}
                  style={{
                    ...styles.categoryBtn,
                    ...(cat === activeCategory ? styles.categoryBtnActive : {}),
                  }}
                  data-testid={`category-${cat}`}
                  data-category={cat}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sort & Count Section */}
        <section className="controls-section" style={styles.controlsSection} data-testid="controls-section">
          <div style={styles.container}>
            <div style={styles.controls}>
              <span className="product-count count-display" style={styles.productCount} data-testid="product-count">
                총 {sortedProducts.length}개 상품
              </span>
              <div style={styles.sortContainer}>
                <label htmlFor="sort-select" style={styles.sortLabel}>
                  정렬:
                </label>
                <select
                  id="sort-select"
                  name="sortOption"
                  className="sort-select select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={styles.sortSelect}
                  aria-label="정렬 옵션 선택"
                  data-testid="sort-select"
                >
                  <option value="default">기본순</option>
                  <option value="price-asc">낮은 가격순</option>
                  <option value="price-desc">높은 가격순</option>
                  <option value="name">이름순</option>
                  <option value="discount">할인율순</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <main className="products-section" style={styles.productsSection} data-testid="products-section">
          <div style={styles.container}>
            {isLoading ? (
              <LoadingSpinner />
            ) : sortedProducts.length === 0 && appliedKeyword ? (
              <EmptyResults searchTerm={appliedKeyword} />
            ) : (
              <div className="products-grid" style={styles.productsGrid} data-testid="products-grid">
                {sortedProducts.map((product) => (
                  <article
                    key={product.id}
                    id={`product-${product.id}`}
                    className="product-card card"
                    style={styles.productCard}
                    data-testid={`product-card-${product.id}`}
                    data-product-id={product.id}
                  >
                    <div className="product-image-wrapper" style={styles.productImageWrapper}>
                      <img
                        src={product.imageUrl || "/placeholder.svg"}
                        alt={product.name}
                        className="product-image"
                        style={styles.productImage}
                        loading="lazy"
                      />
                      {product.discountRate > 0 && (
                        <span className="discount-badge badge" style={styles.discountBadge} aria-label={`${product.discountRate}% 할인`}>
                          {product.discountRate}% OFF
                        </span>
                      )}
                    </div>
                    <div className="product-content" style={styles.productContent}>
                      <div className="product-header" style={styles.productHeader}>
                        <span className="product-category category-badge" style={styles.productCategory}>
                          {product.category}
                        </span>
                      </div>
                      <h3 className="product-name" style={styles.productName}>
                        {product.name}
                      </h3>
                      <div className="product-price-container" style={styles.productPriceContainer}>
                        {product.originalPrice !== product.price && (
                          <span className="original-price" style={styles.originalPrice} aria-label={`원가 ${product.originalPrice.toLocaleString()}원`}>
                            {product.originalPrice.toLocaleString()}원
                          </span>
                        )}
                        <span
                          className="product-price price"
                          style={styles.productPrice}
                          aria-label={`판매가 ${(product.price || product.discountedPrice || 0).toLocaleString()}원`}
                        >
                          {(product.price || product.discountedPrice || 0).toLocaleString()}
                          원
                        </span>
                      </div>
                      <div className="product-actions action-buttons" style={styles.productActions}>
                        <button
                          type="button"
                          id={`product-${product.id}-view`}
                          name={`view-${product.id}`}
                          className="btn btn-secondary view-btn product-view-button"
                          aria-label="상품 상세"
                          onClick={() => onView?.(product.id)}
                          style={styles.viewBtn}
                          data-testid={`view-detail-btn-${product.id}`}
                          data-action="view"
                        >
                          상세
                        </button>
                        <button
                          type="button"
                          id={`product-${product.id}-add`}
                          name={`add-${product.id}`}
                          className="btn btn-primary add-btn product-add-button"
                          aria-label="장바구니 담기"
                          onClick={() => onAdd?.(product)}
                          style={styles.addBtn}
                          data-testid={`add-to-cart-btn-${product.id}`}
                        >
                          장바구니 담기
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="home-footer" style={styles.footer} data-testid="footer">
          <div style={styles.footerInner}>
            <p style={styles.footerText}>© 2026 ShopDemo. All rights reserved.</p>
            <p style={styles.footerText}>QA 자동화 연습용 데모 페이지입니다.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

// ============================================
// 스타일 객체
// ============================================
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f8f8f8",
  },
  header: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e5e5",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  headerInner: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },
  logo: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1a1a1a",
    cursor: "pointer",
    userSelect: "none",
  },
  searchForm: {
    flex: "1 1 300px",
    display: "flex",
    gap: "8px",
    minWidth: "200px",
  },
  searchInput: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.9375rem",
  },
  searchBtn: {
    padding: "10px 20px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.9375rem",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    minWidth: "80px",
    transition: "background-color 0.2s",
  },
  headerActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  cartBtn: {
    position: "relative",
    padding: "10px 20px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.9375rem",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    minWidth: "110px",
    transition: "background-color 0.2s",
  },
  cartCount: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: "600",
  },
  guideBtn: {
    padding: "8px 16px",
    backgroundColor: "#8b5cf6",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.9375rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  adminBtn: {
    padding: "8px 16px",
    backgroundColor: "#f59e0b",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.9375rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  loginBtn: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#1a1a1a",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.9375rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  logoutBtn: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: "#1a1a1a",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.9375rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  banner: {
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    padding: "60px 16px",
    textAlign: "center",
  },
  bannerContent: {
    maxWidth: "1400px",
    margin: "0 auto",
  },
  bannerTitle: {
    fontSize: "2.5rem",
    fontWeight: "700",
    marginBottom: "12px",
  },
  bannerSubtitle: {
    fontSize: "1.125rem",
    opacity: 0.9,
  },
  categorySection: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e5e5",
    padding: "16px 0",
  },
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 16px",
  },
  categoryList: {
    display: "flex",
    gap: "12px",
    overflowX: "auto",
  },
  categoryBtn: {
    padding: "8px 20px",
    backgroundColor: "#f3f4f6",
    color: "#1a1a1a",
    border: "none",
    borderRadius: "20px",
    fontSize: "0.9375rem",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  categoryBtnActive: {
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
  },
  controlsSection: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e5e5",
    padding: "16px 0",
  },
  controls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  productCount: {
    fontSize: "0.9375rem",
    color: "#6b7280",
    fontWeight: "500",
  },
  sortContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  sortLabel: {
    fontSize: "0.9375rem",
    color: "#6b7280",
  },
  sortSelect: {
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.9375rem",
    cursor: "pointer",
  },
  productsSection: {
    flex: 1,
    padding: "24px 0",
  },
  productsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "24px",
  },
  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    transition: "transform 0.2s, box-shadow 0.2s",
    cursor: "pointer",
  },
  productImageWrapper: {
    position: "relative",
    paddingTop: "100%",
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  productImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  discountBadge: {
    position: "absolute",
    top: "12px",
    right: "12px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "0.875rem",
    fontWeight: "600",
  },
  productContent: {
    padding: "16px",
  },
  productHeader: {
    marginBottom: "8px",
  },
  productCategory: {
    display: "inline-block",
    padding: "4px 8px",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: "500",
  },
  productName: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: "12px",
    minHeight: "48px",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  productPriceContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginBottom: "12px",
  },
  originalPrice: {
    fontSize: "0.875rem",
    color: "#9ca3af",
    textDecoration: "line-through",
  },
  productPrice: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1a1a1a",
  },
  productActions: {
    display: "flex",
    gap: "8px",
  },
  viewBtn: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.9375rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  addBtn: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "0.9375rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  footer: {
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    padding: "24px 16px",
    marginTop: "auto",
  },
  footerInner: {
    maxWidth: "1400px",
    margin: "0 auto",
    textAlign: "center",
  },
  footerText: {
    fontSize: "0.875rem",
    opacity: 0.8,
    marginBottom: "8px",
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    minHeight: "400px",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "16px",
    fontSize: "1rem",
    color: "#6b7280",
  },
  emptyResults: {
    textAlign: "center",
    padding: "60px 20px",
    minHeight: "400px",
  },
  emptyText: {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: "8px",
  },
  emptySubtext: {
    fontSize: "0.9375rem",
    color: "#6b7280",
  },
  
  // 모달 스타일
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    maxWidth: "900px",
    width: "100%",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #e5e5e5",
  },
  modalTitle: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1a1a1a",
    margin: 0,
  },
  modalCloseBtn: {
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#f3f4f6",
    color: "#1a1a1a",
    fontSize: "1.25rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tabContainer: {
    display: "flex",
    gap: "4px",
    padding: "16px 24px 0",
    borderBottom: "1px solid #e5e5e5",
    overflowX: "auto",
    minHeight: "60px",
    height: "60px",
    flexShrink: 0,
  },
  tabButton: {
    padding: "10px 16px",
    border: "none",
    borderBottom: "2px solid transparent",
    backgroundColor: "transparent",
    color: "#6b7280",
    fontSize: "0.9375rem",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  tabButtonActive: {
    color: "#3b82f6",
    borderBottomColor: "#3b82f6",
  },
  modalBody: {
    padding: "24px",
    overflowY: "auto",
    flex: 1,
  },
  guideContent: {
    lineHeight: 1.7,
  },
  guideSection: {
    fontSize: "1.125rem",
    fontWeight: "700",
    color: "#1a1a1a",
    marginTop: "24px",
    marginBottom: "12px",
  },
  guideSubSection: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#1a1a1a",
    marginTop: "20px",
    marginBottom: "10px",
  },
  guidePara: {
    fontSize: "0.9375rem",
    color: "#4b5563",
    marginBottom: "12px",
    lineHeight: 1.7,
  },
  guideList: {
    marginLeft: "20px",
    marginBottom: "16px",
    fontSize: "0.9375rem",
    color: "#4b5563",
    lineHeight: 1.8,
  },
  codeBlock: {
    backgroundColor: "#f3f4f6",
    padding: "16px",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontFamily: "monospace",
    color: "#1a1a1a",
    marginBottom: "16px",
    lineHeight: 1.8,
    overflowX: "auto",
  },
};
