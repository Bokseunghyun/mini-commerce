# API 엔드포인트 구성 (`/api/user-actions` 통합)

> **이 문서의 역할 = `/api/user-actions` 통합 엔드포인트의 매핑 표(SSOT).**
> `/api/cart`, `/api/order`, `/api/wishlist` 기능이 하나의 `/api/user-actions` 로 묶여 있습니다.
> - **현재 유효한 요청/응답 계약**은 [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md) 를 보세요.
> - **자동화 코드 작성법**(로그인·토큰·격리 등)은 [README_QA.md](./README_QA.md) 가 정본입니다.
> - `/api/user-actions` 로 무엇이 통합돼 있는지에 대한 정본 매핑은 **이 문서**입니다. 다른 문서는 여기로 링크하세요.

---

## 📋 구성 개요

서버리스 함수는 **12개**로 구성되며, 장바구니·주문·위시리스트 기능은 하나의 `/api/user-actions` 엔드포인트로 통합돼 있습니다.

이 문서는 "무엇이 어디에 통합돼 있는가"를 기록합니다. 실제 호출 예제(요청 바디/응답 스키마)는 중복을 피하려고 [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md) 로 위임합니다.

---

## 🔄 통합 매핑 (기능 → 통합 엔드포인트)

`/api/user-actions` 하나가 아래 기능들을 `action` 파라미터로 분기해 처리합니다.
모든 쓰기(POST) 요청은 `Authorization: Bearer {token}` 헤더가 필요하고, 서버는 JWT를 응답 바디로 돌려줍니다.

| 기능 | 통합 엔드포인트 | 분기 방법 | 비고 |
|---|---|---|---|
| 장바구니 (add/update/remove) | `POST /api/user-actions` | `action: "cart_add" \| "cart_update" \| "cart_remove"` | 장바구니는 서버 DB에 계정 단위로 영속 |
| 주문 | `POST /api/user-actions` | `action: "order"` | 성공 응답 `message: "주문 완료"` |
| 위시리스트 (add/remove) | `POST /api/user-actions` | `action: "wishlist_add" \| "wishlist_remove"` | add 성공은 **201** |
| 위시리스트 조회 | `GET /api/user-actions?type=wishlist` | 쿼리스트링 `type` | `sort` 쿼리 지원 |

> `action`으로 받는 전체 값(9개)은 `cart_add, cart_update, cart_remove, wishlist_add, wishlist_remove, order, set_avatar, set_address, register_coupon` 입니다.
> 프로필 조회는 `GET /api/user-actions?type=profile` → `{ username, role, email, avatarUrl, defaultAddress }` 를 돌려줍니다.
> 각 action의 상세 바디/응답 스키마는 [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md) 참고.

---

## 🗂️ 기능이 통합된 위치

- 장바구니 기능 → `user-actions.js`
- 주문 기능 → `user-actions.js`
- 위시리스트 기능 → `user-actions.js`
- 상품 상세 조회 → `products/[id].js`

---

## 📝 API 목록 (12개)

1. **admin.js** - 관리자 기능 (상품 CRUD; `PUT`/`DELETE` 성공 응답 모두 200)
2. **inventory.js** - 재고 관리
3. **login.js** - 로그인
4. **products.js** - 상품 목록
5. **products/[id].js** - 상품 상세 (동적 라우트)
6. **reviews.js** - 리뷰 (GET/POST/PATCH/DELETE)
7. **search.js** - 검색
8. **status-codes.js** - 상태 코드 테스트
9. **user-actions.js** ⭐ - 사용자 액션 (장바구니/주문/위시리스트/프로필/쿠폰)
10. **_lib/common.js** - 공통 유틸리티 (함수 아님)
11. **_utils/auth.js** - 인증 유틸리티 (함수 아님)

---

## 🔧 프론트엔드 동작 (참고)

프론트엔드(`App.jsx`)는 `/api/user-actions` 로 `action` 을 붙여 호출합니다.
자세한 클라이언트 동작(로그인은 모달만 닫힘, 인증정보는 **localStorage** 저장 등)은 [README_QA.md](./README_QA.md) 를 보세요.

---

## 🧪 자동화 테스트로 검증할 때

이 통합 엔드포인트를 자동화로 검증한다면 **`page.request` / `request.newContext`** 를 쓰세요.
앱 origin 은 vite dev 서버 `http://localhost:5173` 이고, `/api` 는 vite 가 Express(3000)로 프록시합니다.
→ 테스트는 `baseURL: 'http://localhost:5173'` + 상대경로 `/api/...` 를 씁니다.

```ts
import { test, expect } from '@playwright/test';

test('user-actions 위시리스트 추가는 201', async ({ playwright }) => {
  // 1) 로그인 API로 토큰 획득 (인증정보는 localStorage에 저장되지만, API 검증은 헤더로 직접)
  const anon = await playwright.request.newContext({ baseURL: 'http://localhost:5173' });
  const { token } = await (await anon.post('/api/login',
    { data: { username: 'test', password: '1234' } })).json();

  // 2) 토큰을 Bearer 헤더에 실어 통합 엔드포인트 호출
  const api = await playwright.request.newContext({
    baseURL: 'http://localhost:5173',
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  const res = await api.post('/api/user-actions',
    { data: { action: 'wishlist_add', productId: 1, productName: '테스트상품' } });
  expect(res.status()).toBe(201);
});
```

> 순수 API 검증은 위처럼 `page.request`/`request.newContext` 를 쓰고, UI 클릭이 유발한 호출을 검증할 때만 `page.waitForResponse(...)` 를 씁니다. 자세한 패턴/설정은 [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md), [README_QA.md](./README_QA.md) 참고.

---

## 📌 통합 관련 주의사항

- **`action` 파라미터 필수**: POST 요청 시 반드시 `action` 필드 포함(위 매핑 표의 값 중 하나).
- **인증 필수**: 통합 엔드포인트의 쓰기 요청은 `Authorization: Bearer {token}` 필요. JWT는 발급 후 **1시간이 지나면 만료**되어 이후 요청은 401.
- **테스트용 고정 응답(픽스처)**: 상품 id **3·4** 주문 시도는 서버가 **500** 을 반환하고, id **16** 조회는 **404**, 사용자 `test2` 로그인은 **403**, 쿠폰 `EXPIRED10` 은 만료 응답입니다. 이 응답들을 그대로 검증하세요.

---

## 🔗 관련 문서

- [README_QA.md](./README_QA.md) - 앱 사실/인증/셀렉터/격리 정본(SSOT)
- [API_TESTING_GUIDE.md](./API_TESTING_GUIDE.md) - 현재 유효한 요청/응답 계약
- [API_TEST_COLLECTION.md](./API_TEST_COLLECTION.md) - 엔드포인트별 케이스 모음
- [vercel.json](./vercel.json) - Vercel 설정 파일

---

**목적**: `/api/user-actions` 통합 매핑의 정본화(SSOT)
