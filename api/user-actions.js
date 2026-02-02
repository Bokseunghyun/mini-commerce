/**
 * api/user-actions.js - 사용자 액션 통합 API
 * 
 * 장바구니, 주문, 위시리스트 기능을 하나의 엔드포인트로 통합
 * 
 * POST /api/user-actions
 *   body: { action: 'cart_remove' | 'order' | 'wishlist_add' | 'wishlist_remove', ... }
 * 
 * GET /api/user-actions?type=wishlist
 */

import { applyCors, requireUser } from './_lib/common.js';

// 위시리스트 메모리 저장소
const wishlists = new Map();

// 주문 차단 상품 ID
const BLOCKED_ORDER_IDS = new Set([3, 4]);

// ======================
// 유틸리티 함수
// ======================
function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeItem(raw) {
  const id = toNumber(raw?.id, 0);
  const name = String(raw?.name || "").trim();
  
  let price = toNumber(raw?.price, NaN);
  if (!Number.isFinite(price)) price = toNumber(raw?.discountedPrice, NaN);
  
  const quantity = Math.max(1, toNumber(raw?.quantity, 1));
  
  return { id, name, price, quantity };
}

// ======================
// 장바구니 처리
// ======================
function handleCartRemove(req, res, user) {
  const body = req.body || {};
  const cart = Array.isArray(body.cart) ? body.cart : null;
  
  if (!cart) {
    return res.status(400).json({ 
      message: "cart 필수",
      code: 'CART_REQUIRED' 
    });
  }
  
  const index = Number(body.index);
  if (!Number.isInteger(index) || index < 0 || index >= cart.length) {
    return res.status(400).json({ 
      message: "index 오류",
      code: 'INVALID_INDEX' 
    });
  }
  
  const next = cart.slice();
  next.splice(index, 1);
  
  return res.status(200).json({
    user,
    cart: next,
    message: '장바구니에서 삭제되었습니다'
  });
}

// ======================
// 주문 처리
// ======================
function handleOrder(req, res, user) {
  const body = req.body || {};
  const itemsRaw = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.cart)
      ? body.cart
      : null;
  
  if (!itemsRaw) {
    return res.status(400).json({ 
      message: "items(또는 cart) 필수",
      code: 'ITEMS_REQUIRED' 
    });
  }
  
  if (itemsRaw.length === 0) {
    return res.status(400).json({ 
      message: "주문할 상품이 없습니다",
      code: 'EMPTY_ORDER' 
    });
  }
  
  const items = itemsRaw.map(normalizeItem);
  
  // 기본 유효성
  for (const it of items) {
    if (!it.id || !it.name) {
      return res.status(400).json({ 
        message: "상품 데이터 오류(id/name)",
        code: 'INVALID_PRODUCT_DATA' 
      });
    }
    if (!Number.isFinite(it.price) || it.price <= 0) {
      return res.status(400).json({ 
        message: `상품 가격 오류: ${it.name}`,
        code: 'INVALID_PRICE' 
      });
    }
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
      return res.status(400).json({ 
        message: `상품 수량 오류: ${it.name}`,
        code: 'INVALID_QUANTITY' 
      });
    }
  }
  
  // 3,4번 상품 주문 차단 (의도적 오류)
  const blocked = items.find((it) => BLOCKED_ORDER_IDS.has(it.id));
  if (blocked) {
    return res.status(422).json({
      message: `주문 불가 상품 포함(의도적 오류): ${blocked.name} (id=${blocked.id})`,
      code: 'ORDER_BLOCKED_PRODUCT'
    });
  }
  
  const totalPrice = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  
  return res.status(200).json({
    user,
    message: "주문 완료",
    totalPrice,
    items,
  });
}

// ======================
// 위시리스트 조회 (GET)
// ======================
function handleWishlistGet(req, res, user) {
  const username = user.username;
  const wishlist = wishlists.get(username) || [];
  
  const { sort } = req.query;
  
  let sorted = [...wishlist];
  
  if (sort === 'name') {
    sorted.sort((a, b) => a.productName.localeCompare(b.productName, 'ko-KR'));
  } else if (sort === 'date') {
    sorted.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
  }
  
  return res.status(200).json({
    count: sorted.length,
    items: sorted,
  });
}

