/**
 * api/admin.js – 관리자 상품 CRUD (인증 필수, ADMIN 역할 필수)
 *
 * Endpoints (모두 /api/admin):
 *   GET    – 상품 목록 조회 (비활성 상품 포함 전체 목록)
 *   POST   – 상품 추가 (body: { name, category, originalPrice, discountedPrice, discountRate })
 *   PUT    – 상품 수정 (body: { id, name, originalPrice, discountedPrice, discountRate, active })
 *   DELETE – 상품 삭제 (body: { id })
 *
 * 상품 데이터는 Postgres에 저장되므로 여러 인스턴스/재배포에도 변경사항이 유지된다.
 * (초기 상태로 되돌리려면 POST /api/reset 또는 npm run db:init)
 *
 * QA 검증 포인트:
 *   - 비로그인 → 401
 *   - 일반 유저(test) 로그인 → 403
 *   - admin 로그인 후 CRUD 정상 동작 검증
 *   - 유효성 검사 실패 → 400
 *   - 존재하지 않는 상품 수정/삭제 → 404
 */

import { applyCors, requireUser, requireAdmin } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from './_lib/store.js';

// ============================================
// GET – 상품 목록 조회 (비활성 포함)
// ============================================
async function handleGet(req, res, user) {
  const products = await listProducts({ includeInactive: true });
  return res.status(200).json({
    user,
    products,
  });
}

// ============================================
// POST – 상품 추가
// ============================================
async function handlePost(req, res) {
  const body = req.body || {};
  const { name, category, originalPrice, discountedPrice, discountRate } = body;

  // 필수 필드 검증 (name은 문자열 타입까지 확인 — 숫자 등이 오면 .trim()에서 500 방지)
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: "상품명(name)은 필수입니다", code: 'INVALID_NAME' });
  }
  if (!category || !["전자기기", "액세서리", "생활"].includes(category)) {
    return res.status(400).json({ message: "카테고리는 전자기기/액세서리/생활 중 하나여야 합니다", code: 'INVALID_CATEGORY' });
  }
  // 가격 검증 (Number.isFinite로 NaN/Infinity 거부)
  if (originalPrice == null || !Number.isFinite(Number(originalPrice)) || Number(originalPrice) <= 0) {
    return res.status(400).json({ message: "정가(originalPrice)는 양수여야 합니다", code: 'INVALID_ORIGINAL_PRICE' });
  }
  if (discountedPrice == null || !Number.isFinite(Number(discountedPrice)) || Number(discountedPrice) <= 0) {
    return res.status(400).json({ message: "할인가(discountedPrice)는 양수여야 합니다", code: 'INVALID_DISCOUNTED_PRICE' });
  }
  if (Number(discountedPrice) > Number(originalPrice)) {
    return res.status(400).json({ message: "할인가는 정가보다 작아야 합니다", code: 'INVALID_PRICE_RANGE' });
  }
  // 할인율 검증 (제공된 경우 0~100 범위)
  if (discountRate != null && (!Number.isFinite(Number(discountRate)) || Number(discountRate) < 0 || Number(discountRate) > 100)) {
    return res.status(400).json({ message: "할인율(discountRate)은 0~100 사이 숫자여야 합니다", code: 'INVALID_DISCOUNT_RATE' });
  }

  // 이미지: 클라이언트가 보낸 imageUrl 사용, 없으면 서버에서 랜덤 이미지 생성
  const imageUrl =
    typeof body.imageUrl === 'string' && body.imageUrl.trim()
      ? body.imageUrl.trim()
      : `https://picsum.photos/seed/mc${Math.floor(Math.random() * 100000)}/400/400`;
  const images = Array.isArray(body.images) && body.images.length ? body.images : [imageUrl];

  // ID는 DB identity가 발급 (시드 max id 이후부터)
  const newProduct = await createProduct({
    name: name.trim(),
    category,
    originalPrice: Number(originalPrice),
    discountedPrice: Number(discountedPrice),
    price: Number(discountedPrice),
    discountRate: discountRate != null ? Number(discountRate) : 0,
    imageUrl,
    images,
    description: `${name.trim()} 상품입니다.`,
  });

  return res.status(201).json({
    message: "상품이 추가되었습니다",
    product: newProduct,
  });
}

