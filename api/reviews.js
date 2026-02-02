/**
 * api/reviews.js - 상품 리뷰 API
 *
 * GET    /api/reviews?productId=1 - 리뷰 목록 조회
 * POST   /api/reviews - 리뷰 작성
 * PATCH  /api/reviews - 리뷰 수정
 * DELETE /api/reviews - 리뷰 삭제
 *
 * QA 검증 포인트:
 * - HTTP 메서드별 동작
 * - 인증 필요 (POST, PATCH, DELETE)
 * - 요청 본문 검증
 * - 별점 범위 검증 (1-5)
 * - 리뷰 길이 제한
 * - 존재하지 않는 리뷰 처리
 */

import { applyCors, requireUser } from './_lib/common.js';

// 메모리 저장소 (서버리스 환경이므로 재시작 시 초기화됨)
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

let nextId = 4;

// GET - 리뷰 목록 조회
function handleGet(req, res) {
  const { productId, username, minRating, maxRating } = req.query;

  let filtered = [...reviews];

  // 상품 ID 필터링
  if (productId) {
    const pid = Number(productId);
    if (isNaN(pid)) {
      return res.status(400).json({
        message: '상품 ID는 숫자여야 합니다',
        code: 'INVALID_PRODUCT_ID'
      });
    }
    filtered = filtered.filter(r => r.productId === pid);
  }

  // 사용자 이름 필터링
  if (username) {
    filtered = filtered.filter(r => r.username === username);
  }

  // 별점 범위 필터링
  if (minRating) {
    const min = Number(minRating);
    if (isNaN(min) || min < 1 || min > 5) {
      return res.status(400).json({
        message: '최소 별점은 1-5 사이여야 합니다',
        code: 'INVALID_MIN_RATING'
      });
    }
    filtered = filtered.filter(r => r.rating >= min);
  }

  if (maxRating) {
    const max = Number(maxRating);
    if (isNaN(max) || max < 1 || max > 5) {
      return res.status(400).json({
        message: '최대 별점은 1-5 사이여야 합니다',
        code: 'INVALID_MAX_RATING'
      });
    }
    filtered = filtered.filter(r => r.rating <= max);
  }

  // 최신순 정렬
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.status(200).json({
    count: filtered.length,
    reviews: filtered,
  });
}

