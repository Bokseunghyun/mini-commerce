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
import { SCHEMA_SQL } from './schema.js';
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

// ---------------------------------------------------------------------------
// 스키마
// ---------------------------------------------------------------------------

// CREATE TABLE IF NOT EXISTS DDL 실행 (여러 번 호출해도 안전)
export async function ensureSchema() {
  await query(SCHEMA_SQL);
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
  const orderSql = PRODUCT_SORTS[sort] || 'id ASC'; // 화이트리스트 매핑 (값 보간 아님)

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

export async function createReview({ productId, username, rating, comment }) {
  // (product_id, username) UNIQUE 제약 — 중복 작성 시 23505 throw, 호출부에서 409로 매핑
  const { rows } = await query(
    `INSERT INTO reviews (product_id, username, rating, comment)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [productId, username, rating, comment]
  );
  return mapReview(rows[0]);
}

export async function updateReview(id, { rating, comment } = {}) {
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
export async function createOrder({ username, items, couponCode, discount, totalPrice, finalPrice, shipping }) {
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
      `INSERT INTO orders (id, username, status, total_price, discount, final_price, coupon_code, shipping)
       VALUES ($1, $2, 'PAID', $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        orderId,
        username,
        totalPrice,
        discount ?? 0,
        finalPrice,
        couponCode ?? null,
        JSON.stringify(shipping ?? {}),
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
      `TRUNCATE products, users, reviews, wishlists, carts, orders, order_items, coupons
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

    // 사용자 (비밀번호는 시드 시점에 scrypt 해시)
    for (const u of SEED_USERS) {
      await client.query(
        `INSERT INTO users (username, password_hash, email, role, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [u.username, hashPassword(u.password), u.email, u.role, u.status]
      );
    }

    // 리뷰 (id 고정 + 시드 시각 유지)
    for (const r of SEED_REVIEWS) {
      await client.query(
        `INSERT INTO reviews (id, product_id, username, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [r.id, r.productId, r.username, r.rating, r.comment, r.createdAt]
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

    await client.query('COMMIT');
    return ['products', 'users', 'reviews', 'wishlists', 'carts', 'orders', 'coupons'];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
