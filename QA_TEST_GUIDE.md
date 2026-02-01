# QA 자동화 테스트 가이드

이 문서는 Mini Commerce 데모 사이트의 QA 자동화 테스트를 위한 가이드입니다.

## 📋 테스트 계정

### 일반 사용자
- **Username**: `test`
- **Password**: `test1234`
- **Role**: `USER`

### 관리자
- **Username**: `admin`
- **Password**: `admin1234`
- **Role**: `ADMIN`

---

## 🎯 주요 테스트 시나리오

### 1. 인증 테스트

#### 1.1 로그인 테스트
- **성공 케이스**
  - 올바른 계정 정보로 로그인
  - 로그인 후 토큰 저장 확인
  - 로그인 후 홈페이지로 리다이렉트

- **실패 케이스**
  - 잘못된 아이디/비밀번호
  - 빈 입력값
  - 네트워크 오류 시뮬레이션

#### 1.2 로그아웃 테스트
- 로그아웃 버튼 클릭
- 토큰 삭제 확인
- 홈페이지로 리다이렉트

---

### 2. 상품 목록 테스트

#### 2.1 카테고리 필터링
- **전체**: 18개 상품 표시
- **전자기기**: 6개 상품 표시
- **액세서리**: 6개 상품 표시
- **생활**: 6개 상품 표시

#### 2.2 정렬 기능
- 기본순
- 낮은 가격순
- 높은 가격순
- 이름순 (가나다순)
- 할인율순

#### 2.3 검색 기능
- 상품명 검색
- 설명 검색
- 검색 결과 0개일 때 메시지 표시
- 검색어 초기화

---

### 3. 장바구니 테스트

#### 3.1 장바구니 담기 (비로그인)
- 상품 클릭 → 로그인 유도 팝업
- "장바구니 담기" 버튼 → 로그인 유도 팝업

#### 3.2 장바구니 담기 (로그인)
- 상품 추가
- 수량 증가/감소
- 동일 상품 추가 시 수량 증가
- 장바구니 카운트 업데이트

#### 3.3 장바구니 페이지
- 빈 장바구니 UI 표시
- 상품 목록 표시
- 수량 조절 (최소 1개)
- 개별 상품 삭제
- 총 금액 계산

#### 3.4 장바구니 너비 일관성
- 상품이 0개일 때도 동일한 너비 유지
- 반응형 레이아웃 유지

---

### 4. 주문 테스트

#### 4.1 장바구니에서 주문
- "주문하기" 버튼 클릭
- API 호출 확인
- 주문 완료 페이지 이동
- 장바구니 초기화

#### 4.2 바로 구매 (비로그인)
- API 401 에러 발생 확인
- 에러 메시지 팝업 표시

#### 4.3 바로 구매 (로그인)
- 상품 상세 페이지에서 "바로 구매"
- 수량 선택
- 주문 완료 페이지 이동

---

### 5. 관리자 페이지 테스트

#### 5.1 권한 검증
- **비로그인**: 401 에러 (토큰 없음)
- **일반 사용자 (test)**: 403 에러 (권한 없음)
- **관리자 (admin)**: 정상 접근

#### 5.2 상품 추가
- 필수 필드 검증 (상품명, 정가, 할인가)
- 카테고리 선택
- 할인가 < 정가 검증
- 추가 성공 시 목록 업데이트

#### 5.3 상품 수정
- 기존 정보 로드
- 필드 수정
- 저장 후 목록 업데이트

#### 5.4 상품 삭제
- 삭제 확인 팝업
- 삭제 후 목록 업데이트

#### 5.5 상품 활성화/비활성화
- 상태 토글
- UI 업데이트

---

## 🔧 API 엔드포인트

### 인증
- `POST /api/login` - 로그인
  ```json
  {
    "username": "test",
    "password": "test1234"
  }
  ```

### 상품
- `GET /api/products` - 상품 목록 조회
- `GET /api/products/:id` - 상품 상세 조회

### 장바구니
- `POST /api/cart` - 장바구니 수정
  ```json
  {
    "action": "remove",
    "index": 0,
    "cart": [...]
  }
  ```

### 주문
- `POST /api/order` - 주문 생성
  ```json
  {
    "items": [
      {
        "id": 1,
        "name": "상품명",
        "price": 10000,
        "quantity": 2
      }
    ]
  }
  ```

### 관리자
- `GET /api/admin` - 상품 목록 조회 (관리자)
- `POST /api/admin` - 상품 추가
  ```json
  {
    "name": "새 상품",
    "category": "전자기기",
    "originalPrice": 100000,
    "discountedPrice": 80000,
    "discountRate": 20
  }
  ```
- `PUT /api/admin` - 상품 수정
  ```json
  {
    "id": 1,
    "name": "수정된 상품명",
    "originalPrice": 120000,
    "discountedPrice": 90000,
    "discountRate": 25
  }
  ```
- `DELETE /api/admin` - 상품 삭제
  ```json
  {
    "id": 1
  }
  ```

---

## 🏷️ 주요 Test ID / Selector

