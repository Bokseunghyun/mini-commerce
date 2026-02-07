/**
 * QA 자동화 가이드 컴포넌트
 * - 프로젝트의 QA 자동화 포인트를 안내
 * - Playwright 테스트 시나리오 예시 제공
 */

import { useState } from "react";

export default function QAGuide({ onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "📌 개요 & UI 포인트" },
    { id: "errors", label: "💥 오류 케이스" },
    { id: "scenarios", label: "🎬 테스트 시나리오" },
    { id: "flows", label: "🔄 시스템 흐름" },
    { id: "api", label: "🌐 API 문서" },
    { id: "skills", label: "📚 역량 & 리소스" },
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>QA 자동화 가이드</h2>
          <button
            id="qa-guide-close"
            className="btn-close"
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div style={styles.tabNav} role="tablist" aria-label="가이드 탭">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {/* ============ TAB: overview ============ */}
          {activeTab === "overview" && (
            <div role="tabpanel" id="tab-panel-overview" aria-labelledby="tab-overview">
              {/* 1. 프로젝트 개요 */}
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📌 프로젝트 개요</h3>
                <p style={styles.text}>
                  이 프로젝트는 <strong>QA 자동화 연습</strong>과 <strong>포트폴리오</strong>를 목적으로 설계된 데모 쇼핑몰입니다.
                </p>
                <ul style={styles.list}>
                  <li>기술 스택: React (Vite), JavaScript, Vercel Serverless Functions</li>
                  <li>DB 없음 (메모리 기반 데이터)</li>
                  <li>의도적인 오류 케이스 포함</li>
                </ul>
              </section>

              {/* 2. 자동화 대상 UI 포인트 */}
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🎯 자동화 대상 UI/API 포인트</h3>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>UI 식별자</h4>
                  <p style={styles.text}>모든 주요 UI 요소는 다음 중 하나 이상을 포함합니다:</p>
                  <ul style={styles.list}>
                    <li><code>id</code> 속성 (예: id="home-search", id="login-submit")</li>
                    <li><code>className</code> (예: className="search-input", "login-button")</li>
                    <li><code>aria-label</code> (접근성 + 자동화)</li>
                    <li><code>role</code> (의미론적 역할)</li>
                  </ul>
                  <p style={styles.note}>
                    ⚠️ data-testid는 사용하지 않습니다 (실제 사용자 경험과 가까운 셀렉터 연습)
                  </p>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>주요 테스트 포인트</h4>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>페이지</th>
                        <th style={styles.th}>요소</th>
                        <th style={styles.th}>ID/클래스</th>
                        <th style={styles.th}>검증 포인트</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={styles.td}>홈</td>
                        <td style={styles.td}>검색창</td>
                        <td style={styles.td}>#home-search</td>
                        <td style={styles.td}>입력, 검색 버튼 클릭</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>홈</td>
                        <td style={styles.td}>장바구니 버튼</td>
                        <td style={styles.td}>#home-cart-btn</td>
                        <td style={styles.td}>비로그인 시 로그인 유도</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>홈</td>
                        <td style={styles.td}>관리자 버튼</td>
                        <td style={styles.td}>#home-admin-btn</td>
                        <td style={styles.td}>비로그인 클릭 시 권한 오류</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>홈</td>
                        <td style={styles.td}>검색 버튼</td>
                        <td style={styles.td}>#home-search-btn</td>
                        <td style={styles.td}>빈 검색어 시 API 400 오류</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>로그인</td>
                        <td style={styles.td}>아이디 입력</td>
                        <td style={styles.td}>#login-username</td>
                        <td style={styles.td}>Validation 에러</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>로그인</td>
                        <td style={styles.td}>로그인 버튼</td>
                        <td style={styles.td}>#login-submit</td>
                        <td style={styles.td}>disabled 상태 확인</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>로그인</td>
                        <td style={styles.td}>에러 메시지</td>
                        <td style={styles.td}>#login-error</td>
                        <td style={styles.td}>잘못된 입력 시 표시</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>상품상세</td>
                        <td style={styles.td}>재고 정보</td>
                        <td style={styles.td}>#stock-info</td>
                        <td style={styles.td}>재고 API 연동</td>
                      </tr>
                      <tr>
                        <td style={styles.td}>상품상세</td>
                        <td style={styles.td}>리뷰 목록</td>
                        <td style={styles.td}>.review-item</td>
                        <td style={styles.td}>리뷰 표시</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* ============ TAB: errors ============ */}
          {activeTab === "errors" && (
            <div role="tabpanel" id="tab-panel-errors" aria-labelledby="tab-errors">
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>💥 의도적 오류 케이스</h3>

                <div style={styles.errorCase}>
                  <h4 style={styles.subsectionTitle}>📍 상품 상세 진입 오류</h4>
                  <ul style={styles.list}>
                    <li><strong>Product ID 16 (가습기 초음파 3L 대용량 LED 무드등):</strong> 404 에러 (상품 없음)</li>
                  </ul>
                  <p style={styles.codeBlock}>
                    {`// Playwright 예시\nconst response = await page.request.get('/api/products/16');\nexpect(response.status()).toBe(404);\n\nconst body = await response.json();\nexpect(body.message).toBe('상품 없음');\nexpect(body.code).toBe('PRODUCT_NOT_FOUND');`}
                  </p>
                </div>

                <div style={styles.errorCase}>
                  <h4 style={styles.subsectionTitle}>🔒 권한 제어</h4>
                  <ul style={styles.list}>
                    <li><strong>비로그인:</strong> 관리자 버튼 클릭 시 권한 오류 발생</li>
                    <li><strong>일반 계정(test):</strong> 관리자 API 호출 시 403</li>
                    <li><strong>관리자 계정(admin):</strong> 모든 기능 접근 가능</li>
                  </ul>
                </div>

                <div style={styles.errorCase}>
                  <h4 style={styles.subsectionTitle}>❌ 입력 검증 오류</h4>
                  <ul style={styles.list}>
                    <li><strong>로그인:</strong> 빈 입력, 짧은 입력, 긴 입력, 특수문자</li>
                    <li><strong>검색:</strong> 빈 검색어 클릭 시 400 (EMPTY_QUERY), 100자 초과 시 400 (QUERY_TOO_LONG)</li>
                    <li><strong>리뷰:</strong> 10자 미만, 500자 초과, 별점 범위(1-5)</li>
                  </ul>
                </div>
              </section>
            </div>
          )}

          {/* ============ TAB: scenarios ============ */}
          {activeTab === "scenarios" && (
            <div role="tabpanel" id="tab-panel-scenarios" aria-labelledby="tab-scenarios">
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🎬 Playwright 테스트 시나리오</h3>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 1: 로그인 플로우</h4>
                  <pre style={styles.code}>{`test('로그인 성공', async ({ page }) => {
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
  
  await page.fill('#login-username', 'wronguser');
  await page.fill('#login-password', 'wrongpass');
  await page.click('#login-submit');
  
  await expect(page.locator('#login-error'))
    .toContainText('아이디 또는 비밀번호 오류');
});

test('차단된 계정 로그인 차단', async ({ page }) => {
  await page.goto('/');
  await page.click('#home-login');
  
  await page.fill('#login-username', 'test2');
  await page.fill('#login-password', '1234');
  await page.click('#login-submit');
  
  await expect(page.locator('#login-error'))
    .toContainText('차단된 계정');
});`}</pre>
                </div>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 2: 상품 상세 오류 검증</h4>
                  <pre style={styles.code}>{`test('상품 16번 (가습기) 조회 시 404 에러', async ({ page }) => {
  await page.goto('/');
  
  // 상품 16번 (가습기 초음파 3L 대용량 LED 무드등) 클릭
  const product16 = page.locator('[data-product-id="16"]');
  await product16.click();
  
  // 에러 alert 확인
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('404');
    await dialog.accept();
  });
});

test('존재하지 않는 상품 404 - API 직접 호출', async ({ page }) => {
  await page.goto('/');
  
  // 상품 16번 API 직접 호출로 검증
  const response = await page.request.get('/api/products/16');
  expect(response.status()).toBe(404);
  
  const body = await response.json();
  expect(body.message).toBe('상품 없음');
  expect(body.code).toBe('PRODUCT_NOT_FOUND');
});`}</pre>
                </div>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 3: 권한 검증</h4>
                  <pre style={styles.code}>{`test('비로그인 시 관리자 버튼 클릭하면 오류 발생', async ({ page }) => {
  await page.goto('/');
  
  // 관리자 버튼은 항상 표시됨
  await expect(page.locator('#home-admin-btn')).toBeVisible();
  
  // 클릭 시 권한 오류 alert 발생
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('관리자 권한');
    await dialog.accept();
  });
  await page.click('#home-admin-btn');
});

test('일반 사용자는 관리자 API 접근 불가', async ({ page }) => {
  await loginAs(page, 'test', '1234');
  
  const token = await page.evaluate(() => 
    localStorage.getItem('token')
  );
  
  const response = await page.request.get('/api/admin', {
    headers: { Authorization: \`Bearer \${token}\` }
  });
  
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.message).toContain('관리자 권한');
});`}</pre>
                </div>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 4: 검색 오류 검증</h4>
                  <pre style={styles.code}>{`test('빈 검색어로 검색 버튼 클릭 시 400 오류', async ({ page }) => {
  await page.goto('/');
  
  // 검색어 비어있는 상태에서 검색 버튼 클릭
  await page.click('#home-search-btn');
  
  // 에러 alert 확인
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('400');
    expect(dialog.message()).toContain('검색어를 입력해주세요');
    await dialog.accept();
  });
});

test('검색 API - 빈 검색어 파라미터', async ({ page }) => {
  const response = await page.request.get('/api/search?q=');
  
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.code).toBe('EMPTY_QUERY');
});

test('검색 API - 긴 검색어', async ({ page }) => {
  const response = await page.request.get(
    '/api/search?q=' + 'a'.repeat(101)
  );
  
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.code).toBe('QUERY_TOO_LONG');
});`}</pre>
                </div>

                <div style={styles.scenario}>
                  <h4 style={styles.subsectionTitle}>시나리오 5: API 검증</h4>
                  <pre style={styles.code}>{`test('재고 API - HEAD 메서드', async ({ page }) => {
  const response = await page.request.head(
    '/api/inventory?productId=1'
  );
  
  expect(response.status()).toBe(200);
  expect(response.headers()['x-stock-count']).toBeDefined();
  expect(response.headers()['x-warehouse']).toBe('Seoul');
});

test('리뷰 작성 - 입력 검증', async ({ page }) => {
  await loginAs(page, 'test', '1234');
  const token = await page.evaluate(() => 
    localStorage.getItem('token')
  );
  
  // 너무 짧은 리뷰
  const response = await page.request.post('/api/reviews', {
    headers: { Authorization: \`Bearer \${token}\` },
    data: {
      productId: 1,
      rating: 5,
      comment: '좋아요' // 10자 미만
    }
  });
  
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.code).toBe('COMMENT_TOO_SHORT');
});`}</pre>
                </div>
              </section>
            </div>
          )}

          {/* ============ TAB: flows ============ */}
          {activeTab === "flows" && (
            <div role="tabpanel" id="tab-panel-flows" aria-labelledby="tab-flows">
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🔄 시스템 흐름 테스트 (UI + API 통합)</h3>
                <p style={styles.text}>
                  실제 사용자 시나리오를 따라 UI 검증과 API 검증을 결합한 End-to-End 테스트입니다.
                </p>
              </section>

              {/* 흐름 1: 회원가입 → 로그인 → 상품 주문 */}
              <section style={styles.section}>
                <h4 style={styles.subsectionTitle}>🛒 Flow 1: 비회원 → 로그인 → 상품 주문</h4>
                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>단계별 검증</h5>
                  <ol style={{ ...styles.list, paddingLeft: '20px' }}>
                    <li>
                      <strong>홈페이지 진입</strong>
                      <ul style={styles.list}>
                        <li>UI: 상품 카드 표시 확인 (className="product-card")</li>
                        <li>UI: 로그인 버튼 표시 확인 (id="login-button")</li>
                      </ul>
                    </li>
                    <li>
                      <strong>로그인 시도</strong>
                      <ul style={styles.list}>
                        <li>UI: 로그인 폼 표시 (id="login-form")</li>
                        <li>UI: username, password 입력</li>
                        <li>API: POST /api/login → 200 응답 확인</li>
                        <li>API: token 포함 여부 확인</li>
                        <li>UI: localStorage에 token 저장 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>상품 상세 페이지 진입</strong>
                      <ul style={styles.list}>
                        <li>UI: 상품 카드 클릭 (data-testid="product-card-1")</li>
                        <li>API: GET /api/products/1 → 200 응답</li>
                        <li>UI: 상품 정보 표시 확인</li>
                        <li>API: GET /api/inventory?productId=1 → 재고 정보 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>장바구니 담기</strong>
                      <ul style={styles.list}>
                        <li>UI: 수량 조절 (className="quantity-btn")</li>
                        <li>UI: "장바구니 담기" 버튼 클릭</li>
                        <li>UI: alert 확인 ("장바구니에 상품이 추가되었습니다")</li>
                        <li>UI: localStorage cart 업데이트 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>주문하기</strong>
                      <ul style={styles.list}>
                        <li>UI: 장바구니 페이지 이동</li>
                        <li>UI: "주문하기" 버튼 클릭</li>
                        <li>API: POST /api/user-actions (action: "order") → 재고 검증</li>
                        <li>API: 재고 부족 시 409 에러 확인</li>
                        <li>API: 재고 충분 시 200 응답 확인</li>
                        <li>UI: 주문 완료 페이지 표시</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Playwright 코드 예시</h5>
                  <pre style={styles.code}>{`test('전체 주문 흐름 (UI + API)', async ({ page }) => {
  // 1. 홈페이지 진입
  await page.goto('/');
  await expect(page.locator('.product-card').first()).toBeVisible();
  
  // 2. 로그인
  await page.click('#login-button');
  await page.fill('#username', 'test');
  await page.fill('#password', 'test1234');
  
  const [loginResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/login')),
    page.click('#login-submit')
  ]);
  
  expect(loginResponse.status()).toBe(200);
  const loginData = await loginResponse.json();
  expect(loginData.token).toBeTruthy();
  
  // 3. 상품 상세 진입
  const [productResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/products/1')),
    page.click('[data-testid="product-card-1"]')
  ]);
  
  expect(productResponse.status()).toBe(200);
  
  // 4. 재고 확인
  const inventoryResponse = await page.waitForResponse(
    res => res.url().includes('/api/inventory')
  );
  const inventory = await inventoryResponse.json();
  
  // 5. 장바구니 담기
  await page.click('.btn-add-to-cart');
  await expect(page.locator('text=장바구니에 상품이 추가')).toBeVisible();
  
  // 6. 주문
  await page.click('[aria-label*="장바구니"]');
  
  const [orderResponse] = await Promise.all([
    page.waitForResponse(res => 
      res.url().includes('/api/user-actions') && 
      res.request().method() === 'POST'
    ),
    page.click('text=주문하기')
  ]);
  
  const orderData = await orderResponse.json();
  
  if (inventory.stock > 0) {
    expect(orderResponse.status()).toBe(200);
    await expect(page.locator('text=주문 완료')).toBeVisible();
  } else {
    expect(orderResponse.status()).toBe(409);
    expect(orderData.code).toBe('INSUFFICIENT_STOCK');
  }
});`}</pre>
                </div>
              </section>

              {/* 흐름 2: 리뷰 작성 → 수정 → 삭제 */}
              <section style={styles.section}>
                <h4 style={styles.subsectionTitle}>✍️ Flow 2: 리뷰 작성 → 수정 → 삭제</h4>
                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>단계별 검증</h5>
                  <ol style={{ ...styles.list, paddingLeft: '20px' }}>
                    <li>
                      <strong>로그인 상태로 상품 상세 페이지 진입</strong>
                      <ul style={styles.list}>
                        <li>API: GET /api/reviews?productId=1 → 기존 리뷰 목록 확인</li>
                        <li>UI: "리뷰 작성" 버튼 표시 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>리뷰 작성</strong>
                      <ul style={styles.list}>
                        <li>UI: "리뷰 작성" 버튼 클릭</li>
                        <li>UI: 별점 선택 (1-5)</li>
                        <li>UI: 리뷰 내용 입력 (최소 10자)</li>
                        <li>API: POST /api/reviews → 201 응답 확인</li>
                        <li>API: 중복 작성 시 409 에러 확인</li>
                        <li>UI: 리뷰 목록 새로고침 확인</li>
                      </ul>
                    </li>
                    <li>
                      <strong>리뷰 수정</strong>
                      <ul style={styles.list}>
                        <li>UI: 본인 리뷰에 "수정" 버튼 표시 확인</li>
                        <li>UI: "수정" 버튼 클릭 → 수정 폼 표시</li>
                        <li>UI: 별점/내용 변경</li>
                        <li>API: PATCH /api/reviews → 200 응답 확인</li>
                        <li>API: 타인 리뷰 수정 시 403 에러 확인</li>
                        <li>UI: 수정된 내용 즉시 반영</li>
                      </ul>
                    </li>
                    <li>
                      <strong>리뷰 삭제</strong>
                      <ul style={styles.list}>
                        <li>UI: "삭제" 버튼 클릭 → confirm 대화상자</li>
                        <li>API: DELETE /api/reviews → 200 응답 확인</li>
                        <li>API: 타인 리뷰 삭제 시 403 에러 확인</li>
                        <li>UI: 리뷰 목록에서 제거 확인</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Playwright 코드 예시</h5>
                  <pre style={styles.code}>{`test('리뷰 CRUD 흐름', async ({ page }) => {
  // 로그인
  await page.goto('/');
  await page.click('#login-button');
  await page.fill('#username', 'test');
  await page.fill('#password', 'test1234');
  await page.click('#login-submit');
  
  // 상품 상세 진입
  await page.click('[data-testid="product-card-1"]');
  await page.waitForSelector('#reviews-section');
  
  // 리뷰 작성
  await page.click('text=리뷰 작성');
  await page.click('button:has-text("⭐"):nth-child(5)'); // 5점
  await page.fill('textarea', '정말 좋은 상품입니다. 강력 추천합니다!');
  
  const [createResponse] = await Promise.all([
    page.waitForResponse(res => 
      res.url().includes('/api/reviews') && 
      res.request().method() === 'POST'
    ),
    page.click('button:has-text("등록")')
  ]);
  
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  const reviewId = created.review.id;
  
  // 리뷰 표시 확인
  await expect(page.locator(\`.review-item:has-text("정말 좋은")\`)).toBeVisible();
  
  // 리뷰 수정
  await page.locator(\`.review-item:has-text("정말 좋은")\`)
    .locator('button:has-text("수정")').click();
  await page.fill('textarea', '수정된 리뷰입니다. 역시 좋은 상품이네요!');
  
  const [updateResponse] = await Promise.all([
    page.waitForResponse(res => 
      res.url().includes('/api/reviews') && 
      res.request().method() === 'PATCH'
    ),
    page.click('button:has-text("저장")')
  ]);
  
  expect(updateResponse.status()).toBe(200);
  await expect(page.locator('text=수정된 리뷰')).toBeVisible();
  
  // 리뷰 삭제
  page.on('dialog', dialog => dialog.accept());
  
  const [deleteResponse] = await Promise.all([
    page.waitForResponse(res => 
      res.url().includes('/api/reviews') && 
      res.request().method() === 'DELETE'
    ),
    page.locator(\`.review-item:has-text("수정된")\`)
      .locator('button:has-text("삭제")').click()
  ]);
  
  expect(deleteResponse.status()).toBe(200);
  await expect(page.locator('text=수정된 리뷰')).not.toBeVisible();
});`}</pre>
                </div>
              </section>

              {/* 흐름 3: 권한 검증 흐름 */}
              <section style={styles.section}>
                <h4 style={styles.subsectionTitle}>🔐 Flow 3: 권한 검증 (비로그인 → 일반 → 관리자)</h4>
                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>단계별 검증</h5>
                  <ol style={{ ...styles.list, paddingLeft: '20px' }}>
                    <li>
                      <strong>비로그인 상태에서 관리자 페이지 접근</strong>
                      <ul style={styles.list}>
                        <li>UI: "관리자" 버튼 클릭</li>
                        <li>API: GET /api/admin → 401 에러 (AUTH_NO_TOKEN)</li>
                        <li>UI: alert 표시 ("토큰이 없습니다")</li>
                        <li>UI: 홈으로 리다이렉트</li>
                      </ul>
                    </li>
                    <li>
                      <strong>일반 계정으로 관리자 페이지 접근</strong>
                      <ul style={styles.list}>
                        <li>UI: 일반 계정(test/test1234)으로 로그인</li>
                        <li>UI: "관리자" 버튼 클릭</li>
                        <li>API: GET /api/admin → 403 에러 (AUTH_FORBIDDEN)</li>
                        <li>UI: alert 표시 ("관리자 권한이 필요합니다")</li>
                        <li>UI: 홈으로 리다이렉트</li>
                      </ul>
                    </li>
                    <li>
                      <strong>관리자 계정으로 접근</strong>
                      <ul style={styles.list}>
                        <li>UI: 관리자 계정(admin/admin1234)으로 로그인</li>
                        <li>UI: "관리자" 버튼 클릭</li>
                        <li>API: GET /api/admin → 200 응답</li>
                        <li>UI: 관리자 페이지 표시 (상품 목록)</li>
                        <li>API: POST /api/admin → 상품 추가</li>
                        <li>API: PUT /api/admin → 상품 수정</li>
                        <li>API: DELETE /api/admin → 상품 삭제</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div style={styles.subsection}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Playwright 코드 예시</h5>
                  <pre style={styles.code}>{`test('권한 검증 흐름', async ({ page }) => {
  // 1. 비로그인 상태
  await page.goto('/');
  
  page.on('dialog', dialog => {
    expect(dialog.message()).toContain('토큰이 없습니다');
    dialog.accept();
  });
  
  const [noAuthResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('button:has-text("관리자")')
  ]);
  
  expect(noAuthResponse.status()).toBe(401);
  const noAuthData = await noAuthResponse.json();
  expect(noAuthData.code).toBe('AUTH_NO_TOKEN');
  
  // 2. 일반 계정
  await page.click('#login-button');
  await page.fill('#username', 'test');
  await page.fill('#password', 'test1234');
  await page.click('#login-submit');
  
  page.on('dialog', dialog => {
    expect(dialog.message()).toContain('관리자 권한');
    dialog.accept();
  });
  
  const [forbiddenResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('button:has-text("관리자")')
  ]);
  
  expect(forbiddenResponse.status()).toBe(403);
  const forbiddenData = await forbiddenResponse.json();
  expect(forbiddenData.code).toBe('AUTH_FORBIDDEN');
  
  // 3. 관리자 계정
  await page.click('button:has-text("로그아웃")');
  await page.click('#login-button');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin1234');
  await page.click('#login-submit');
  
  const [adminResponse] = await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/admin')),
    page.click('button:has-text("관리자")')
  ]);
  
  expect(adminResponse.status()).toBe(200);
  await expect(page.locator('text=상품 관리')).toBeVisible();
});`}</pre>
                </div>
              </section>
            </div>
          )}

          {/* ============ TAB: api ============ */}
          {activeTab === "api" && (
            <div role="tabpanel" id="tab-panel-api" aria-labelledby="tab-api">
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🌐 API 목록 및 개요</h3>

                <h4 style={styles.subsectionTitle}>기존 API (CRUD 중심)</h4>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>API</th>
                      <th style={styles.th}>Method</th>
                      <th style={styles.th}>인증</th>
                      <th style={styles.th}>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={styles.td}>/api/login</td><td style={styles.td}>POST</td><td style={styles.td}>❌</td><td style={styles.td}>로그인</td></tr>
                    <tr><td style={styles.td}>/api/products</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>상품 목록 조회</td></tr>
                    <tr><td style={styles.td}>/api/products/:id</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>상품 상세 조회</td></tr>
                    <tr><td style={styles.td}>/api/admin</td><td style={styles.td}>GET</td><td style={styles.td}>✅ (ADMIN)</td><td style={styles.td}>상품 관리 - 조회</td></tr>
                    <tr><td style={styles.td}>/api/admin</td><td style={styles.td}>POST</td><td style={styles.td}>✅ (ADMIN)</td><td style={styles.td}>상품 관리 - 추가</td></tr>
                    <tr><td style={styles.td}>/api/admin</td><td style={styles.td}>PUT</td><td style={styles.td}>✅ (ADMIN)</td><td style={styles.td}>상품 관리 - 수정</td></tr>
                    <tr><td style={styles.td}>/api/admin</td><td style={styles.td}>DELETE</td><td style={styles.td}>✅ (ADMIN)</td><td style={styles.td}>상품 관리 - 삭제</td></tr>
                  </tbody>
                </table>

                <h4 style={{ ...styles.subsectionTitle, marginTop: '24px' }}>검증 연습용 API</h4>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>API</th>
                      <th style={styles.th}>Method</th>
                      <th style={styles.th}>인증</th>
                      <th style={styles.th}>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td style={styles.td}>/api/search</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>상품 검색 (쿼리 파라미터)</td></tr>
                    <tr><td style={styles.td}>/api/reviews</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>리뷰 조회</td></tr>
                    <tr><td style={styles.td}>/api/reviews</td><td style={styles.td}>POST</td><td style={styles.td}>✅</td><td style={styles.td}>리뷰 작성</td></tr>
                    <tr><td style={styles.td}>/api/reviews</td><td style={styles.td}>PATCH</td><td style={styles.td}>✅</td><td style={styles.td}>리뷰 수정</td></tr>
                    <tr><td style={styles.td}>/api/reviews</td><td style={styles.td}>DELETE</td><td style={styles.td}>✅</td><td style={styles.td}>리뷰 삭제</td></tr>
                    <tr><td style={styles.td}>/api/inventory</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>재고 조회</td></tr>
                    <tr><td style={styles.td}>/api/inventory</td><td style={styles.td}>HEAD</td><td style={styles.td}>❌</td><td style={styles.td}>재고 존재 확인 (헤더만)</td></tr>
                    <tr><td style={styles.td}>/api/status-codes</td><td style={styles.td}>GET</td><td style={styles.td}>❌</td><td style={styles.td}>상태 코드 연습</td></tr>
                  </tbody>
                </table>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📋 HTTP 메서드별 테스트 포인트</h3>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>GET - 조회</h4>
                  <pre style={styles.code}>{`// 1. 기본 목록 조회
GET /api/products → 200, { products: [...] }

// 2. 단일 조회
GET /api/products/1 → 200, { id: 1, name: "...", ... }

// 3. 존재하지 않는 리소스 (가습기 ID 16)
GET /api/products/16 → 404, { code: "PRODUCT_NOT_FOUND" }

// 4. 검색 쿼리 파라미터
GET /api/search?q=블루투스 → 200, { query, count, products }

// 5. 복합 필터
GET /api/search?category=전자기기&minPrice=50000&sort=price-asc → 200`}</pre>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>POST - 생성</h4>
                  <pre style={styles.code}>{`// 리뷰 작성 (인증 필수)
POST /api/reviews
  Headers: { Authorization: "Bearer <token>" }
  Body: { productId: 1, rating: 5, comment: "정말 좋은 상품입니다! 강력 추천합니다." }
  → 201, { review: { id, rating, username, ... } }

// 필수 필드 누락 → 400 (RATING_REQUIRED)
// 별점 범위 초과 (1-5) → 400 (INVALID_RATING)
// 리뷰 10자 미만 → 400 (COMMENT_TOO_SHORT)
// 중복 리뷰 → 409 (REVIEW_ALREADY_EXISTS)
// 토큰 없음 → 401 (AUTH_NO_TOKEN)`}</pre>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>PATCH - 부분 수정</h4>
                  <pre style={styles.code}>{`// 리뷰 수정 (인증 필수, 본인 리뷰만)
PATCH /api/reviews
  Headers: { Authorization: "Bearer <token>" }
  Body: { id: 1, rating: 4 }
  → 200, { review: { ... } }

// 타인 리뷰 수정 시도 → 403`}</pre>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>HEAD - 메타데이터만</h4>
                  <pre style={styles.code}>{`// 재고 존재 확인 (응답 본문 없음, 헤더만 반환)
HEAD /api/inventory?productId=1
  → 200
  Response Headers:
    x-product-id: "1"
    x-stock-count: "<재고수>"
    x-stock-status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
    x-warehouse: "Seoul"`}</pre>
                </div>

                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>검색 API 검증 포인트</h4>
                  <pre style={styles.code}>{`// 빈 검색어 → 400 (EMPTY_QUERY)
GET /api/search?q=  →  400, { code: "EMPTY_QUERY", message: "검색어를 입력해주세요" }

// 검색어 100자 초과 → 400 (QUERY_TOO_LONG)
GET /api/search?q=aaa...(101자)  →  400, { code: "QUERY_TOO_LONG" }

// 잘못된 정렬 옵션 → 400 (INVALID_SORT_OPTION)
GET /api/search?sort=invalid  →  400, { code: "INVALID_SORT_OPTION" }

// 가격 범위 역전 → 400 (INVALID_PRICE_RANGE)
GET /api/search?minPrice=200000&maxPrice=50000  →  400`}</pre>
                </div>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🔐 인증/권한 검증</h3>
                <pre style={styles.code}>{`// 토큰 없이 보호된 API 호출 → 401 (AUTH_NO_TOKEN)
POST /api/reviews (Authorization 헤더 없음) → 401

// 잘못된 토큰 → 401 (AUTH_INVALID_TOKEN)
POST /api/reviews (Authorization: Bearer invalid-token) → 401

// 권한 부족 (일반 사용자 → 관리자 API) → 403 (AUTH_FORBIDDEN)
GET /api/admin (일반 사용자 토큰) → 403`}</pre>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📊 상태 코드 연습 API</h3>
                <p style={styles.text}><code>/api/status-codes?code=N</code> 으로 원하는 상태 코드를 직접 트리거 가능합니다.</p>
                <pre style={styles.code}>{`GET /api/status-codes?code=200 → 200
GET /api/status-codes?code=404 → 404
GET /api/status-codes?code=429 → 429 (Retry-After 헤더 포함)
GET /api/status-codes?code=500 → 500`}</pre>
              </section>
            </div>
          )}

          {/* ============ TAB: skills ============ */}
          {activeTab === "skills" && (
            <div role="tabpanel" id="tab-panel-skills" aria-labelledby="tab-skills">
              {/* 연습 가능한 QA 역량 */}
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📚 연습 가능한 QA 자동화 역량</h3>

                <div style={styles.skillGrid}>
                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>🎯 셀렉터 전략</h4>
                    <ul style={styles.list}>
                      <li>ID, class, aria-label 활용</li>
                      <li>의미론적 셀렉터 우선</li>
                      <li>data-* 속성 지양</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>🔍 상태 검증</h4>
                    <ul style={styles.list}>
                      <li>로딩 상태 (isLoading)</li>
                      <li>비활성 상태 (disabled)</li>
                      <li>에러 표시 (role="alert")</li>
                      <li>조건부 렌더링</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>🌐 API 테스팅</h4>
                    <ul style={styles.list}>
                      <li>HTTP status code 검증</li>
                      <li>응답 메시지/코드 확인</li>
                      <li>다양한 HTTP 메서드</li>
                      <li>커스텀 헤더 검증</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>🔐 권한 테스트</h4>
                    <ul style={styles.list}>
                      <li>인증/인가 플로우</li>
                      <li>토큰 기반 인증</li>
                      <li>역할별 접근 제어</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>❌ 에러 시나리오</h4>
                    <ul style={styles.list}>
                      <li>404 Not Found (상품 16)</li>
                      <li>403 Forbidden</li>
                      <li>400 Validation 실패</li>
                      <li>빈 검색어 오류</li>
                    </ul>
                  </div>

                  <div style={styles.skillCard}>
                    <h4 style={styles.skillTitle}>📝 폼 검증</h4>
                    <ul style={styles.list}>
                      <li>실시간 validation</li>
                      <li>필드별 에러 메시지</li>
                      <li>disabled 조건 검증</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 추가 리소스 */}
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📖 추가 리소스</h3>
                <ul style={styles.list}>
                  <li>
                    <strong>API 문서:</strong> 프로젝트 루트의 <code>API_TESTING_GUIDE.md</code> 참고 (위 "API 문서" 탭에 요약 포함)
                  </li>
                  <li>
                    <strong>테스트 계정:</strong>
                    <ul style={styles.nestedList}>
                      <li>일반: test / 1234</li>
                      <li>관리자: admin / 1234</li>
                      <li>차단: test2 / 1234</li>
                    </ul>
                  </li>
                  <li>
                    <strong>에러 케이스:</strong>
                    <ul style={styles.nestedList}>
                      <li>상품 16 (가습기 초음파 3L 대용량 LED 무드등): 404 에러</li>
                      <li>검색어 빈 문자열: 400 오류 (EMPTY_QUERY)</li>
                      <li>검색어 100자 초과: 400 오류 (QUERY_TOO_LONG)</li>
                      <li>비로그인 관리자 버튼 클릭: 권한 오류</li>
                    </ul>
                  </li>
                </ul>
              </section>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button
            id="qa-guide-close-bottom"
            className="btn btn-primary"
            onClick={onClose}
            style={styles.closeButton}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  tabNav: {
    display: 'flex',
    gap: '4px',
    padding: '12px 32px',
    borderBottom: '1px solid #e5e7eb',
    overflowX: 'auto',
    flexShrink: 0,
  },
  tabBtn: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    color: '#1a1a1a',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
    marginTop: 0,
  },
  subsection: {
    marginBottom: '20px',
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    marginTop: 0,
  },
  text: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: 1.6,
    margin: '0 0 12px 0',
  },
  list: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.8,
    paddingLeft: '24px',
    margin: '8px 0',
  },
  nestedList: {
    paddingLeft: '20px',
    marginTop: '4px',
  },
  note: {
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '8px',
    borderLeft: '4px solid #fbbf24',
    margin: '12px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    marginTop: '12px',
  },
  th: {
    backgroundColor: '#f3f4f6',
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#1f2937',
    borderBottom: '2px solid #e5e7eb',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    color: '#4b5563',
  },
  errorCase: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  codeBlock: {
    backgroundColor: '#1f2937',
    color: '#d1d5db',
    padding: '12px 16px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: 1.6,
    overflowX: 'auto',
    margin: '12px 0',
    whiteSpace: 'pre',
  },
  scenario: {
    marginBottom: '24px',
  },
  code: {
    backgroundColor: '#1f2937',
    color: '#d1d5db',
    padding: '16px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '13px',
    lineHeight: 1.6,
    overflowX: 'auto',
    margin: '12px 0',
  },
  skillGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginTop: '16px',
  },
  skillCard: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
  },
  skillTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
    marginTop: 0,
  },
  footer: {
    padding: '20px 32px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'center',
  },
  closeButton: {
    padding: '12px 32px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};