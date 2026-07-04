/**
 * api/inventory.js - 상품 재고 확인 API
 *
 * GET  /api/inventory?productId=1 - 재고 정보 조회
 * HEAD /api/inventory?productId=1 - 재고 존재 여부만 확인 (헤더만 반환)
 *
 * 재고는 Postgres(products.stock)에서 조회하므로 주문/취소에 따른 증감이 반영된다.
 *
 * QA 검증 포인트:
 * - HEAD 메서드 사용
 * - 커스텀 응답 헤더 검증
 * - Cache-Control 헤더
 * - ETag 사용
 * - 존재하지 않는 상품 404
 * - 재고 부족 케이스 (status code 200이지만 stock=0)
 */

import { applyCors } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { getStock } from './_lib/store.js';

// products 테이블에는 창고 메타데이터가 없으므로 고정값을 유지한다 (기존 응답 형태 보존)
const WAREHOUSE = 'Seoul';
const LAST_UPDATED = '2024-02-01T10:00:00Z';

export default async function inventoryHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  const { productId } = req.query;

  // 상품 ID 검증
  if (!productId) {
    res.setHeader('X-Error-Code', 'PRODUCT_ID_REQUIRED');
    return res.status(400).json({
      message: '상품 ID는 필수입니다',
      code: 'PRODUCT_ID_REQUIRED'
    });
  }

  const pid = Number(productId);
  if (isNaN(pid) || pid <= 0) {
    res.setHeader('X-Error-Code', 'INVALID_PRODUCT_ID');
    return res.status(400).json({
      message: '유효하지 않은 상품 ID입니다',
      code: 'INVALID_PRODUCT_ID'
    });
  }

  // DB 미설정 시 503 (인메모리 폴백 없음 — 단일 코드 경로)
  if (!isConfigured()) return respondDbNotConfigured(res);

  try {
    // 재고 조회 — Postgres products.stock (품절은 실제 재고 0일 때만 파생)
    const stockData = await getStock(pid);

    // 존재하지 않는 상품은 404
    if (!stockData) {
      res.setHeader('X-Error-Code', 'PRODUCT_NOT_FOUND');
      return res.status(404).json({
        message: '상품 없음',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // 커스텀 헤더 설정
    res.setHeader('X-Product-Id', stockData.productId);
    res.setHeader('X-Stock-Count', stockData.stock);
    res.setHeader('X-Warehouse', WAREHOUSE);
    res.setHeader('X-Last-Updated', LAST_UPDATED);

    // 재고 상태 헤더
    if (stockData.stock === 0) {
      res.setHeader('X-Stock-Status', 'OUT_OF_STOCK');
    } else if (stockData.stock < 5) {
      res.setHeader('X-Stock-Status', 'LOW_STOCK');
    } else {
      res.setHeader('X-Stock-Status', 'IN_STOCK');
    }

    // ETag 설정 (재고 변경 감지용)
    const etag = `"${stockData.productId}-${stockData.stock}-${LAST_UPDATED}"`;
    res.setHeader('ETag', etag);

    // Cache-Control 설정 (재고는 자주 변경되므로 짧은 캐시)
    res.setHeader('Cache-Control', 'public, max-age=60');

    // HEAD 요청이면 헤더만 반환
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // GET 요청이면 본문 포함
    return res.status(200).json({
      productId: stockData.productId,
      stock: stockData.stock,
      available: stockData.stock > 0,
      warehouse: WAREHOUSE,
      lastUpdated: LAST_UPDATED,
      status: stockData.stock === 0 ? 'OUT_OF_STOCK' :
              stockData.stock < 5 ? 'LOW_STOCK' : 'IN_STOCK',
    });
  } catch (error) {
    console.error('Inventory API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
