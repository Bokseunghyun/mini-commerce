/**
 * QA 자동화 가이드 컴포넌트
 * - 프로젝트의 QA 자동화 포인트를 안내
 * - Playwright 테스트 시나리오 예시 제공
 */

export default function QAGuide({ onClose }) {
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

        <div style={styles.content}>
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
                    <td style={styles.td}>ADMIN 권한에만 표시</td>
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
                    <td style={styles.td}.review-item</td>
                    <td style={styles.td}>리뷰 표시</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3. 의도적 오류 케이스 */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>💥 의도적 오류 케이스</h3>
            
            <div style={styles.errorCase}>
              <h4 style={styles.subsectionTitle}>📍 상품 상세 진입 오류</h4>
              <ul style={styles.list}>
                <li><strong>Product ID 3:</strong> 500 에러 (서버 오류)</li>
                <li><strong>Product ID 4:</strong> 500 에러 (서버 오류)</li>
                <li><strong>Product ID 99:</strong> 404 에러 (상품 없음)</li>
              </ul>
              <p style={styles.codeBlock}>
                {`// Playwright 예시
await page.click('button[data-product-id="3"]');
await expect(page.locator('#error-message'))
  .toContainText('500');`}
              </p>
            </div>

            <div style={styles.errorCase}>
              <h4 style={styles.subsectionTitle}>🔒 권한 제어</h4>
              <ul style={styles.list}>
                <li><strong>비로그인:</strong> 관리자 버튼 미노출</li>
                <li><strong>일반 계정(test):</strong> 관리자 API 호출 시 403</li>
                <li><strong>관리자 계정(admin):</strong> 모든 기능 접근 가능</li>
              </ul>
            </div>

            <div style={styles.errorCase}>
              <h4 style={styles.subsectionTitle}>❌ 입력 검증 오류</h4>
              <ul style={styles.list}>
                <li><strong>로그인:</strong> 빈 입력, 짧은 입력, 긴 입력, 특수문자</li>
                <li><strong>검색:</strong> 100자 초과</li>
                <li><strong>리뷰:</strong> 10자 미만, 500자 초과, 별점 범위(1-5)</li>
              </ul>
            </div>
          </section>

          {/* 4. Playwright 시나리오 예시 */}
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
              <pre style={styles.code}>{`test('상품 3번 조회 시 500 에러', async ({ page }) => {
  await page.goto('/');
  
  // 상품 3번 클릭
  const product3 = page.locator('[data-product-id="3"]');
  await product3.click();
  
  // 에러 alert 확인
  page.on('dialog', async dialog => {
    expect(dialog.message()).toContain('500');
    await dialog.accept();
  });
});

test('존재하지 않는 상품 404', async ({ page }) => {
  await page.goto('/');
  
  // API 직접 호출로 검증
  const response = await page.request.get('/api/products/99');
  expect(response.status()).toBe(404);
  
  const body = await response.json();
  expect(body.message).toBe('상품 없음');
  expect(body.code).toBe('PRODUCT_NOT_FOUND');
});`}</pre>
            </div>

            <div style={styles.scenario}>
              <h4 style={styles.subsectionTitle}>시나리오 3: 권한 검증</h4>
              <pre style={styles.code}>{`test('관리자 버튼은 ADMIN에게만 표시', async ({ page }) => {
  // 일반 사용자 로그인
  await loginAs(page, 'test', '1234');
  await expect(page.locator('#home-admin-btn')).not.toBeVisible();
  
  // 로그아웃
  await page.click('#home-logout');
  
  // 관리자 로그인
  await loginAs(page, 'admin', '1234');
  await expect(page.locator('#home-admin-btn')).toBeVisible();
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
              <h4 style={styles.subsectionTitle}>시나리오 4: API 검증</h4>
              <pre style={styles.code}>{`test('재고 API - HEAD 메서드', async ({ page }) => {
  const response = await page.request.head(
    '/api/inventory?productId=1'
  );
  
  expect(response.status()).toBe(200);
  expect(response.headers()['x-stock-count']).toBeDefined();
  expect(response.headers()['x-warehouse']).toBe('Seoul');
});

test('검색 API - 파라미터 검증', async ({ page }) => {
  // 긴 검색어
  const response = await page.request.get(
    '/api/search?q=' + 'a'.repeat(101)
  );
  
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body.code).toBe('QUERY_TOO_LONG');
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

          {/* 5. 연습 가능한 QA 역량 */}
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
                  <li>의도적 500 에러</li>
                  <li>404 Not Found</li>
                  <li>403 Forbidden</li>
                  <li>400 Validation 실패</li>
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

          {/* 6. 추가 리소스 */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📖 추가 리소스</h3>
            <ul style={styles.list}>
              <li>
                <strong>API 문서:</strong> 프로젝트 루트의 <code>API_TESTING_GUIDE.md</code> 참고
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
                  <li>상품 3, 4: 500 에러</li>
                  <li>상품 99: 404 에러</li>
                  <li>검색어 100자 초과: 400 에러</li>
                </ul>
              </li>
            </ul>
          </section>
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
