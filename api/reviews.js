/**
 * api/reviews.js - 상품 리뷰 API
 *
 * GET    /api/reviews?productId=1&sort=latest&limit=20&offset=0 - 리뷰 목록 조회
 * POST   /api/reviews - 리뷰 작성
 * PATCH  /api/reviews - 리뷰 수정
 * DELETE /api/reviews - 리뷰 삭제
 *
 * 리뷰는 Postgres(reviews 테이블)에 저장된다.
 * - 중복 작성 방지는 DB UNIQUE(product_id, username) 제약 → 23505 를 409로 매핑
 * - GET 응답 { count, reviews } 의 count는 limit/offset 적용 전 전체 매칭 건수
 *
 * QA 검증 포인트:
 * - HTTP 메서드별 동작
 * - 인증 필요 (POST, PATCH, DELETE)
 * - 요청 본문 검증
 * - 별점 범위 검증 (1-5)
 * - 리뷰 길이 제한
 * - 존재하지 않는 리뷰 처리
 * - 페이지네이션 (sort=latest|rating, limit 기본 20, offset 기본 0)
 */

import { applyCors, requireUser } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import {
  listReviews,
  getReview,
  createReview,
  updateReview,
  deleteReview,
} from './_lib/store.js';
import { validateReviewImages } from './_lib/upload-utils.js';

// 외부 정렬 파라미터 -> DAL 정렬 키 (화이트리스트 매핑)
const SORT_MAP = {
  latest: 'latest',
  rating: 'rating_desc',
};

// GET - 리뷰 목록 조회 (공개)
async function handleGet(req, res) {
  const { productId, username, minRating, maxRating, sort, limit, offset } = req.query;

  // 상품 ID 필터링 검증
  let pid;
  if (productId) {
    pid = Number(productId);
    if (isNaN(pid)) {
      return res.status(400).json({
        message: '상품 ID는 숫자여야 합니다',
        code: 'INVALID_PRODUCT_ID'
      });
    }
  }

  // 별점 범위 검증
  if (minRating) {
    const min = Number(minRating);
    if (isNaN(min) || min < 1 || min > 5) {
      return res.status(400).json({
        message: '최소 별점은 1-5 사이여야 합니다',
        code: 'INVALID_MIN_RATING'
      });
    }
  }

  if (maxRating) {
    const max = Number(maxRating);
    if (isNaN(max) || max < 1 || max > 5) {
      return res.status(400).json({
        message: '최대 별점은 1-5 사이여야 합니다',
        code: 'INVALID_MAX_RATING'
      });
    }
  }

  // 정렬 옵션 검증 (기본: latest)
  if (sort && !SORT_MAP[sort]) {
    return res.status(400).json({
      message: '정렬 옵션이 유효하지 않습니다. 사용 가능한 옵션: latest, rating',
      code: 'INVALID_SORT_OPTION'
    });
  }

  // limit 검증 (기본: 20)
  let limitNum = 20;
  if (limit !== undefined && limit !== '') {
    limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        message: 'limit은 1-100 사이 정수여야 합니다',
        code: 'INVALID_LIMIT'
      });
    }
  }

  // offset 검증 (기본: 0)
  let offsetNum = 0;
  if (offset !== undefined && offset !== '') {
    offsetNum = Number(offset);
    if (!Number.isInteger(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        message: 'offset은 0 이상 정수여야 합니다',
        code: 'INVALID_OFFSET'
      });
    }
  }

  // count는 limit/offset 적용 전 전체 매칭 건수
  const { count, reviews } = await listReviews({
    productId: pid,
    username,
    minRating,
    maxRating,
    sort: SORT_MAP[sort] || 'latest',
    limit: limitNum,
    offset: offsetNum,
  });

  return res.status(200).json({
    count,
    reviews,
  });
}

