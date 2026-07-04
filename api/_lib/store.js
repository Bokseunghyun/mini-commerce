/**
 * api/_lib/store.js - Postgres 데이터 접근 계층 (DAL)
 *
 * 모든 상태는 Postgres에 저장한다 (인메모리 폴백 없음 — 단일 코드 경로).
 * - 값은 전부 파라미터 바인딩 ($1, $2, ...) — SQL 문자열 보간 금지
 * - DB 행(snake_case)은 엔티티별 row 매퍼로 camelCase API 형태로 변환해서 반환
 * - 조회 실패(없음)는 null / [] 반환, 연결 오류·제약 위반은 그대로 throw
 *   (중복 키 23505 등은 호출부 핸들러에서 상태코드로 매핑)
 */

import { query, getClient } from './db.js';
import { SCHEMA_SQL, SCHEMA_MIGRATIONS_SQL } from './schema.js';
import {
  SEED_PRODUCTS,
  SEED_USERS,
  SEED_REVIEWS,
  SEED_COUPONS,
} from './seedData.js';
import { hashPassword } from './auth-hash.js';

// ---------------------------------------------------------------------------
// Row 매퍼 (snake_case -> camelCase)
// ---------------------------------------------------------------------------

function toIso(value) {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    originalPrice: row.original_price,
    discountedPrice: row.discounted_price,
    price: row.price,
    discountRate: row.discount_rate,
    imageUrl: row.image_url,
    images: row.images ?? [],
    description: row.description,
    specs: row.specs ?? {},
    tags: row.tags ?? [],
    stock: row.stock,
    active: row.active,
    createdAt: toIso(row.created_at),
  };
}

function mapUser(row) {
  if (!row) return null;
  return {
    username: row.username,
    passwordHash: row.password_hash,
    email: row.email,
    role: row.role,
    status: row.status,
    avatarUrl: row.avatar_url ?? null,
    defaultAddress: row.default_address ?? null,
    createdAt: toIso(row.created_at),
  };
}

function mapReview(row) {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    username: row.username,
    rating: row.rating,
    comment: row.comment,
    images: row.images ?? [],
    createdAt: toIso(row.created_at),
    // 스키마에 updated_at 컬럼이 없어 기존 API 형태 유지를 위해 createdAt을 그대로 노출
    updatedAt: toIso(row.created_at),
  };
}

function mapWish(row) {
  if (!row) return null;
  return {
    username: row.username,
    productId: row.product_id,
    name: row.name ?? undefined,
    price: row.price ?? undefined,
    imageUrl: row.image_url ?? undefined,
    createdAt: toIso(row.created_at),
  };
}

function mapCartItem(row) {
  if (!row) return null;
  return {
    username: row.username,
    productId: row.product_id,
    quantity: row.quantity,
    name: row.name ?? undefined,
    price: row.price ?? undefined,
    imageUrl: row.image_url ?? undefined,
    stock: row.stock ?? undefined,
    updatedAt: toIso(row.updated_at),
  };
}

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    status: row.status,
    totalPrice: row.total_price,
    discount: row.discount,
    finalPrice: row.final_price,
    couponCode: row.coupon_code,
    shipping: row.shipping ?? {},
    trackingNumber: row.tracking_number ?? null,
    paymentKey: row.payment_key ?? null,
    paymentMethod: row.payment_method ?? null,
    cardLast4: row.card_last4 ?? null,
    createdAt: toIso(row.created_at),
    ...(row.items !== undefined ? { items: row.items } : {}),
  };
}

function mapOrderItem(row) {
  if (!row) return null;
  return {
    orderId: row.order_id,
    productId: row.product_id,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
  };
}

function mapCoupon(row) {
  if (!row) return null;
  return {
    code: row.code,
    type: row.type,
    amount: row.amount,
    minOrder: row.min_order,
    maxDiscount: row.max_discount,
    expiresAt: toIso(row.expires_at),
    active: row.active,
  };
}

function mapPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id ?? null,
    username: row.username ?? null,
    method: row.method,
    cardLast4: row.card_last4 ?? null,
    amount: row.amount,
    status: row.status,
    fault: row.fault ?? null,
    createdAt: toIso(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// 스키마
// ---------------------------------------------------------------------------

// 기본 DDL(CREATE TABLE IF NOT EXISTS) 실행 후 증분 마이그레이션
// (ADD COLUMN IF NOT EXISTS / 신규 테이블)까지 실행한다.
// 모든 문장이 멱등이라 기존 DB에서 여러 번 호출해도 안전하다 (비파괴).
export async function ensureSchema() {
  await query(SCHEMA_SQL);
  await query(SCHEMA_MIGRATIONS_SQL);
}

// ---------------------------------------------------------------------------
// 상품
// ---------------------------------------------------------------------------

const PRODUCT_SORTS = {
  price_asc: 'price ASC, id ASC',
  price_desc: 'price DESC, id ASC',
  discount: 'discount_rate DESC, id ASC',
  name: 'name ASC, id ASC',
};

export async function listProducts({ q, category, minPrice, maxPrice, sort, includeInactive } = {}) {
  const where = [];
  const params = [];

  if (!includeInactive) {
    where.push('active = true');
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`name ILIKE $${params.length}`);
  }
  if (category) {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    params.push(Number(minPrice));
    where.push(`price >= $${params.length}`);
  }
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    params.push(Number(maxPrice));
    where.push(`price <= $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  // 기본 정렬: 최근 등록 상품이 상단에 (신규 상품 우선), 시드 상품은 id 순
  const orderSql = PRODUCT_SORTS[sort] || 'created_at DESC, id ASC'; // 화이트리스트 매핑 (값 보간 아님)

  const { rows } = await query(
    `SELECT * FROM products ${whereSql} ORDER BY ${orderSql}`,
    params
  );
  return rows.map(mapProduct);
}

export async function getProduct(id) {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [id]);
  return mapProduct(rows[0] ?? null);
}

export async function createProduct(data) {
  const { rows } = await query(
    `INSERT INTO products
       (name, category, original_price, discounted_price, price, discount_rate,
        image_url, images, description, specs, tags, stock, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      data.name,
      data.category,
      data.originalPrice ?? null,
      data.discountedPrice ?? null,
      data.price,
      data.discountRate ?? null,
      data.imageUrl ?? null,
      JSON.stringify(data.images ?? []),
      data.description ?? null,
      JSON.stringify(data.specs ?? {}),
      JSON.stringify(data.tags ?? []),
      data.stock ?? 20,
      data.active ?? true,
    ]
  );
  return mapProduct(rows[0]);
}

// camelCase 패치 키 -> 컬럼 매핑 (허용 필드 화이트리스트)
const PRODUCT_PATCH_COLUMNS = {
  name: { column: 'name' },
  category: { column: 'category' },
  originalPrice: { column: 'original_price' },
  discountedPrice: { column: 'discounted_price' },
  price: { column: 'price' },
  discountRate: { column: 'discount_rate' },
  imageUrl: { column: 'image_url' },
  images: { column: 'images', json: true },
  description: { column: 'description' },
  specs: { column: 'specs', json: true },
  tags: { column: 'tags', json: true },
  stock: { column: 'stock' },
  active: { column: 'active' },
};

export async function updateProduct(id, patch = {}) {
  const sets = [];
  const params = [];

  for (const [key, def] of Object.entries(PRODUCT_PATCH_COLUMNS)) {
    if (patch[key] !== undefined) {
      params.push(def.json ? JSON.stringify(patch[key]) : patch[key]);
      sets.push(`${def.column} = $${params.length}`);
    }
  }

  if (sets.length === 0) {
    // 변경할 필드가 없으면 현재 행을 그대로 반환
    return getProduct(id);
  }

  params.push(id);
  const { rows } = await query(
    `UPDATE products SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return mapProduct(rows[0] ?? null);
}

export async function deleteProduct(id) {
  const { rows } = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
  return mapProduct(rows[0] ?? null);
}

// ---------------------------------------------------------------------------
// 사용자
// ---------------------------------------------------------------------------

export async function findUser(username) {
  const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);
  return mapUser(rows[0] ?? null);
}

export async function createUser({ username, passwordHash, email }) {
  // 중복 username은 PK 위반(23505)으로 throw — 호출부에서 409로 매핑
  const { rows } = await query(
    `INSERT INTO users (username, password_hash, email)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [username, passwordHash, email ?? null]
  );
  return mapUser(rows[0]);
}

// 아바타 이미지 URL 설정 (없는 사용자면 null 반환)
export async function setAvatar(username, avatarUrl) {
  const { rows } = await query(
    `UPDATE users SET avatar_url = $1 WHERE username = $2 RETURNING *`,
    [avatarUrl ?? null, username]
  );
  return mapUser(rows[0] ?? null);
}

// 기본 배송지 설정 (없는 사용자면 null 반환)
export async function setUserAddress(username, address) {
  const { rows } = await query(
    `UPDATE users SET default_address = $1 WHERE username = $2 RETURNING *`,
    [address ? JSON.stringify(address) : null, username]
  );
  return mapUser(rows[0] ?? null);
}

// ---------------------------------------------------------------------------
// 리뷰
// ---------------------------------------------------------------------------

const REVIEW_SORTS = {
  latest: 'created_at DESC, id DESC',
  oldest: 'created_at ASC, id ASC',
  rating_desc: 'rating DESC, created_at DESC',
  rating_asc: 'rating ASC, created_at DESC',
};

