/**
 * api/user-actions.js - 사용자 액션 통합 API
 *
 * 장바구니, 위시리스트, 주문 기능을 하나의 엔드포인트로 통합.
 * 모든 상태는 Postgres에 저장한다 (서버 사이드 장바구니/위시리스트 —
 * 기존 클라이언트 배열 기반 계약은 폐기됨).
 *
 * POST /api/user-actions
 *   body: { action: 'cart_add' | 'cart_update' | 'cart_remove'
 *                 | 'wishlist_add' | 'wishlist_remove' | 'order', ... }
 *
 * GET /api/user-actions?type=cart | ?type=wishlist
 */

import { applyCors, requireUser } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import {
  getProduct,
  getCart,
  upsertCartItem,
  removeCartItem,
  getWishlist,
  addWish,
  removeWish,
  createOrder,
  getCoupon,
} from './_lib/store.js';
import { computeCoupon } from './_lib/coupon-utils.js';

// 의도적 테스트 시나리오: 3, 4번 상품은 주문 차단 (422 네거티브 픽스처)
const BLOCKED_ORDER_IDS = new Set([3, 4]);

const AVAILABLE_ACTIONS = [
  'cart_add',
  'cart_update',
  'cart_remove',
  'wishlist_add',
  'wishlist_remove',
  'order',
];

// ======================
// 공통 유틸리티
// ======================

// body.productId 공통 검증 — 실패 시 400 응답까지 처리하고 null 반환
function parseProductId(req, res) {
  const { productId } = req.body || {};

  if (productId === undefined || productId === null || productId === '') {
    res.status(400).json({
      message: '상품 ID는 필수입니다',
      code: 'PRODUCT_ID_REQUIRED',
    });
    return null;
  }

  const pid = Number(productId);
  if (!Number.isInteger(pid) || pid <= 0) {
    res.status(400).json({
      message: '유효하지 않은 상품 ID입니다',
      code: 'INVALID_PRODUCT_ID',
    });
    return null;
  }

  return pid;
}

// 장바구니 합계 (상품이 삭제된 항목은 price가 없으므로 0으로 처리)
function cartTotal(items) {
  return items.reduce((sum, it) => sum + (it.price ?? 0) * it.quantity, 0);
}

// ======================
// 장바구니 처리
// ======================

// cart_add: 이미 담긴 수량에 더한다 (절대값 설정은 cart_update)
async function handleCartAdd(req, res, user) {
  const pid = parseProductId(req, res);
  if (pid === null) return;

  const body = req.body || {};
  const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({
      message: '수량은 1 이상의 정수여야 합니다',
      code: 'INVALID_QUANTITY',
    });
  }

  const product = await getProduct(pid);
  if (!product || !product.active) {
    return res.status(404).json({
      message: '상품을 찾을 수 없습니다',
      code: 'PRODUCT_NOT_FOUND',
    });
  }

  const current = await getCart(user.username);
  const existing = current.find((it) => it.productId === pid);
  await upsertCartItem(user.username, pid, (existing?.quantity ?? 0) + quantity);

  return res.status(200).json({
    message: '장바구니에 추가되었습니다',
    cart: await getCart(user.username),
  });
}

// cart_update: 수량 절대값 설정 (0이면 항목 삭제)
async function handleCartUpdate(req, res, user) {
  const pid = parseProductId(req, res);
  if (pid === null) return;

  const quantity = Number((req.body || {}).quantity);
  if (!Number.isInteger(quantity) || quantity < 0) {
    return res.status(400).json({
      message: '수량은 0 이상의 정수여야 합니다',
      code: 'INVALID_QUANTITY',
    });
  }

  if (quantity === 0) {
    await removeCartItem(user.username, pid);
  } else {
    const product = await getProduct(pid);
    if (!product || !product.active) {
      return res.status(404).json({
        message: '상품을 찾을 수 없습니다',
        code: 'PRODUCT_NOT_FOUND',
      });
    }
    await upsertCartItem(user.username, pid, quantity);
  }

  return res.status(200).json({
    cart: await getCart(user.username),
  });
}

// cart_remove: 항목 삭제
async function handleCartRemove(req, res, user) {
  const pid = parseProductId(req, res);
  if (pid === null) return;

  const removed = await removeCartItem(user.username, pid);
  if (!removed) {
    return res.status(404).json({
      message: '장바구니에 없는 상품입니다',
      code: 'NOT_IN_CART',
    });
  }

  return res.status(200).json({
    message: '장바구니에서 삭제되었습니다',
    cart: await getCart(user.username),
  });
}

