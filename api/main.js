/**
 * api/main.js - 통합 API 핸들러
 * 
 * 통합된 엔드포인트:
 * - /api/main?action=login
 * - /api/main?action=cart
 * - /api/main?action=order
 * - /api/main?action=inventory
 * - /api/main?action=reviews
 * - /api/main?action=search
 */

import { applyCors, requireUser } from './_lib/common.js';
import jwt from 'jsonwebtoken';
import { PRODUCTS } from './_data/products.js';

const SECRET = process.env.JWT_SECRET || 'demo-secret-key';

// ============================================
// 사용자 데이터
// ============================================
const USERS = [
  { username: 'test', password: '1234', role: 'USER', status: 'ACTIVE' },
  { username: 'admin', password: '1234', role: 'ADMIN', status: 'ACTIVE' },
  { username: 'test2', password: '1234', role: 'USER', status: 'BLOCKED' },
];

// ============================================
// 리뷰 데이터
// ============================================
let reviews = [
  {
    id: 1,
    productId: 1,
    username: 'test',
    rating: 5,
    comment: '음질이 정말 좋아요! 노이즈 캔슬링도 훌륭합니다.',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    productId: 1,
    username: 'user123',
    rating: 4,
    comment: '가격 대비 만족스럽습니다.',
    createdAt: '2024-01-20T14:20:00Z',
    updatedAt: '2024-01-20T14:20:00Z',
  },
  {
    id: 3,
    productId: 2,
    username: 'test',
    rating: 5,
    comment: '운동할 때 정말 유용해요!',
    createdAt: '2024-01-25T09:15:00Z',
    updatedAt: '2024-01-25T09:15:00Z',
  },
];

let nextReviewId = 4;

// ============================================
// 재고 데이터
// ============================================
let inventory = {
  1: { stock: 50, reserved: 0, lastUpdated: new Date().toISOString() },
  2: { stock: 30, reserved: 0, lastUpdated: new Date().toISOString() },
  3: { stock: 0, reserved: 0, lastUpdated: new Date().toISOString() },
  4: { stock: 0, reserved: 0, lastUpdated: new Date().toISOString() },
  5: { stock: 100, reserved: 0, lastUpdated: new Date().toISOString() },
  6: { stock: 25, reserved: 0, lastUpdated: new Date().toISOString() },
  7: { stock: 40, reserved: 0, lastUpdated: new Date().toISOString() },
  8: { stock: 60, reserved: 0, lastUpdated: new Date().toISOString() },
};

// ============================================
// LOGIN 핸들러
// ============================================
function handleLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 요청' });
  }

  const body = req.body || {};
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '').trim();

  if (!username && !password) {
    return res.status(400).json({ message: 'username, password 필수' });
  }
  if (!username) {
    return res.status(400).json({ message: 'username 필수' });
  }
  if (!password) {
    return res.status(400).json({ message: 'password 필수' });
  }

  const user = USERS.find((u) => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ message: '아이디 또는 비밀번호 오류' });
  }

  if (user.status === 'BLOCKED') {
    return res.status(403).json({ message: '차단된 계정입니다' });
  }

  const token = jwt.sign({ username: user.username, role: user.role }, SECRET, {
    expiresIn: '1h',
  });

  return res.status(200).json({
    token,
    user: { username: user.username, role: user.role },
  });
}

// ============================================
// CART 핸들러
// ============================================
function handleCart(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 요청' });
  }

  const body = req.body || {};
  const action = String(body.action || '').trim();
  const cart = Array.isArray(body.cart) ? body.cart : null;

  if (!action) return res.status(400).json({ message: 'action 필수' });
  if (!cart) return res.status(400).json({ message: 'cart 필수' });

  if (action === 'remove') {
    const index = Number(body.index);
    if (!Number.isInteger(index) || index < 0 || index >= cart.length) {
      return res.status(400).json({ message: 'index 오류' });
    }

    const next = cart.slice();
    next.splice(index, 1);

    return res.status(200).json({
      user,
      cart: next,
    });
  }

  return res.status(400).json({ message: '지원하지 않는 action' });
}

// ============================================
// ORDER 핸들러
// ============================================
function handleOrder(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않은 요청' });
  }

  const BLOCKED_ORDER_IDS = new Set([3, 4]);
  const body = req.body || {};
  const itemsRaw = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.cart)
    ? body.cart
    : null;

  if (!itemsRaw) return res.status(400).json({ message: 'items(또는 cart) 필수' });
  if (itemsRaw.length === 0)
    return res.status(400).json({ message: '주문할 상품이 없습니다' });

  const items = itemsRaw.map((raw) => {
    const id = Number(raw?.id || 0);
    const name = String(raw?.name || '').trim();
    let price = Number(raw?.price);
    if (!Number.isFinite(price)) price = Number(raw?.discountedPrice);
    const quantity = Math.max(1, Number(raw?.quantity || 1));
    return { id, name, price, quantity };
  });

  for (const it of items) {
    if (!it.id || !it.name) {
      return res.status(400).json({ message: '상품 데이터 오류(id/name)' });
    }
    if (!Number.isFinite(it.price) || it.price <= 0) {
      return res.status(400).json({ message: `상품 가격 오류: ${it.name}` });
    }
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
      return res.status(400).json({ message: `상품 수량 오류: ${it.name}` });
    }
  }

  const blocked = items.find((it) => BLOCKED_ORDER_IDS.has(it.id));
  if (blocked) {
    return res.status(422).json({
      message: `주문 불가 상품 포함(의도적 오류): ${blocked.name} (id=${blocked.id})`,
    });
  }

  const totalPrice = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  return res.status(200).json({
    user,
    message: '주문 완료',
    totalPrice,
    items,
  });
}

