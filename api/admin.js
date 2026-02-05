/**
 * api/admin.js – 관리자 상품 CRUD (인증 필수, ADMIN 역할 필수)
 *
 * Endpoints (모두 /api/admin):
 *   GET    – 상품 목록 조회 (기본 목록 + 런타임 추가/삭제 반영)
 *   POST   – 상품 추가 (body: { name, category, originalPrice, discountedPrice, discountRate })
 *   PUT    – 상품 수정 (body: { id, name, originalPrice, discountedPrice, discountRate })
 *   DELETE – 상품 삭제 (body: { id })
 *
 * ★ 주의: Vercel Functions는 서버리스이므로 재배포/재시작 시 런타임 변경사항 초기화됨
 *   → QA 테스트 시 세션 내에서만 유효
 *
 * QA 검증 포인트:
 *   - 비로그인 → 401
 *   - 일반 유저(test) 로그인 → 403
 *   - admin 로그인 후 CRUD 정상 동작 검증
 *   - 유효성 검사 실패 → 400
 *   - 존재하지 않는 상품 수정/삭제 → 404
 */

import { applyCors, requireUser, requireAdmin } from './_lib/common.js';
import { getProductStore, addProduct, updateProduct, deleteProduct } from './_lib/productStore.js';

// ============================================
// GET – 상품 목록 조회
// ============================================
async function handleGet(req, res, user) {
  const products = getProductStore();
  return res.status(200).json({
    user,
    products,
  });
}

// ============================================
// POST – 상품 추가
// ============================================
async function handlePost(req, res, user) {
  const body = req.body || {};
  const { name, category, originalPrice, discountedPrice, discountRate } = body;

  // 필수 필드 검증
  if (!name || !name.trim()) {
    return res.status(400).json({ message: "상품명(name)은 필수입니다" });
  }
  if (!category || !["전자기기", "액세서리", "생활"].includes(category)) {
    return res.status(400).json({ message: "카테고리는 전자기기/액세서리/생활 중 하나여야 합니다" });
  }
  if (originalPrice == null || Number(originalPrice) <= 0) {
    return res.status(400).json({ message: "정가(originalPrice)는 양수여야 합니다" });
  }
  if (discountedPrice == null || Number(discountedPrice) <= 0) {
    return res.status(400).json({ message: "할인가(discountedPrice)는 양수여야 합니다" });
  }
  if (Number(discountedPrice) > Number(originalPrice)) {
    return res.status(400).json({ message: "할인가는 정가보다 작아야 합니다" });
  }

  // 새 ID = 현재 최대 ID + 1
  const productStore = getProductStore();
  const maxId = productStore.reduce((max, p) => Math.max(max, p.id), 0);
  const newProduct = {
    id: maxId + 1,
    name: name.trim(),
    category,
    originalPrice: Number(originalPrice),
    discountedPrice: Number(discountedPrice),
    price: Number(discountedPrice),
    discountRate: discountRate != null ? Number(discountRate) : 0,
    imageUrl: "",  // 이미지는 추가하지 않음 (placeholder 사용)
    description: `${name.trim()} 상품입니다.`,
    details: ["관리자로 추가된 상품"],
  };

  addProduct(newProduct);

  return res.status(201).json({
    message: "상품이 추가되었습니다",
    product: newProduct,
  });
}

// ============================================
// PUT – 상품 수정
// ============================================
async function handlePut(req, res, user) {
  const body = req.body || {};
  const { id, name, originalPrice, discountedPrice, discountRate, active } = body;

  if (!id || !Number.isInteger(Number(id))) {
    return res.status(400).json({ message: "수정할 상품의 id가 필수입니다" });
  }

  const productId = Number(id);
  const productStore = getProductStore();
  const product = productStore.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({ message: "해당 상품을 찾을 수 없습니다" });
  }

  // 제공된 필드만 수정 (부분 업데이트)
  const updates = {};
  if (name != null) updates.name = String(name).trim();
  if (originalPrice != null) updates.originalPrice = Number(originalPrice);
  if (discountedPrice != null) {
    updates.discountedPrice = Number(discountedPrice);
    updates.price = Number(discountedPrice);  // price도 동기
  }
  if (discountRate != null) updates.discountRate = Number(discountRate);
  if (active != null) updates.active = Boolean(active);  // active 필드 추가

  const updated = updateProduct(productId, updates);

  return res.status(200).json({
    message: "상품이 수정되었습니다",
    product: updated,
  });
}

// ============================================
// DELETE – 상품 삭제
// ============================================
async function handleDelete(req, res, user) {
  const body = req.body || {};
  const { id } = body;

  if (!id || !Number.isInteger(Number(id))) {
    return res.status(400).json({ message: "삭제할 상품의 id가 필수입니다" });
  }

  const productId = Number(id);
  const deleted = deleteProduct(productId);

  if (!deleted) {
    return res.status(404).json({ message: "해당 상품을 찾을 수 없습니다" });
  }

  return res.status(200).json({
    message: "상품이 삭제되었습니다",
    deletedProduct: deleted,
    products: getProductStore(),  // 삭제 후 최신 목록도 반환
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

  // 3. HTTP 메서드로 핸들러 분기
  switch (req.method) {
    case "GET":
      return handleGet(req, res, user);
    case "POST":
      return handlePost(req, res, user);
    case "PUT":
      return handlePut(req, res, user);
    case "DELETE":
      return handleDelete(req, res, user);
    default:
      return res.status(405).json({ message: "허용되지 않은 요청 메서드" });
  }
}
