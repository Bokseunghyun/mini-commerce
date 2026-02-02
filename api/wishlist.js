/**
 * api/wishlist.js - 위시리스트 API
 *
 * GET    /api/wishlist - 위시리스트 조회
 * POST   /api/wishlist - 위시리스트 추가
 * DELETE /api/wishlist - 위시리스트 삭제
 *
 * QA 검증 포인트:
 * - 인증 필수 (모든 메서드)
 * - 배열 응답 처리
 * - 중복 추가 방지
 * - 존재하지 않는 상품 처리
 * - 빈 위시리스트 처리
 */

import { applyCors, requireUser } from './_lib/common.js';

// 메모리 저장소 (사용자별 위시리스트)
const wishlists = new Map();

// GET - 위시리스트 조회
function handleGet(req, res, user) {
  const username = user.username;
  const wishlist = wishlists.get(username) || [];

  const { sort } = req.query;

  let sorted = [...wishlist];

  // 정렬
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

// POST - 위시리스트 추가
function handlePost(req, res, user) {
  const { productId, productName, price, imageUrl, category } = req.body;

  // 필수 필드 검증
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

  // 위시리스트 항목 생성
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

// DELETE - 위시리스트 삭제
function handleDelete(req, res, user) {
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

export default async function wishlistHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  try {
    // 모든 메서드에 인증 필요
    const user = requireUser(req, res);
    if (!user) return;

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, user);
      case 'POST':
        return handlePost(req, res, user);
      case 'DELETE':
        return handleDelete(req, res, user);
      default:
        return res.status(405).json({
          message: '허용되지 않은 메서드',
          code: 'METHOD_NOT_ALLOWED',
          allowedMethods: ['GET', 'POST', 'DELETE']
        });
    }
  } catch (error) {
    console.error('Wishlist API error:', error);
    return res.status(500).json({
      message: '서버 오류가 발생했습니다',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
