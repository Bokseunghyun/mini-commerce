# 선택자 연습 가이드 - Mini Commerce

## 📚 목차
1. [기본 선택자](#기본-선택자)
2. [공통 클래스 선택자](#공통-클래스-선택자)
3. [Data 속성 선택자](#data-속성-선택자)
4. [고급 선택자](#고급-선택자)
5. [실전 연습 예제](#실전-연습-예제)

---

## 기본 선택자

### ID 선택자
각 요소마다 고유한 ID가 부여되어 있습니다.

```javascript
// Playwright/Cypress
await page.locator('#home-search').fill('블루투스');
await page.locator('#shop-logo').click();
await page.locator('#cart-badge').textContent(); // "2"

// Selenium (JavaScript)
await driver.findElement(By.id('home-search'));

// Selenium (Python)
driver.find_element(By.ID, 'home-search')
```

**예시:**
- `#shop-logo` - 로고
- `#home-search` - 검색 입력창
- `#cart-badge` - 장바구니 카운트
- `#category-전체` - 전체 카테고리 버튼
- `#product-1` - ID가 1인 상품 카드
- `#product-1-view` - ID가 1인 상품의 상세보기 버튼
- `#product-1-add` - ID가 1인 상품의 장바구니 버튼

---

## 공통 클래스 선택자

### 모든 상품 선택하기
상품들은 공통 클래스를 사용하여 일괄 선택 가능합니다.

```javascript
// 모든 상품 카드
await page.locator('.product-card').count(); // 18
await page.locator('.product-item').count(); // 18

// 첫 번째 상품
await page.locator('.product-card').first();

// n번째 상품
await page.locator('.product-card').nth(2); // 3번째 (0부터 시작)

// 마지막 상품
await page.locator('.product-card').last();
```

### 버튼 선택하기
```javascript
// 모든 버튼
await page.locator('.btn').count();

// 모든 "장바구니 담기" 버튼
await page.locator('.product-add-button').count(); // 18

// 모든 "상세보기" 버튼
await page.locator('.product-view-button').count(); // 18

// 첫 번째 상품의 장바구니 버튼
await page.locator('.product-add-button').first().click();
```

### 가격 요소 선택하기
```javascript
// 모든 판매가
await page.locator('.sale-price').count();
await page.locator('.price-current').count();

// 모든 정가 (할인 전)
await page.locator('.original-price').count();
await page.locator('.price-before').count();
```

---

## Data 속성 선택자

### data-testid (가장 권장되는 방법)
```javascript
// Playwright
await page.getByTestId('search-input').fill('스마트워치');
await page.getByTestId('search-button').click();
await page.getByTestId('cart-button').click();

// Cypress
cy.get('[data-testid="search-input"]').type('스마트워치');
cy.get('[data-testid="search-button"]').click();

// Selenium
driver.find_element(By.CSS_SELECTOR, '[data-testid="search-input"]')
```

**주요 data-testid:**
- `search-input` - 검색 입력창
- `search-button` - 검색 버튼
- `cart-button` - 장바구니 버튼
- `cart-badge` - 장바구니 카운트
- `category-전체` - 전체 카테고리
- `category-전자기기` - 전자기기 카테고리
- `sort-select` - 정렬 셀렉트
- `product-card-{id}` - 상품 카드
- `view-detail-btn-{id}` - 상세보기 버튼
- `login-button` - 로그인 버튼
- `logout-button` - 로그아웃 버튼

### data-product-id
특정 ID의 상품만 선택할 때 유용합니다.

```javascript
// ID가 3인 상품 선택
await page.locator('[data-product-id="3"]');

// ID가 3인 상품의 이름
await page.locator('[data-product-id="3"] .product-name').textContent();

// ID가 3인 상품을 장바구니에 담기
await page.locator('[data-product-id="3"] .product-add-button').click();
```

### data-product-category
카테고리별로 상품을 필터링할 때 유용합니다.

```javascript
// 전자기기 카테고리 상품만
await page.locator('[data-product-category="전자기기"]').count(); // 6

// 액세서리 카테고리의 첫 번째 상품
await page.locator('[data-product-category="액세서리"]').first();

// 생활 카테고리 상품들의 이름 수집
const names = await page.locator('[data-product-category="생활"] .product-name')
  .allTextContents();
```

### data-action
버튼의 액션으로 선택합니다.

```javascript
// 모든 "장바구니 담기" 액션 버튼
await page.locator('[data-action="add-to-cart"]').count(); // 18

// 모든 "상세보기" 액션 버튼
await page.locator('[data-action="view"]').count(); // 18

// 첫 번째 상품의 장바구니 담기
await page.locator('[data-action="add-to-cart"]').first().click();
```

### data-product-index
인덱스로 상품을 선택합니다.

```javascript
// 첫 번째 상품 (index=0)
await page.locator('[data-product-index="0"]');

// 세 번째 상품 (index=2)
await page.locator('[data-product-index="2"]');
```

---

## 고급 선택자

### CSS 조합 선택자

```javascript
// 할인 배지가 있는 상품만
await page.locator('.product-card:has(.discount-badge)').count();

// 활성화된 카테고리 버튼
await page.locator('.category-button.active').textContent();

// 첫 번째 상품의 가격
await page.locator('.product-item:first-child .sale-price').textContent();

// 홀수 번째 상품들 (1, 3, 5, ...)
await page.locator('.product-item:nth-child(odd)').count();

// 짝수 번째 상품들 (2, 4, 6, ...)
await page.locator('.product-item:nth-child(even)').count();
```

### XPath

```javascript
// 특정 텍스트를 포함한 버튼
await page.locator('xpath=//button[contains(text(), "장바구니")]').first();

// 특정 상품의 가격
await page.locator('xpath=//article[@data-product-id="1"]//span[@class="sale-price"]');

// 이름에 "블루투스"가 포함된 상품
await page.locator('xpath=//h3[contains(@class, "product-name") and contains(text(), "블루투스")]');
```

### 복잡한 조합

```javascript
// 전자기기 카테고리 중 할인율이 있는 상품
await page.locator('[data-product-category="전자기기"]:has(.discount-badge)');

// 가격이 10만원 이상인 상품 (동적 필터링)
const products = await page.locator('.product-item').all();
for (const product of products) {
  const priceText = await product.locator('.sale-price').textContent();
  const price = parseInt(priceText.replace(/[^0-9]/g, ''));
  if (price >= 100000) {
    console.log(await product.locator('.product-name').textContent());
  }
}
```

---

## 실전 연습 예제

### 예제 1: 검색 기능 테스트

```javascript
// Playwright
test('상품 검색이 정상 작동한다', async ({ page }) => {
  await page.goto('/');
  
  // 방법 1: data-testid 사용
  await page.getByTestId('search-input').fill('블루투스');
  await page.getByTestId('search-button').click();
  
  // 방법 2: ID 사용
  await page.locator('#home-search').fill('블루투스');
  await page.locator('#home-search-btn').click();
  
  // 방법 3: name 속성 사용
  await page.locator('[name="searchKeyword"]').fill('블루투스');
  await page.locator('.search-button').click();
  
  // 결과 확인
  const resultCount = await page.locator('.product-card').count();
  expect(resultCount).toBeGreaterThan(0);
});
```

### 예제 2: 카테고리 필터링 테스트

```javascript
test('카테고리 필터링이 정상 작동한다', async ({ page }) => {
  await page.goto('/');
  
  // 전자기기 클릭
  await page.locator('#category-전자기기').click();
  
  // 방법 2: data-testid
  await page.getByTestId('category-전자기기').click();
  
  // 방법 3: data-category
  await page.locator('[data-category="전자기기"]').click();
  
  // 확인: 전자기기만 표시되는지
  const products = await page.locator('[data-product-category]').all();
  for (const product of products) {
    const category = await product.getAttribute('data-product-category');
    expect(category).toBe('전자기기');
  }
  
  // 또는 간단하게
  const count = await page.locator('[data-product-category="전자기기"]').count();
  expect(count).toBe(6);
});
```

### 예제 3: 장바구니 담기 테스트

```javascript
test('상품을 장바구니에 담을 수 있다', async ({ page }) => {
  await page.goto('/');
  
  // 로그인
  await page.getByTestId('login-button').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('test1234');
  await page.getByTestId('login-submit').click();
  
  // 방법 1: 첫 번째 상품 담기 (공통 클래스)
  await page.locator('.product-add-button').first().click();
  
  // 방법 2: 특정 ID 상품 담기
  await page.locator('#product-2-add').click();
  
  // 방법 3: data-product-id로 담기
  await page.locator('[data-product-id="3"] .product-add-button').click();
  
  // 방법 4: data-action으로 담기
  await page.locator('[data-action="add-to-cart"]').nth(3).click();
  
  // 장바구니 카운트 확인
  const count = await page.locator('#cart-badge').textContent();
  expect(count).toBe('4');
});
```

### 예제 4: 가격 정렬 테스트

```javascript
test('가격 정렬이 정상 작동한다', async ({ page }) => {
  await page.goto('/');
  
  // 낮은 가격순 정렬
  await page.locator('#sort-select').selectOption('price-asc');
  
  // 또는
  await page.locator('[name="sortBy"]').selectOption('price-asc');
  
  // 가격 수집 및 검증
  const prices = await page.locator('.sale-price').allTextContents();
  const numericPrices = prices.map(p => 
    parseInt(p.replace(/[^0-9]/g, ''))
  );
  
  // 오름차순 확인
  for (let i = 0; i < numericPrices.length - 1; i++) {
    expect(numericPrices[i]).toBeLessThanOrEqual(numericPrices[i + 1]);
  }
});
```

### 예제 5: 여러 상품 한번에 처리

```javascript
test('모든 전자기기를 장바구니에 담는다', async ({ page }) => {
  await page.goto('/');
  
  // 로그인
  await page.getByTestId('login-button').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('test1234');
  await page.getByTestId('login-submit').click();
  
  // 전자기기 필터
  await page.locator('#category-전자기기').click();
  
  // 모든 전자기기의 장바구니 버튼 가져오기
  const addButtons = page.locator('[data-product-category="전자기기"] .product-add-button');
  const count = await addButtons.count();
  
  // 모든 버튼 클릭
  for (let i = 0; i < count; i++) {
    await addButtons.nth(i).click();
    await page.waitForTimeout(500); // 알림 대기
  }
  
  // 장바구니 카운트 확인
  const cartCount = await page.locator('#cart-badge').textContent();
  expect(cartCount).toBe('6');
});
```

### 예제 6: 관리자 권한 테스트

```javascript
test('일반 사용자는 관리자 페이지에 접근할 수 없다', async ({ page }) => {
  await page.goto('/');
  
  // 일반 사용자 로그인
  await page.getByTestId('login-button').click();
  await page.getByTestId('username-input').fill('test');
  await page.getByTestId('password-input').fill('test1234');
  await page.getByTestId('login-submit').click();
  
  // 관리자 버튼이 보이지 않는지 확인
  const adminButton = page.getByTestId('admin-button');
  await expect(adminButton).not.toBeVisible();
  
  // 또는
  const buttonCount = await page.locator('#home-admin-btn').count();
  expect(buttonCount).toBe(0);
});

test('관리자는 관리자 페이지에 접근할 수 있다', async ({ page }) => {
  await page.goto('/');
  
  // 관리자 로그인
  await page.getByTestId('login-button').click();
  await page.getByTestId('username-input').fill('admin');
  await page.getByTestId('password-input').fill('admin1234');
  await page.getByTestId('login-submit').click();
  
  // 관리자 버튼 확인 및 클릭
  await expect(page.getByTestId('admin-button')).toBeVisible();
  await page.getByTestId('admin-button').click();
  
  // 관리자 페이지 확인
  await expect(page.getByTestId('admin-page')).toBeVisible();
});
```

---

## 💡 선택자 선택 가이드

### 언제 어떤 선택자를 사용할까?

| 상황 | 추천 선택자 | 이유 |
|------|------------|------|
| 단일 요소 선택 | `data-testid`, `id` | 명확하고 변경에 강함 |
| 공통 요소 모두 선택 | `class` | 반복되는 요소 처리 |
| 카테고리별 필터링 | `data-*` 속성 | 의미있는 그룹핑 |
| 폼 입력 | `name` | 표준 속성 |
| 접근성 테스트 | `aria-label` | 스크린리더 호환 |
| 복잡한 조건 | CSS 조합, XPath | 유연한 선택 |

### 우선순위 권장

1. **data-testid** (가장 안정적)
2. **id** (고유한 요소)
3. **data-* 속성** (의미있는 그룹)
4. **class** (공통 요소)
5. **name** (폼 요소)
6. **CSS 조합** (복잡한 조건)
7. **XPath** (마지막 수단)

---

## 🎯 연습 과제

### 초급
1. [ ] 검색창에 "블루투스" 입력하고 검색하기
2. [ ] 첫 번째 상품의 이름 가져오기
3. [ ] 장바구니 버튼 클릭하기
4. [ ] 로그인/로그아웃하기

### 중급
5. [ ] 전자기기 카테고리 필터링 후 상품 개수 확인
6. [ ] 모든 상품의 가격 수집하기
7. [ ] 가격순 정렬 후 첫 번째 상품이 가장 저렴한지 확인
8. [ ] 할인율이 있는 상품만 필터링

### 고급
9. [ ] 모든 카테고리를 순회하며 각 상품 개수 확인
10. [ ] 특정 가격 범위의 상품만 장바구니에 담기
11. [ ] 장바구니에서 수량 조절 및 총 금액 계산 검증
12. [ ] 관리자로 상품 추가/수정/삭제 후 검증

---

**이 가이드를 통해 다양한 선택자 사용법을 연습하고, 실전 테스트 시나리오를 작성해보세요!**