### 홈페이지
- `[data-testid="home-page"]` - 홈페이지 컨테이너
- `[data-testid="logo"]` - 로고 (클릭 시 홈으로)
- `[data-testid="search-input"]` - 검색 입력창
- `[data-testid="search-button"]` - 검색 버튼
- `[data-testid="cart-button"]` - 장바구니 버튼
- `[data-testid="cart-badge"]` - 장바구니 카운트
- `[data-testid="admin-button"]` - 관리자 버튼 (admin만)
- `[data-testid="logout-button"]` - 로그아웃 버튼
- `[data-testid="login-button"]` - 로그인 버튼
- `[data-testid="category-전체"]` - 전체 카테고리
- `[data-testid="category-전자기기"]` - 전자기기 카테고리
- `[data-testid="category-액세서리"]` - 액세서리 카테고리
- `[data-testid="category-생활"]` - 생활 카테고리
- `[data-testid="sort-select"]` - 정렬 셀렉트
- `[data-testid="product-card-{id}"]` - 상품 카드
- `[data-testid="view-btn-{id}"]` - 상품 상세보기
- `[data-testid="add-btn-{id}"]` - 장바구니 담기

### 로그인 페이지
- `[data-testid="login-page"]` - 로그인 페이지
- `[data-testid="username-input"]` - 아이디 입력
- `[data-testid="password-input"]` - 비밀번호 입력
- `[data-testid="login-submit"]` - 로그인 버튼

### 장바구니 페이지
- `#cart-page` - 장바구니 페이지
- `.cart-quantity-decrease` - 수량 감소
- `.cart-quantity-increase` - 수량 증가
- `.remove-item-btn` - 상품 삭제
- `#checkout-btn` - 주문하기

### 관리자 페이지
- `[data-testid="admin-page"]` - 관리자 페이지
- `[data-testid="add-product-btn"]` - 상품 추가 버튼
- `[data-testid="add-name-input"]` - 상품명 입력
- `[data-testid="add-category-select"]` - 카테고리 선택
- `[data-testid="add-original-price-input"]` - 정가 입력
- `[data-testid="add-discounted-price-input"]` - 할인가 입력
- `[data-testid="add-submit-btn"]` - 추가 확인
- `[data-testid="edit-btn-{id}"]` - 수정 버튼
- `[data-testid="save-btn-{id}"]` - 저장 버튼
- `[data-testid="delete-btn-{id}"]` - 삭제 버튼
- `[data-testid="toggle-btn-{id}"]` - 활성화/비활성화

---

## 🐛 예상 에러 케이스

### 1. 인증 에러
- `AUTH_NO_TOKEN` (401) - 토큰이 없을 때
- `AUTH_INVALID_TOKEN` (401) - 토큰이 유효하지 않을 때
- `AUTH_FORBIDDEN` (403) - 권한이 없을 때

### 2. 상품 에러
- 존재하지 않는 상품 조회 (404)
- 가격이 0원인 상품 장바구니 담기 (클라이언트 알림)

### 3. 관리자 에러
- 필수 필드 누락 (400)
- 할인가 > 정가 (400)
- 존재하지 않는 상품 수정/삭제 (404)

---

## 💡 자동화 테스트 팁

### 1. 테스트 순서
1. 로그인 테스트 (인증 토큰 획득)
2. 상품 목록 테스트
3. 장바구니 테스트
4. 주문 테스트
5. 관리자 기능 테스트 (admin 계정)
6. 로그아웃 테스트

### 2. 데이터 초기화
- 각 테스트 케이스 전 localStorage 클리어
- 장바구니 초기화
- 세션 스토리지 초기화

### 3. 대기 시간
- API 응답 대기 (네트워크 지연 고려)
- UI 렌더링 대기
- 애니메이션 완료 대기

### 4. 스크린샷
- 에러 발생 시 자동 스크린샷
- 주요 단계별 스크린샷
- 비교 테스트용 기준 스크린샷

---

## 📊 테스트 체크리스트

### UI 테스트
- [ ] 로고 클릭 시 홈으로 이동
- [ ] 카테고리별 상품 필터링
- [ ] 검색 기능
- [ ] 정렬 기능
- [ ] 장바구니 뱃지 카운트
- [ ] 빈 상태 UI (검색 결과 없음, 장바구니 비어있음)
- [ ] 반응형 레이아웃

### API 테스트
- [ ] 로그인 API (성공/실패)
- [ ] 상품 목록 조회
- [ ] 상품 상세 조회
- [ ] 장바구니 API
- [ ] 주문 API
- [ ] 관리자 CRUD API

### 권한 테스트
- [ ] 비로그인 시 로그인 유도
- [ ] 일반 사용자 관리자 페이지 접근 차단
- [ ] 관리자 권한 검증

### 에러 처리
- [ ] 네트워크 오류
- [ ] API 에러 응답
- [ ] 유효성 검사 실패
- [ ] 토큰 만료

---

## 🚀 시작하기

### 로컬 환경
```bash
npm install
npm run dev
```

### Vercel 배포
```bash
vercel --prod
```

### 환경 변수
```
VITE_API_BASE_URL=https://your-domain.vercel.app
JWT_SECRET=your-secret-key
```