// ============================================
// PUT – 상품 수정
// ============================================
async function handlePut(req, res) {
  const body = req.body || {};
  const { id, name, originalPrice, discountedPrice, discountRate, active } = body;

  if (!id || !Number.isInteger(Number(id))) {
    return res.status(400).json({ message: "수정할 상품의 id가 필수입니다", code: 'INVALID_ID' });
  }

  const productId = Number(id);
  const product = await getProduct(productId);

  if (!product) {
    return res.status(404).json({ message: "해당 상품을 찾을 수 없습니다", code: 'PRODUCT_NOT_FOUND' });
  }

  // 제공된 필드 검증 (부분 업데이트라도 값이 오면 유효해야 함)
  if (name != null && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ message: "상품명(name)은 비어있지 않은 문자열이어야 합니다", code: 'INVALID_NAME' });
  }
  if (originalPrice != null && (!Number.isFinite(Number(originalPrice)) || Number(originalPrice) <= 0)) {
    return res.status(400).json({ message: "정가(originalPrice)는 양수여야 합니다", code: 'INVALID_ORIGINAL_PRICE' });
  }
  if (discountedPrice != null && (!Number.isFinite(Number(discountedPrice)) || Number(discountedPrice) <= 0)) {
    return res.status(400).json({ message: "할인가(discountedPrice)는 양수여야 합니다", code: 'INVALID_DISCOUNTED_PRICE' });
  }
  if (discountRate != null && (!Number.isFinite(Number(discountRate)) || Number(discountRate) < 0 || Number(discountRate) > 100)) {
    return res.status(400).json({ message: "할인율(discountRate)은 0~100 사이 숫자여야 합니다", code: 'INVALID_DISCOUNT_RATE' });
  }

  // 제공된 필드만 수정 (부분 업데이트)
  const updates = {};
  if (name != null) updates.name = name.trim();
  if (originalPrice != null) updates.originalPrice = Number(originalPrice);
  if (discountedPrice != null) {
    updates.discountedPrice = Number(discountedPrice);
    updates.price = Number(discountedPrice);  // price도 동기
  }
  if (discountRate != null) updates.discountRate = Number(discountRate);
  if (active != null) updates.active = Boolean(active);

  const updated = await updateProduct(productId, updates);

  return res.status(200).json({
    message: "상품이 수정되었습니다",
    product: updated,
  });
}

// ============================================
// DELETE – 상품 삭제
// ============================================
async function handleDelete(req, res) {
  const body = req.body || {};
  const { id } = body;

  if (!id || !Number.isInteger(Number(id))) {
    return res.status(400).json({ message: "삭제할 상품의 id가 필수입니다", code: 'INVALID_ID' });
  }

  const productId = Number(id);
  const deleted = await deleteProduct(productId);

  if (!deleted) {
    return res.status(404).json({ message: "해당 상품을 찾을 수 없습니다", code: 'PRODUCT_NOT_FOUND' });
  }

  return res.status(200).json({
    message: "상품이 삭제되었습니다",
    deletedProduct: deleted,
    products: await listProducts({ includeInactive: true }),  // 삭제 후 최신 목록도 반환
  });
}

// ============================================
// 메인 핸들러 – HTTP 메서드로 분기
// ============================================
export default async function adminRoutes(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // 1. 인증 검증 (토큰 필수)
  const user = requireUser(req, res);
  if (!user) return;  // 401 이미 응답됨

  // 2. 관리자 권한 검증 (role === 'ADMIN')
  if (!requireAdmin(user, res)) return;  // 403 이미 응답됨

  // 3. DB 미설정 시 503 (인메모리 폴백 없음 — 단일 코드 경로)
  if (!isConfigured()) return respondDbNotConfigured(res);

  // 4. HTTP 메서드로 핸들러 분기
  try {
    switch (req.method) {
      case "GET":
        return await handleGet(req, res, user);
      case "POST":
        return await handlePost(req, res);
      case "PUT":
        return await handlePut(req, res);
      case "DELETE":
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ message: "허용되지 않은 요청 메서드", code: 'METHOD_NOT_ALLOWED' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ message: '서버 내부 오류', code: 'INTERNAL_SERVER_ERROR' });
  }
}