// ======================
// 위시리스트 처리
// ======================

async function handleWishlistAdd(req, res, user) {
  const pid = parseProductId(req, res);
  if (pid === null) return;

  const product = await getProduct(pid);
  if (!product || !product.active) {
    return res.status(404).json({
      message: '상품을 찾을 수 없습니다',
      code: 'PRODUCT_NOT_FOUND',
    });
  }

  try {
    await addWish(user.username, pid);
  } catch (err) {
    // (username, product_id) PK 위반 -> 이미 위시리스트에 있는 상품
    if (err.code === '23505') {
      return res.status(409).json({
        message: '이미 위시리스트에 있는 상품입니다',
        code: 'ALREADY_IN_WISHLIST',
      });
    }
    throw err;
  }

  const wishlist = await getWishlist(user.username);
  return res.status(201).json({
    message: '위시리스트에 추가되었습니다',
    count: wishlist.length,
  });
}

async function handleWishlistRemove(req, res, user) {
  const pid = parseProductId(req, res);
  if (pid === null) return;

  const removed = await removeWish(user.username, pid);
  if (!removed) {
    return res.status(404).json({
      message: '위시리스트에서 찾을 수 없습니다',
      code: 'NOT_IN_WISHLIST',
    });
  }

  const wishlist = await getWishlist(user.username);
  return res.status(200).json({
    message: '위시리스트에서 삭제되었습니다',
    count: wishlist.length,
  });
}

// ======================
// 주문 처리
// ======================

async function handleOrder(req, res, user) {
  const body = req.body || {};

  // 주문 항목 확정: items 배열(바로구매) 또는 생략 시 서버 장바구니
  let requested;
  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) {
      return res.status(400).json({
        message: 'items는 배열이어야 합니다',
        code: 'INVALID_ITEMS',
      });
    }
    requested = [];
    for (const raw of body.items) {
      const id = Number(raw?.id);
      const quantity = raw?.quantity === undefined ? 1 : Number(raw.quantity);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: '상품 데이터 오류(id)',
          code: 'INVALID_PRODUCT_DATA',
        });
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          message: `상품 수량 오류 (id=${id})`,
          code: 'INVALID_QUANTITY',
        });
      }
      requested.push({ id, quantity });
    }
  } else {
    const cart = await getCart(user.username);
    requested = cart.map((it) => ({ id: it.productId, quantity: it.quantity }));
  }

  if (requested.length === 0) {
    return res.status(400).json({
      message: '주문할 상품이 없습니다',
      code: 'EMPTY_ORDER',
    });
  }

  // 가격/이름은 항상 DB 기준 (클라이언트가 보낸 가격은 신뢰하지 않는다)
  const orderItems = [];
  for (const it of requested) {
    const product = await getProduct(it.id);
    if (!product || !product.active) {
      return res.status(404).json({
        message: `상품을 찾을 수 없습니다 (id=${it.id})`,
        code: 'PRODUCT_NOT_FOUND',
      });
    }
    orderItems.push({
      productId: it.id,
      name: product.name,
      price: product.price,
      quantity: it.quantity,
    });
  }

  // 3, 4번 상품 주문 차단 (의도적 오류 — 재고 검증보다 먼저 판정)
  const blocked = orderItems.find((it) => BLOCKED_ORDER_IDS.has(it.productId));
  if (blocked) {
    return res.status(422).json({
      message: `주문 불가 상품 포함(의도적 오류): ${blocked.name} (id=${blocked.productId})`,
      code: 'ORDER_BLOCKED_PRODUCT',
    });
  }

  const totalPrice = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);

  // 쿠폰 적용 — api/coupons.js와 동일 규칙 (_lib/coupon-utils.js 공유)
  let discount = 0;
  let couponCode = null;
  const rawCoupon = body.couponCode;
  if (rawCoupon !== undefined && rawCoupon !== null && String(rawCoupon).trim() !== '') {
    const coupon = await getCoupon(String(rawCoupon).trim());
    const { error, result } = computeCoupon(coupon, totalPrice);
    if (error) {
      return res.status(error.status).json({ message: error.message, code: error.code });
    }
    discount = result.discount;
    couponCode = result.code;
  }
  const finalPrice = totalPrice - discount;

  // 배송지 정보 (선택) — 허용 필드만 저장
  let shipping = {};
  if (body.shipping !== undefined && body.shipping !== null) {
    if (typeof body.shipping !== 'object' || Array.isArray(body.shipping)) {
      return res.status(400).json({
        message: '배송 정보는 객체여야 합니다',
        code: 'INVALID_SHIPPING',
      });
    }
    const { name, phone, address, memo } = body.shipping;
    shipping = {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(memo !== undefined ? { memo } : {}),
    };
  }

  try {
    // 단일 트랜잭션: 재고 잠금/차감 + 주문 생성 + 장바구니 비우기
    const { order, items } = await createOrder({
      username: user.username,
      items: orderItems,
      couponCode,
      discount,
      totalPrice,
      finalPrice,
      shipping,
    });

    return res.status(201).json({
      message: '주문 완료',
      order: {
        id: order.id,
        totalPrice: order.totalPrice,
        discount: order.discount,
        finalPrice: order.finalPrice,
        status: order.status,
      },
      items,
    });
  } catch (err) {
    // 재고 부족 -> 409 (기존 응답 형태 유지)
    if (err.code === 'INSUFFICIENT_STOCK') {
      const failed = orderItems.find((it) => it.productId === err.productId);
      return res.status(409).json({
        message: `재고 부족: ${failed?.name ?? err.productId}\n요청 수량: ${failed?.quantity ?? 0}개\n사용 가능 재고: ${err.availableStock}개`,
        code: 'INSUFFICIENT_STOCK',
        productId: err.productId,
        productName: failed?.name ?? null,
        requestedQuantity: failed?.quantity ?? null,
        availableStock: err.availableStock,
      });
    }
    // 트랜잭션 내 재조회에서 상품이 사라진 경우 (동시 삭제 경합)
    if (err.code === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({
        message: '상품을 찾을 수 없습니다',
        code: 'PRODUCT_NOT_FOUND',
      });
    }
    throw err;
  }
}