// POST - 리뷰 작성
async function handlePost(req, res, user) {
  const { productId, rating, comment, images } = req.body || {};

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

  // 코멘트 타입 검증 (숫자/배열 등이 들어오면 .trim() 호출 시 500이 나므로 400으로 방어)
  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    return res.status(400).json({
      message: '리뷰 내용은 문자열이어야 합니다',
      code: 'INVALID_COMMENT_TYPE'
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

  // 이미지 검증 (선택, 최대 3개, data URL 이미지 또는 http(s) URL)
  const imgResult = validateReviewImages(images);
  if (!imgResult.ok) {
    return res.status(imgResult.status).json({
      message: imgResult.message,
      code: imgResult.code,
    });
  }

  // 리뷰 생성 — 중복 작성은 DB UNIQUE(product_id, username) 위반(23505)으로 감지
  let newReview;
  try {
    newReview = await createReview({
      productId: pid,
      username: user.username,
      rating: r,
      comment: comment.trim(),
      images: imgResult.images,
    });
  } catch (error) {
    if (error && error.code === '23505') {
      return res.status(409).json({
        message: '이미 이 상품에 리뷰를 작성하셨습니다',
        code: 'REVIEW_ALREADY_EXISTS'
      });
    }
    throw error; // 나머지 DB 오류는 바깥 try에서 500 처리
  }

  return res.status(201).json({
    message: '리뷰가 작성되었습니다',
    review: newReview,
  });
}

// PATCH - 리뷰 수정
async function handlePatch(req, res, user) {
  const { id, rating, comment, images } = req.body || {};

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
  const review = await getReview(reviewId);
  if (!review) {
    return res.status(404).json({
      message: '리뷰를 찾을 수 없습니다',
      code: 'REVIEW_NOT_FOUND'
    });
  }

  // 권한 확인 (본인 리뷰만 수정 가능, 관리자는 모든 리뷰 수정 가능)
  if (review.username !== user.username && user.role !== 'ADMIN') {
    return res.status(403).json({
      message: '본인의 리뷰만 수정할 수 있습니다',
      code: 'FORBIDDEN'
    });
  }

  const patch = {};

  // 별점 검증 (제공된 경우)
  if (rating !== undefined) {
    const r = Number(rating);
    if (isNaN(r) || r < 1 || r > 5) {
      return res.status(400).json({
        message: '별점은 1-5 사이여야 합니다',
        code: 'INVALID_RATING'
      });
    }
    patch.rating = r;
  }

  // 코멘트 검증 (제공된 경우)
  if (comment !== undefined) {
    // 타입 검증 (문자열이 아니면 .trim() 호출 시 500이 나므로 400으로 방어)
    if (typeof comment !== 'string') {
      return res.status(400).json({
        message: '리뷰 내용은 문자열이어야 합니다',
        code: 'INVALID_COMMENT_TYPE'
      });
    }

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

    patch.comment = comment.trim();
  }

  // 이미지 검증 (제공된 경우, 최대 3개)
  if (images !== undefined) {
    const imgResult = validateReviewImages(images);
    if (!imgResult.ok) {
      return res.status(imgResult.status).json({
        message: imgResult.message,
        code: imgResult.code,
      });
    }
    patch.images = imgResult.images;
  }

  const updated = await updateReview(reviewId, patch);

  return res.status(200).json({
    message: '리뷰가 수정되었습니다',
    review: updated,
  });
}

// DELETE - 리뷰 삭제
async function handleDelete(req, res, user) {
  const { id } = req.body || {};

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
  const review = await getReview(reviewId);
  if (!review) {
    return res.status(404).json({
      message: '리뷰를 찾을 수 없습니다',
      code: 'REVIEW_NOT_FOUND'
    });
  }

  // 권한 확인 (본인 리뷰만 삭제 가능, 관리자는 모든 리뷰 삭제 가능)
  if (review.username !== user.username && user.role !== 'ADMIN') {
    return res.status(403).json({
      message: '본인의 리뷰만 삭제할 수 있습니다',
      code: 'FORBIDDEN'
    });
  }

  const deleted = await deleteReview(reviewId);

  return res.status(200).json({
    message: '리뷰가 삭제되었습니다',
    review: deleted,
  });
}

export default async function reviewsHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (인메모리 폴백 없음 — 단일 코드 경로)
  if (!isConfigured()) return respondDbNotConfigured(res);

  try {
    // GET은 인증 불필요
    if (req.method === 'GET') {
      return await handleGet(req, res);
    }

    // POST, PATCH, DELETE는 인증 필요
    const user = requireUser(req, res);
    if (!user) return; // 401 이미 응답됨

    switch (req.method) {
      case 'POST':
        return await handlePost(req, res, user);
      case 'PATCH':
        return await handlePatch(req, res, user);
      case 'DELETE':
        return await handleDelete(req, res, user);
      default:
        return res.status(405).json({
          message: '허용되지 않은 메서드',
          code: 'METHOD_NOT_ALLOWED'
        });
    }
  } catch (error) {
    console.error('Reviews API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