export async function listReviews({ productId, username, minRating, maxRating, sort = 'latest', limit, offset } = {}) {
  const where = [];
  const params = [];

  if (productId !== undefined && productId !== null && productId !== '') {
    params.push(Number(productId));
    where.push(`product_id = $${params.length}`);
  }
  if (username) {
    params.push(username);
    where.push(`username = $${params.length}`);
  }
  if (minRating !== undefined && minRating !== null && minRating !== '') {
    params.push(Number(minRating));
    where.push(`rating >= $${params.length}`);
  }
  if (maxRating !== undefined && maxRating !== null && maxRating !== '') {
    params.push(Number(maxRating));
    where.push(`rating <= $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = REVIEW_SORTS[sort] || REVIEW_SORTS.latest;

  // count는 limit/offset 적용 전 전체 건수
  const countResult = await query(
    `SELECT COUNT(*)::int AS count FROM reviews ${whereSql}`,
    params
  );
  const count = countResult.rows[0].count;

  const pageParams = [...params];
  let pageSql = `SELECT * FROM reviews ${whereSql} ORDER BY ${orderSql}`;
  if (limit !== undefined && limit !== null) {
    pageParams.push(Number(limit));
    pageSql += ` LIMIT $${pageParams.length}`;
  }
  if (offset !== undefined && offset !== null) {
    pageParams.push(Number(offset));
    pageSql += ` OFFSET $${pageParams.length}`;
  }

  const { rows } = await query(pageSql, pageParams);
  return { count, reviews: rows.map(mapReview) };
}

export async function getReview(id) {
  const { rows } = await query('SELECT * FROM reviews WHERE id = $1', [id]);
  return mapReview(rows[0] ?? null);
}

export async function createReview({ productId, username, rating, comment, images = [] }) {
  // 한 사용자가 같은 상품에 여러 건 작성 가능 — 각 리뷰는 고유 id 를 가진다
  const { rows } = await query(
    `INSERT INTO reviews (product_id, username, rating, comment, images)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [productId, username, rating, comment, JSON.stringify(images ?? [])]
  );
  return mapReview(rows[0]);
}

export async function updateReview(id, { rating, comment, images } = {}) {
  const sets = [];
  const params = [];

  if (rating !== undefined) {
    params.push(rating);
    sets.push(`rating = $${params.length}`);
  }
  if (comment !== undefined) {
    params.push(comment);
    sets.push(`comment = $${params.length}`);
  }
  if (images !== undefined) {
    params.push(JSON.stringify(images ?? []));
    sets.push(`images = $${params.length}`);
  }

  if (sets.length === 0) {
    return getReview(id);
  }

  params.push(id);
  const { rows } = await query(
    `UPDATE reviews SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return mapReview(rows[0] ?? null);
}

export async function deleteReview(id) {
  const { rows } = await query('DELETE FROM reviews WHERE id = $1 RETURNING *', [id]);
  return mapReview(rows[0] ?? null);
}

// ---------------------------------------------------------------------------
// 위시리스트
// ---------------------------------------------------------------------------

export async function getWishlist(username) {
  const { rows } = await query(
    `SELECT w.username, w.product_id, w.created_at,
            p.name, p.price, p.image_url
       FROM wishlists w
       LEFT JOIN products p ON p.id = w.product_id
      WHERE w.username = $1
      ORDER BY w.created_at DESC, w.product_id DESC`,
    [username]
  );
  return rows.map(mapWish);
}

export async function addWish(username, productId) {
  // 중복 추가는 PK 위반(23505) throw — 호출부에서 409로 매핑
  const { rows } = await query(
    `INSERT INTO wishlists (username, product_id)
     VALUES ($1, $2)
     RETURNING *`,
    [username, productId]
  );
  return mapWish(rows[0]);
}

export async function removeWish(username, productId) {
  const { rows } = await query(
    'DELETE FROM wishlists WHERE username = $1 AND product_id = $2 RETURNING *',
    [username, productId]
  );
  return mapWish(rows[0] ?? null);
}

// ---------------------------------------------------------------------------
// 장바구니
// ---------------------------------------------------------------------------

export async function getCart(username) {
  const { rows } = await query(
    `SELECT c.username, c.product_id, c.quantity, c.updated_at,
            p.name, p.price, p.image_url, p.stock
       FROM carts c
       LEFT JOIN products p ON p.id = c.product_id
      WHERE c.username = $1
      ORDER BY c.updated_at DESC, c.product_id ASC`,
    [username]
  );
  return rows.map(mapCartItem);
}

// 수량 절대값 설정 (기존 항목이 있으면 덮어씀). quantity <= 0 이면 항목 삭제.
export async function upsertCartItem(username, productId, quantity) {
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    await query(
      'DELETE FROM carts WHERE username = $1 AND product_id = $2',
      [username, productId]
    );
    return null;
  }
  const { rows } = await query(
    `INSERT INTO carts (username, product_id, quantity, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (username, product_id)
     DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()
     RETURNING *`,
    [username, productId, qty]
  );
  return mapCartItem(rows[0]);
}

export async function removeCartItem(username, productId) {
  const { rows } = await query(
    'DELETE FROM carts WHERE username = $1 AND product_id = $2 RETURNING *',
    [username, productId]
  );
  return mapCartItem(rows[0] ?? null);
}

export async function clearCart(username) {
  await query('DELETE FROM carts WHERE username = $1', [username]);
}

// ---------------------------------------------------------------------------
// 주문
// ---------------------------------------------------------------------------

// 주문 ID 생성: 'ORD-' + yyyymmdd + '-' + 대문자 영숫자 4자리
function generateOrderId() {
  const now = new Date();
  const ymd = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ORD-${ymd}-${suffix}`;
}

/**
 * 주문 생성 — 단일 트랜잭션:
 *  1) 상품 행 FOR UPDATE 잠금 + 재고 검증 (부족 시 INSUFFICIENT_STOCK throw)
 *  2) 재고 차감
 *  3) orders + order_items INSERT
 *  4) 해당 사용자 장바구니 비우기
 */
export async function createOrder({
  username,
  items,
  couponCode,
  discount,
  totalPrice,
  finalPrice,
  shipping,
  paymentKey,
  paymentMethod,
  cardLast4,
}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const orderItems = [];
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity) || 1;

      // 동시 주문 경합 방지를 위해 행 잠금 후 재고 검증
      const { rows } = await client.query(
        'SELECT id, name, price, stock FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );
      const product = rows[0];
      if (!product) {
        const err = new Error(`상품을 찾을 수 없습니다: ${productId}`);
        err.code = 'PRODUCT_NOT_FOUND';
        err.productId = productId;
        throw err;
      }
      if (product.stock < quantity) {
        const err = new Error(`재고가 부족합니다: ${product.name}`);
        err.code = 'INSUFFICIENT_STOCK';
        err.productId = productId;
        err.availableStock = product.stock;
        throw err;
      }

      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [quantity, productId]
      );

      orderItems.push({
        productId,
        name: item.name ?? product.name,
        price: item.price ?? product.price,
        quantity,
      });
    }

    const orderId = generateOrderId();
    const orderResult = await client.query(
      `INSERT INTO orders
         (id, username, status, total_price, discount, final_price, coupon_code, shipping,
          payment_key, payment_method, card_last4)
       VALUES ($1, $2, 'PAID', $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        orderId,
        username,
        totalPrice,
        discount ?? 0,
        finalPrice,
        couponCode ?? null,
        JSON.stringify(shipping ?? {}),
        paymentKey ?? null,
        paymentMethod ?? null,
        cardLast4 ?? null,
      ]
    );

    const insertedItems = [];
    for (const oi of orderItems) {
      const { rows } = await client.query(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [orderId, oi.productId, oi.name, oi.price, oi.quantity]
      );
      insertedItems.push(rows[0]);
    }

    // 주문 완료 시 장바구니 비우기
    await client.query('DELETE FROM carts WHERE username = $1', [username]);

    await client.query('COMMIT');
    return {
      order: mapOrder(orderResult.rows[0]),
      items: insertedItems.map(mapOrderItem),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 주문 목록 (items 집계 포함) — all=true면 전체 주문 (관리자용)
export async function listOrders(username, { all = false } = {}) {
  const params = [];
  let whereSql = '';
  if (!all) {
    params.push(username);
    whereSql = 'WHERE o.username = $1';
  }

  const { rows } = await query(
    `SELECT o.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'productId', oi.product_id,
                  'name', oi.name,
                  'price', oi.price,
                  'quantity', oi.quantity
                )
              ) FILTER (WHERE oi.order_id IS NOT NULL),
              '[]'
            ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${whereSql}
      GROUP BY o.id
      ORDER BY o.created_at DESC, o.id DESC`,
    params
  );
  return rows.map(mapOrder);
}

export async function getOrder(orderId) {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [orderId]);
  if (!rows[0]) return null;

  const itemsResult = await query(
    'SELECT * FROM order_items WHERE order_id = $1',
    [orderId]
  );
  return {
    order: mapOrder(rows[0]),
    items: itemsResult.rows.map(mapOrderItem),
  };
}

// 송장번호로 주문 조회 (없으면 null) — 배송 추적(택배 API 모의)에서 사용
export async function getOrderByTrackingNumber(trackingNumber) {
  const tn = String(trackingNumber ?? '').trim();
  if (tn === '') return null;
  const { rows } = await query(
    'SELECT * FROM orders WHERE tracking_number = $1',
    [tn]
  );
  return mapOrder(rows[0] ?? null);
}

/**
 * 주문 취소 — 단일 트랜잭션:
 *  - 본인 주문만 취소 가능 (관리자는 전체) — 아니면 null 반환
 *  - PAID 상태만 취소 가능 -> CANCELED 변경 + 재고 원복
 *  - 이미 취소된 주문이면 err.code='ALREADY_CANCELED' throw
 */
export async function cancelOrder(orderId, username, { isAdmin = false } = {}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    const order = rows[0];

    // 없거나 본인 주문이 아니면 null (관리자는 예외)
    if (!order || (!isAdmin && order.username !== username)) {
      await client.query('ROLLBACK');
      return null;
    }

    if (order.status === 'CANCELED') {
      const err = new Error('이미 취소된 주문입니다');
      err.code = 'ALREADY_CANCELED';
      throw err;
    }
    if (order.status !== 'PAID') {
      const err = new Error('취소할 수 없는 주문 상태입니다');
      err.code = 'CANCEL_NOT_ALLOWED';
      throw err;
    }

    // 재고 원복 (같은 상품이 여러 항목이어도 합산 원복)
    await client.query(
      `UPDATE products p
          SET stock = p.stock + s.qty
         FROM (
           SELECT product_id, SUM(quantity)::int AS qty
             FROM order_items
            WHERE order_id = $1
            GROUP BY product_id
         ) s
        WHERE p.id = s.product_id`,
      [orderId]
    );

    const updated = await client.query(
      `UPDATE orders SET status = 'CANCELED' WHERE id = $1 RETURNING *`,
      [orderId]
    );

    await client.query('COMMIT');
    return mapOrder(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// 주문 상태 라이프사이클 (코드에서 강제)
//   PAID -> PREPARING -> SHIPPING -> DELIVERED
//   CANCELED 는 cancelOrder()에서 PAID/PREPARING 대상으로 처리
// ---------------------------------------------------------------------------

// 배송 흐름의 순방향 전이 (advanceOrderStatus 전용)
const ORDER_STATUS_NEXT = {
  PAID: 'PREPARING',
  PREPARING: 'SHIPPING',
  SHIPPING: 'DELIVERED',
};

// setOrderStatus(관리자 명시 지정)에서 허용하는 상태 집합
const ORDER_STATUS_SET = ['PAID', 'PREPARING', 'SHIPPING', 'DELIVERED', 'CANCELED'];

// 배송 타임라인 단계 정의 (라벨/위치는 결정론적으로 고정)
// createdAt 기준 오프셋(시간 단위)으로 각 이벤트 시각을 파생한다.
const TRACKING_STAGES = [
  { status: 'PAID', label: '결제완료', location: '온라인', offsetHours: 0 },
  { status: 'PREPARING', label: '상품준비중', location: '판매자 창고', offsetHours: 6 },
  { status: 'SHIPPING_COLLECT', label: '집화', location: '옥천 HUB', offsetHours: 24 },
  { status: 'SHIPPING', label: '배송중', location: '고객 지역 배송지점', offsetHours: 36 },
  { status: 'DELIVERED', label: '배송완료', location: '고객 주소', offsetHours: 54 },
];

// 현재 status 까지 노출할 타임라인 단계 수 (집화는 SHIPPING 단계에 포함)
const TRACKING_STAGE_COUNT = {
  PAID: 1,
  PREPARING: 2,
  SHIPPING: 4, // 결제완료 + 상품준비중 + 집화 + 배송중
  DELIVERED: 5,
};

// order id 를 10자리 숫자로 결정론적 해싱 (랜덤 아님) -> 'MC' + 10자리 송장번호
function trackingNumberFor(orderId) {
  const str = String(orderId ?? '');
  // FNV-1a 32bit 해시 (결정론적) — 같은 order id면 항상 같은 값
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // 두 번째 해시로 10자리를 안정적으로 채운다
  let hash2 = 0x811c9dc5 ^ hash;
  for (let i = 0; i < str.length; i++) {
    hash2 ^= str.charCodeAt(str.length - 1 - i);
    hash2 = Math.imul(hash2, 0x01000193) >>> 0;
  }
  const digits = `${hash}${hash2}`.replace(/\D/g, '').padStart(10, '0').slice(0, 10);
  return `MC${digits}`;
}

/**
 * 주문 상태를 다음 단계로 전진 — 단일 트랜잭션:
 *   PAID -> PREPARING -> SHIPPING -> DELIVERED
 *  - SHIPPING 진입 시 결정론적 tracking_number 부여 (order id 해시 기반, 랜덤 아님)
 *  - 이미 DELIVERED/CANCELED 면 err.code='INVALID_TRANSITION' throw
 *  - 본인 주문만 (isAdmin 이면 전체). 없거나 본인 주문 아니면 null 반환
 */
export async function advanceOrderStatus(orderId, username, { isAdmin = false } = {}) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    const order = rows[0];

    // 없거나 본인 주문이 아니면 null (관리자는 예외)
    if (!order || (!isAdmin && order.username !== username)) {
      await client.query('ROLLBACK');
      return null;
    }

    const next = ORDER_STATUS_NEXT[order.status];
    if (!next) {
      // DELIVERED / CANCELED 등 종료 상태에서 전진 시도
      const err = new Error('더 이상 진행할 수 없는 주문 상태입니다');
      err.code = 'INVALID_TRANSITION';
      err.currentStatus = order.status;
      throw err;
    }

    // SHIPPING 진입 시 송장번호 부여 (이미 있으면 유지 — 결정론적이라 동일값)
    let trackingNumber = order.tracking_number;
    if (next === 'SHIPPING' && !trackingNumber) {
      trackingNumber = trackingNumberFor(order.id);
    }

    const updated = await client.query(
      `UPDATE orders SET status = $1, tracking_number = $2 WHERE id = $3 RETURNING *`,
      [next, trackingNumber ?? null, orderId]
    );

    await client.query('COMMIT');
    return mapOrder(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 관리자 명시적 상태 지정 — 단일 트랜잭션:
 *  - status 는 허용 집합(ORDER_STATUS_SET) 이어야 한다 (아니면 err.code='INVALID_STATUS')
 *  - 없거나 본인 주문 아니면(비관리자) null
 *  - SHIPPING/DELIVERED 로 지정 시 송장번호가 없으면 결정론적으로 부여
 *  - 재고 원복 로직은 없음(취소는 cancelOrder 사용) — 상태값만 갱신
 */
export async function setOrderStatus(orderId, status, { isAdmin = false, username } = {}) {
  if (!ORDER_STATUS_SET.includes(status)) {
    const err = new Error('허용되지 않은 주문 상태입니다');
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    const order = rows[0];

    if (!order || (!isAdmin && order.username !== username)) {
      await client.query('ROLLBACK');
      return null;
    }

    // SHIPPING/DELIVERED 로 갈 때 송장번호 없으면 결정론적 부여 (기존 값 유지)
    let trackingNumber = order.tracking_number;
    if ((status === 'SHIPPING' || status === 'DELIVERED') && !trackingNumber) {
      trackingNumber = trackingNumberFor(order.id);
    }

    const updated = await client.query(
      `UPDATE orders SET status = $1, tracking_number = $2 WHERE id = $3 RETURNING *`,
      [status, trackingNumber ?? null, orderId]
    );

    await client.query('COMMIT');
    return mapOrder(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 주문의 배송 추적 이벤트 타임라인을 결정론적으로 파생한다.
 *  - order.status 와 order.createdAt 만으로 계산 (별도 저장 없음, 랜덤 없음)
 *  - 현재 상태까지의 이벤트만 포함 (결제완료 -> 상품준비중 -> 집화 -> 배송중 -> 배송완료)
 *  - 각 이벤트 시각은 createdAt 에서 고정 오프셋(시간)을 더한 값
 *  - CANCELED 는 결제완료 시점 이후 취소된 것으로 보고 결제완료 1건만 반환
 * 반환: [{ status, label, at, location }]
 */
export function getTrackingEvents(order) {
  if (!order) return [];
  const createdAt = order.createdAt ?? order.created_at;
  const base = createdAt ? new Date(createdAt) : new Date(0);
  const status = order.status;

  // 취소 주문은 결제완료 단계까지만 노출 (배송 타임라인 없음)
  const stageCount =
    status === 'CANCELED' ? 1 : (TRACKING_STAGE_COUNT[status] ?? 0);

  return TRACKING_STAGES.slice(0, stageCount).map((stage) => ({
    // 집화 단계는 내부 구분값(SHIPPING_COLLECT)을 외부에는 SHIPPING 으로 노출
    status: stage.status === 'SHIPPING_COLLECT' ? 'SHIPPING' : stage.status,
    label: stage.label,
    at: new Date(base.getTime() + stage.offsetHours * 3600 * 1000).toISOString(),
    location: stage.location,
  }));
}

// ---------------------------------------------------------------------------
// 결제
// ---------------------------------------------------------------------------

// 결제 레코드 생성 (id 는 호출부에서 결제키로 전달). 중복 id 는 PK 위반(23505) throw.
export async function createPayment({ id, orderId, username, method, cardLast4, amount, status, fault }) {
  const { rows } = await query(
    `INSERT INTO payments (id, order_id, username, method, card_last4, amount, status, fault)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      orderId ?? null,
      username ?? null,
      method,
      cardLast4 ?? null,
      amount,
      status,
      fault ?? null,
    ]
  );
  return mapPayment(rows[0]);
}