// ======================
// 조회 (GET)
// ======================

async function handleGet(req, res, user) {
  const { type } = req.query;

  if (!type) {
    return res.status(400).json({
      message: 'type 파라미터가 필요합니다 (예: type=cart, type=wishlist)',
      code: 'TYPE_REQUIRED',
    });
  }

  if (type === 'wishlist') {
    const items = await getWishlist(user.username);
    return res.status(200).json({ count: items.length, items });
  }

  if (type === 'cart') {
    const items = await getCart(user.username);
    return res.status(200).json({
      count: items.length,
      items,
      totalPrice: cartTotal(items),
    });
  }

  return res.status(400).json({
    message: `지원하지 않는 type: ${type}`,
    code: 'INVALID_TYPE',
  });
}

// ======================
// 메인 핸들러
// ======================

export default async function userActionsHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (단일 코드 경로 — 인메모리 폴백 없음)
  if (!isConfigured()) return respondDbNotConfigured(res);

  try {
    // 인증 필수
    const user = requireUser(req, res);
    if (!user) return;

    // GET 요청 - 장바구니/위시리스트 조회
    if (req.method === 'GET') {
      return await handleGet(req, res, user);
    }

    // POST 요청 - action에 따라 분기
    if (req.method === 'POST') {
      const { action } = req.body || {};

      if (!action) {
        return res.status(400).json({
          message: 'action 파라미터가 필요합니다',
          code: 'ACTION_REQUIRED',
          availableActions: AVAILABLE_ACTIONS,
        });
      }

      switch (action) {
        case 'cart_add':
          return await handleCartAdd(req, res, user);
        case 'cart_update':
          return await handleCartUpdate(req, res, user);
        case 'cart_remove':
          return await handleCartRemove(req, res, user);
        case 'wishlist_add':
          return await handleWishlistAdd(req, res, user);
        case 'wishlist_remove':
          return await handleWishlistRemove(req, res, user);
        case 'order':
          return await handleOrder(req, res, user);
        default:
          return res.status(400).json({
            message: `지원하지 않는 action: ${action}`,
            code: 'UNSUPPORTED_ACTION',
            availableActions: AVAILABLE_ACTIONS,
          });
      }
    }

    // 지원하지 않는 메서드
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['GET', 'POST'],
    });
  } catch (error) {
    console.error('User Actions API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