// ============================================
// INVENTORY 핸들러
// ============================================
function handleInventory(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { productId } = req.query;
    if (productId) {
      const id = Number(productId);
      const item = inventory[id];
      if (!item) {
        return res.status(404).json({ message: '재고 정보 없음' });
      }
      return res.status(200).json({ productId: id, ...item });
    }
    return res.status(200).json(inventory);
  }

  if (req.method === 'POST') {
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: '관리자 권한 필요' });
    }

    const { productId, stock } = req.body;
    const id = Number(productId);
    const newStock = Number(stock);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'productId 오류' });
    }
    if (!Number.isInteger(newStock) || newStock < 0) {
      return res.status(400).json({ message: 'stock 오류' });
    }

    inventory[id] = {
      stock: newStock,
      reserved: inventory[id]?.reserved || 0,
      lastUpdated: new Date().toISOString(),
    };

    return res.status(200).json({
      message: '재고 업데이트 완료',
      productId: id,
      ...inventory[id],
    });
  }

  return res.status(405).json({ message: '허용되지 않은 요청' });
}

// ============================================
// REVIEWS 핸들러
// ============================================
function handleReviews(req, res) {
  if (req.method === 'GET') {
    const { productId } = req.query;
    if (productId) {
      const id = Number(productId);
      const filtered = reviews.filter((r) => r.productId === id);
      return res.status(200).json(filtered);
    }
    return res.status(200).json(reviews);
  }

  const user = requireUser(req, res);
  if (!user) return;

  if (req.method === 'POST') {
    const { productId, rating, comment } = req.body;
    const id = Number(productId);
    const rate = Number(rating);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'productId 필수' });
    }
    if (!Number.isInteger(rate) || rate < 1 || rate > 5) {
      return res.status(400).json({ message: '별점은 1-5 사이여야 합니다' });
    }
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: '리뷰 내용 필수' });
    }
    if (comment.length > 500) {
      return res.status(400).json({ message: '리뷰는 500자 이하여야 합니다' });
    }

    const newReview = {
      id: nextReviewId++,
      productId: id,
      username: user.username,
      rating: rate,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    reviews.push(newReview);
    return res.status(201).json(newReview);
  }

  if (req.method === 'PATCH') {
    const { reviewId, rating, comment } = req.body;
    const id = Number(reviewId);
    const review = reviews.find((r) => r.id === id);

    if (!review) {
      return res.status(404).json({ message: '리뷰를 찾을 수 없습니다' });
    }
    if (review.username !== user.username) {
      return res.status(403).json({ message: '본인의 리뷰만 수정 가능합니다' });
    }

    if (rating !== undefined) {
      const rate = Number(rating);
      if (!Number.isInteger(rate) || rate < 1 || rate > 5) {
        return res.status(400).json({ message: '별점은 1-5 사이여야 합니다' });
      }
      review.rating = rate;
    }

    if (comment !== undefined) {
      if (!comment || comment.trim().length === 0) {
        return res.status(400).json({ message: '리뷰 내용 필수' });
      }
      if (comment.length > 500) {
        return res.status(400).json({ message: '리뷰는 500자 이하여야 합니다' });
      }
      review.comment = comment.trim();
    }

    review.updatedAt = new Date().toISOString();
    return res.status(200).json(review);
  }

  if (req.method === 'DELETE') {
    const { reviewId } = req.body;
    const id = Number(reviewId);
    const index = reviews.findIndex((r) => r.id === id);

    if (index === -1) {
      return res.status(404).json({ message: '리뷰를 찾을 수 없습니다' });
    }

    const review = reviews[index];
    if (review.username !== user.username && user.role !== 'ADMIN') {
      return res.status(403).json({ message: '본인의 리뷰만 삭제 가능합니다' });
    }

    reviews.splice(index, 1);
    return res.status(200).json({ message: '리뷰가 삭제되었습니다' });
  }

  return res.status(405).json({ message: '허용되지 않은 요청' });
}

// ============================================
// SEARCH 핸들러
// ============================================
function handleSearch(req, res) {
  const user = requireUser(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ message: '허용되지 않은 요청' });
  }

  const { q, category, minPrice, maxPrice, sortBy } = req.query;

  // PRODUCTS 사용
  let filtered = [...PRODUCTS];

  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
  }

  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }

  if (minPrice) {
    const min = Number(minPrice);
    filtered = filtered.filter((p) => p.price >= min);
  }

  if (maxPrice) {
    const max = Number(maxPrice);
    filtered = filtered.filter((p) => p.price <= max);
  }

  if (sortBy === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
  }

  return res.status(200).json({
    count: filtered.length,
    products: filtered,
  });
}

// ============================================
// 메인 라우터
// ============================================
export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  const { action } = req.query;

  switch (action) {
    case 'login':
      return handleLogin(req, res);
    case 'cart':
      return handleCart(req, res);
    case 'order':
      return handleOrder(req, res);
    case 'inventory':
      return handleInventory(req, res);
    case 'reviews':
      return handleReviews(req, res);
    case 'search':
      return handleSearch(req, res);
    default:
      return res.status(400).json({ message: 'action 파라미터 필요' });
  }
}