// 결제키로 결제 조회 (없으면 null)
export async function getPayment(paymentKey) {
  const { rows } = await query('SELECT * FROM payments WHERE id = $1', [paymentKey]);
  return mapPayment(rows[0] ?? null);
}

// 결제를 주문에 연결 (order_id 갱신). 없는 결제면 null 반환.
export async function markPaymentUsed(paymentKey, orderId) {
  const { rows } = await query(
    `UPDATE payments SET order_id = $1 WHERE id = $2 RETURNING *`,
    [orderId ?? null, paymentKey]
  );
  return mapPayment(rows[0] ?? null);
}

// ---------------------------------------------------------------------------
// 쿠폰
// ---------------------------------------------------------------------------

// 코드는 대문자로 저장되어 있으며 조회는 대소문자 무관
export async function getCoupon(code) {
  const { rows } = await query(
    'SELECT * FROM coupons WHERE code = UPPER($1)',
    [String(code ?? '')]
  );
  return mapCoupon(rows[0] ?? null);
}

// 쿠폰 생성 (관리자) — code 는 대문자로 저장. 중복 코드는 PK 위반(23505) ->
// err.code='COUPON_EXISTS' 로 재래핑해 호출부에서 409로 매핑한다.
export async function createCoupon({
  code,
  type,
  amount,
  minOrder = 0,
  maxDiscount = null,
  expiresAt = null,
  active = true,
}) {
  try {
    const { rows } = await query(
      `INSERT INTO coupons (code, type, amount, min_order, max_discount, expires_at, active)
       VALUES (UPPER($1), $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        String(code ?? ''),
        type,
        amount,
        minOrder ?? 0,
        maxDiscount ?? null,
        expiresAt ?? null,
        active ?? true,
      ]
    );
    return mapCoupon(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error('이미 존재하는 쿠폰 코드입니다');
      e.code = 'COUPON_EXISTS';
      throw e;
    }
    throw err;
  }
}

// 전체 쿠폰 목록 (관리자) — 만료 임박/신규 우선 정렬 후 코드 순
export async function listCoupons() {
  const { rows } = await query(
    `SELECT * FROM coupons ORDER BY code ASC`
  );
  return rows.map(mapCoupon);
}

// ---------------------------------------------------------------------------
// 사용자 보유 쿠폰 (user_coupons)
// ---------------------------------------------------------------------------

// 사용자 보유 쿠폰 상세 매퍼 (user_coupons JOIN coupons 결과)
// status 는 사용여부/만료/활성 여부로 파생한다.
function mapUserCoupon(row) {
  if (!row) return null;
  const usedAt = toIso(row.used_at);
  const expiresAt = toIso(row.expires_at);
  let status;
  if (usedAt) {
    status = 'USED';
  } else if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    status = 'EXPIRED';
  } else if (row.active) {
    status = 'AVAILABLE';
  } else {
    status = 'INACTIVE';
  }
  return {
    code: row.code,
    type: row.type,
    amount: row.amount,
    minOrder: row.min_order,
    maxDiscount: row.max_discount,
    expiresAt,
    registeredAt: toIso(row.registered_at),
    usedAt,
    orderId: row.order_id ?? null,
    status,
  };
}

// 사용자 쿠폰 등록 — 존재하지 않는 쿠폰이면 null 반환(호출부 -> 404).
// 이미 등록된 쿠폰은 PK 위반(23505) -> err.code='ALREADY_REGISTERED'.
// 성공 시 등록된 쿠폰 상세(status 포함)를 반환한다.
export async function registerUserCoupon(username, code) {
  const coupon = await getCoupon(code);
  if (!coupon) return null;

  try {
    await query(
      `INSERT INTO user_coupons (username, code)
       VALUES ($1, UPPER($2))`,
      [username, String(code ?? '')]
    );
  } catch (err) {
    if (err.code === '23505') {
      const e = new Error('이미 등록된 쿠폰입니다');
      e.code = 'ALREADY_REGISTERED';
      throw e;
    }
    throw err;
  }

  const { rows } = await query(
    `SELECT uc.username, uc.code, uc.registered_at, uc.used_at, uc.order_id,
            c.type, c.amount, c.min_order, c.max_discount, c.expires_at, c.active
       FROM user_coupons uc
       JOIN coupons c USING (code)
      WHERE uc.username = $1 AND uc.code = UPPER($2)`,
    [username, String(code ?? '')]
  );
  return mapUserCoupon(rows[0] ?? null);
}

// 사용자 보유 쿠폰 목록 — 사용 가능(AVAILABLE) 먼저, 그다음 등록 최신순
export async function listUserCoupons(username) {
  const { rows } = await query(
    `SELECT uc.username, uc.code, uc.registered_at, uc.used_at, uc.order_id,
            c.type, c.amount, c.min_order, c.max_discount, c.expires_at, c.active
       FROM user_coupons uc
       JOIN coupons c USING (code)
      WHERE uc.username = $1
      ORDER BY
        (CASE
           WHEN uc.used_at IS NOT NULL THEN 3
           WHEN c.expires_at IS NOT NULL AND c.expires_at < now() THEN 2
           WHEN c.active THEN 0
           ELSE 1
         END) ASC,
        uc.registered_at DESC`,
    [username]
  );
  return rows.map(mapUserCoupon);
}

// 사용자 보유 쿠폰을 사용됨으로 표시 (주문 시 best-effort).
// 등록되어 있지 않거나 이미 사용된 경우 no-op (throw 하지 않음).
export async function markUserCouponUsed(username, code, orderId) {
  await query(
    `UPDATE user_coupons
        SET used_at = now(), order_id = $3
      WHERE username = $1 AND code = UPPER($2) AND used_at IS NULL`,
    [username, String(code ?? ''), orderId ?? null]
  );
}

// ---------------------------------------------------------------------------
// 재고
// ---------------------------------------------------------------------------

export async function getStock(productId) {
  const { rows } = await query('SELECT id, stock FROM products WHERE id = $1', [productId]);
  if (!rows[0]) return null;
  return { productId: rows[0].id, stock: rows[0].stock };
}

// ---------------------------------------------------------------------------
// 리셋 (테스트 상태 초기화 — POST /api/reset 에서 호출)
// ---------------------------------------------------------------------------

// 전체 테이블 TRUNCATE 후 seedData.js 기준으로 재시드
export async function resetAll() {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `TRUNCATE products, users, reviews, wishlists, carts, orders, order_items, coupons, payments, user_coupons
       RESTART IDENTITY CASCADE`
    );

    // 상품 (id 1~18 고정)
    for (const p of SEED_PRODUCTS) {
      await client.query(
        `INSERT INTO products
           (id, name, category, original_price, discounted_price, price, discount_rate,
            image_url, images, description, specs, tags, stock, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          p.id,
          p.name,
          p.category,
          p.originalPrice,
          p.discountedPrice,
          p.price,
          p.discountRate,
          p.imageUrl,
          JSON.stringify(p.images),
          p.description,
          JSON.stringify(p.specs),
          JSON.stringify(p.tags),
          p.stock,
          p.active,
        ]
      );
    }
    // identity 시퀀스를 max(id) 다음부터 발급되도록 보정
    await client.query(
      `SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products))`
    );

    // 사용자 (비밀번호는 시드 시점에 scrypt 해시, avatar_url 은 시드 기본 null)
    for (const u of SEED_USERS) {
      await client.query(
        `INSERT INTO users (username, password_hash, email, role, status, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [u.username, hashPassword(u.password), u.email, u.role, u.status, u.avatarUrl ?? null]
      );
    }

    // 리뷰 (id 고정 + 시드 시각 유지, images 는 시드 기본 [])
    for (const r of SEED_REVIEWS) {
      await client.query(
        `INSERT INTO reviews (id, product_id, username, rating, comment, images, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [r.id, r.productId, r.username, r.rating, r.comment, JSON.stringify(r.images ?? []), r.createdAt]
      );
    }
    await client.query(
      `SELECT setval(pg_get_serial_sequence('reviews', 'id'), (SELECT MAX(id) FROM reviews))`
    );

    // 쿠폰 (코드는 대문자로 저장)
    for (const c of SEED_COUPONS) {
      await client.query(
        `INSERT INTO coupons (code, type, amount, min_order, max_discount, expires_at, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          c.code.toUpperCase(),
          c.type,
          c.amount,
          c.minOrder ?? 0,
          c.maxDiscount ?? null,
          c.expiresAt ?? null,
          c.active ?? true,
        ]
      );
    }

    // 시드 사용자 'test' 에게 WELCOME10 쿠폰을 미리 등록 (my-coupons UI 초기 데이터).
    // 등록만 하고 사용하지 않으므로 computeCoupon/쿠폰 검증 테스트에는 영향이 없다.
    await client.query(
      `INSERT INTO user_coupons (username, code) VALUES ('test', 'WELCOME10')`
    );

    await client.query('COMMIT');
    return ['products', 'users', 'reviews', 'wishlists', 'carts', 'orders', 'coupons', 'payments', 'user_coupons'];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