// POST - 리뷰 작성
function handlePost(req, res, user) {
  const { productId, rating, comment } = req.body;

  // 필수 필드 검증
  if (!productId) {
    return res.status(400).json({
      message: '상품 ID는 필수입니다',
      code: 'PRODUCT_ID_REQUIRED'
    });
  }

  if (!rating) {
    return res.status(400).json({
      message: '별점은 필수입니다',
      code: 'RATING_REQUIRED'
    });
  }

  // 상품 ID 검증
  const pid = Number(productId);
  if (isNaN(pid) || pid <= 0) {
    return res.status(400).json({
      message: '유효하지 않은 상품 ID입니다',
      code: 'INVALID_PRODUCT_ID'
    });
  }

  // 별점 검증
  const r = Number(rating);
  if (isNaN(r) || r < 1 || r > 5) {
    return res.status(400).json({
      message: '별점은 1-5 사이여야 합니다',
      code: 'INVALID_RATING'
    });
  }

  // 코멘트 검증
  if (!comment || !comment.trim()) {
    return res.status(400).json({
      message: '리뷰 내용은 필수입니다',
      code: 'COMMENT_REQUIRED'
    });
  }

  if (comment.length > 500) {
    return res.status(400).json({
      message: '리뷰는 500자 이하여야 합니다',
      code: 'COMMENT_TOO_LONG'
    });
  }

  if (comment.trim().length < 10) {
    return res.status(400).json({
      message: '리뷰는 최소 10자 이상이어야 합니다',
      code: 'COMMENT_TOO_SHORT'
    });
  }

  // 중복 리뷰 체크
  const existing = reviews.find(
    r => r.productId === pid && r.username === user.username
  );
  if (existing) {
    return res.status(409).json({
      message: '이미 이 상품에 리뷰를 작성하셨습니다',
      code: 'REVIEW_ALREADY_EXISTS'
    });
  }

  // 리뷰 생성
  const newReview = {
    id: nextId++,
    productId: pid,
    username: user.username,
    rating: r,
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  reviews.push(newReview);

  return res.status(201).json({
    message: '리뷰가 작성되었습니다',
    review: newReview,
  });
}

// PATCH - 리뷰 수정
function handlePatch(req, res, user) {
  const { id, rating, comment } = req.body;

  // ID 검증
  if (!id) {
    return res.status(400).json({
      message: '리뷰 ID는 필수입니다',
      code: 'REVIEW_ID_REQUIRED'
    });
  }

  const reviewId = Number(id);
  if (isNaN(reviewId)) {
    return res.status(400).json({
      message: '유효하지 않은 리뷰 ID입니다',
      code: 'INVALID_REVIEW_ID'
    });
  }

  // 리뷰 찾기
  const index = reviews.findIndex(r => r.id === reviewId);
  if (index === -1) {
    return res.status(404).json({
      message: '리뷰를 찾을 수 없습니다',
      code: 'REVIEW_NOT_FOUND'
    });
  }

  // 권한 확인 (본인 리뷰만 수정 가능)
  if (reviews[index].username !== user.username && user.role !== 'ADMIN') {
    return res.status(403).json({
      message: '본인의 리뷰만 수정할 수 있습니다',
      code: 'FORBIDDEN'
    });
  }

  // 별점 검증 (제공된 경우)
  if (rating !== undefined) {
    const r = Number(rating);
    if (isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({
        message: '별점은 1-5 사이여야 합니다',
        code: 'INVALID_RATING'
      });
    }
    reviews[index].rating = r;
  }

  // 코멘트 검증 (제공된 경우)
  if (comment !== undefined) {
    if (!comment.trim()) {
      return res.status(400).json({
        message: '리뷰 내용은 비어있을 수 없습니다',
        code: 'COMMENT_REQUIRED'
      });
    }

    if (comment.length > 500) {
      return res.status(400).json({
        message: '리뷰는 500자 이하여야 합니다',
        code: 'COMMENT_TOO_LONG'
      });
    }

    if (comment.trim().length < 10) {
      return res.status(400).json({
        message: '리뷰는 최소 10자 이상이어야 합니다',
        code: 'COMMENT_TOO_SHORT'
      });
    }

    reviews[index].comment = comment.trim();
  }

  reviews[index].updatedAt = new Date().toISOString();

  return res.status(200).json({
    message: '리뷰가 수정되었습니다',
    review: reviews[index],
  });
}

// DELETE - 리뷰 삭제
function handleDelete(req, res, user) {
  const { id } = req.body;

  // ID 검증
  if (!id) {
    return res.status(400).json({
      message: '리뷰 ID는 필수입니다',
      code: 'REVIEW_ID_REQUIRED'
    });
  }

  const reviewId = Number(id);
  if (isNaN(reviewId)) {
    return res.status(400).json({
      message: '유효하지 않은 리뷰 ID입니다',
      code: 'INVALID_REVIEW_ID'
    });
  }

  // 리뷰 찾기
  const index = reviews.findIndex(r => r.id === reviewId);
  if (index === -1) {
    return res.status(404).json({
      message: '리뷰를 찾을 수 없습니다',
      code: 'REVIEW_NOT_FOUND'
    });
  }

  // 권한 확인 (본인 리뷰만 삭제 가능, 관리자는 모든 리뷰 삭제 가능)
  if (reviews[index].username !== user.username && user.role !== 'ADMIN') {
    return res.status(403).json({
      message: '본인의 리뷰만 삭제할 수 있습니다',
      code: 'FORBIDDEN'
    });
  }

  const deleted = reviews.splice(index, 1)[0];

  return res.status(200).json({
    message: '리뷰가 삭제되었습니다',
    review: deleted,
  });
}

export default async function reviewsHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  try {
    // GET은 인증 불필요
    if (req.method === 'GET') {
      return handleGet(req, res);
    }

    // POST, PATCH, DELETE는 인증 필요
    const user = requireUser(req, res);
    if (!user) return; // 401 이미 응답됨

    switch (req.method) {
      case 'POST':
        return handlePost(req, res, user);
      case 'PATCH':
        return handlePatch(req, res, user);
      case 'DELETE':
        return handleDelete(req, res, user);
      default:
        return res.status(405).json({
          message: '허용되지 않은 메서드',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Reviews API error:', error);
    return res.status(500).json({
      message: '서버 오류가 발생했습니다',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