// ======================
// 위시리스트 추가
// ======================
function handleWishlistAdd(req, res, user) {
  const { productId, productName, price, imageUrl, category } = req.body;
  
  if (!productId) {
    return res.status(400).json({
      message: '상품 ID는 필수입니다',
      code: 'PRODUCT_ID_REQUIRED'
    });
  }
  
  const pid = Number(productId);
  if (isNaN(pid) || pid <= 0) {
    return res.status(400).json({
      message: '유효하지 않은 상품 ID입니다',
      code: 'INVALID_PRODUCT_ID'
    });
  }
  
  if (!productName || !productName.trim()) {
    return res.status(400).json({
      message: '상품명은 필수입니다',
      code: 'PRODUCT_NAME_REQUIRED'
    });
  }
  
  const username = user.username;
  const wishlist = wishlists.get(username) || [];
  
  // 중복 체크
  const existing = wishlist.find(item => item.productId === pid);
  if (existing) {
    return res.status(409).json({
      message: '이미 위시리스트에 있는 상품입니다',
      code: 'ALREADY_IN_WISHLIST',
      item: existing
    });
  }
  
  const item = {
    productId: pid,
    productName: productName.trim(),
    price: price ? Number(price) : null,
    imageUrl: imageUrl || null,
    category: category || null,
    addedAt: new Date().toISOString(),
  };
  
  wishlist.push(item);
  wishlists.set(username, wishlist);
  
  return res.status(201).json({
    message: '위시리스트에 추가되었습니다',
    item: item,
    count: wishlist.length
  });
}

// ======================
// 위시리스트 삭제
// ======================
function handleWishlistRemove(req, res, user) {
  const { productId } = req.body;
  
  if (!productId) {
    return res.status(400).json({
      message: '상품 ID는 필수입니다',
      code: 'PRODUCT_ID_REQUIRED'
    });
  }
  
  const pid = Number(productId);
  if (isNaN(pid)) {
    return res.status(400).json({
      message: '유효하지 않은 상품 ID입니다',
      code: 'INVALID_PRODUCT_ID'
    });
  }
  
  const username = user.username;
  const wishlist = wishlists.get(username) || [];
  
  const index = wishlist.findIndex(item => item.productId === pid);
  
  if (index === -1) {
    return res.status(404).json({
      message: '위시리스트에서 찾을 수 없습니다',
      code: 'NOT_IN_WISHLIST'
    });
  }
  
  const deleted = wishlist.splice(index, 1)[0];
  wishlists.set(username, wishlist);
  
  return res.status(200).json({
    message: '위시리스트에서 삭제되었습니다',
    item: deleted,
    count: wishlist.length
  });
}

// ======================
// 메인 핸들러
// ======================
export default async function userActionsHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;
  
  try {
    // 인증 필수
    const user = requireUser(req, res);
    if (!user) return;
    
    // GET 요청 - 위시리스트 조회
    if (req.method === 'GET') {
      const { type } = req.query;
      if (type === 'wishlist') {
        return handleWishlistGet(req, res, user);
      }
      return res.status(400).json({
        message: 'type 파라미터가 필요합니다 (예: type=wishlist)',
        code: 'TYPE_REQUIRED'
      });
    }
    
    // POST 요청 - action에 따라 분기
    if (req.method === 'POST') {
      const { action } = req.body || {};
      
      if (!action) {
        return res.status(400).json({
          message: 'action 파라미터가 필요합니다',
          code: 'ACTION_REQUIRED',
          availableActions: [
            'cart_remove',
            'order',
            'wishlist_add',
            'wishlist_remove'
          ]
        });
      }
      
      switch (action) {
        case 'cart_remove':
          return handleCartRemove(req, res, user);
        case 'order':
          return handleOrder(req, res, user);
        case 'wishlist_add':
          return handleWishlistAdd(req, res, user);
        case 'wishlist_remove':
          return handleWishlistRemove(req, res, user);
        default:
          return res.status(400).json({
            message: `지원하지 않는 action: ${action}`,
            code: 'UNSUPPORTED_ACTION',
            availableActions: [
              'cart_remove',
              'order',
              'wishlist_add',
              'wishlist_remove'
            ]
          });
      }
    }
    
    // 지원하지 않는 메서드
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['GET', 'POST']
    });
    
  } catch (error) {
    console.error('User Actions API error:', error);
    return res.status(500).json({
      message: '서버 오류가 발생했습니다',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
