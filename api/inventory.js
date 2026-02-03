/**
 * api/inventory.js - 상품 재고 확인 API
 *
 * GET  /api/inventory?productId=1 - 재고 정보 조회
 * HEAD /api/inventory?productId=1 - 재고 존재 여부만 확인 (헤더만 반환)
 *
 * QA 검증 포인트:
 * - HEAD 메서드 사용
 * - 커스텀 응답 헤더 검증
 * - Cache-Control 헤더
 * - ETag 사용
 * - 재고 부족 케이스 (status code 200이지만 stock=0)
 */

import { applyCors } from './_lib/common.js';

// 재고 데이터
const inventory = {
  1: { productId: 1, stock: 15, warehouse: 'Seoul', lastUpdated: '2024-02-01T10:00:00Z' },
  2: { productId: 2, stock: 8, warehouse: 'Seoul', lastUpdated: '2024-02-01T10:00:00Z' },
  3: { productId: 3, stock: 0, warehouse: 'Busan', lastUpdated: '2024-02-01T09:30:00Z' },
  4: { productId: 4, stock: 23, warehouse: 'Seoul', lastUpdated: '2024-02-01T11:00:00Z' },
  5: { productId: 5, stock: 5, warehouse: 'Incheon', lastUpdated: '2024-02-01T08:45:00Z' },
  6: { productId: 6, stock: 12, warehouse: 'Seoul', lastUpdated: '2024-02-01T10:30:00Z' },
  7: { productId: 7, stock: 30, warehouse: 'Busan', lastUpdated: '2024-02-01T09:00:00Z' },
  8: { productId: 8, stock: 0, warehouse: 'Seoul', lastUpdated: '2024-02-01T12:00:00Z' },
};

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

  // 재고 조회
  const stock = inventory[pid];

  // 요구사항 4: 재고 정보가 없으면 임의의 값 생성
  let stockData = stock;
  if (!stockData) {
    const randomStock = Math.floor(Math.random() * 30) + 1;
    const warehouses = ['Seoul', 'Busan', 'Incheon', 'Daegu'];
    const randomWarehouse = warehouses[Math.floor(Math.random() * warehouses.length)];
    
    stockData = {
      productId: pid,
      stock: randomStock,
      warehouse: randomWarehouse,
      lastUpdated: new Date().toISOString(),
    };
  }

  // 커스텀 헤더 설정
  res.setHeader('X-Product-Id', stockData.productId);
  res.setHeader('X-Stock-Count', stockData.stock);
  res.setHeader('X-Warehouse', stockData.warehouse);
  res.setHeader('X-Last-Updated', stockData.lastUpdated);

  // 재고 상태 헤더
  if (stockData.stock === 0) {
    res.setHeader('X-Stock-Status', 'OUT_OF_STOCK');
  } else if (stockData.stock < 5) {
    res.setHeader('X-Stock-Status', 'LOW_STOCK');
  } else {
    res.setHeader('X-Stock-Status', 'IN_STOCK');
  }

  // ETag 설정 (재고 변경 감지용)
  const etag = `"${stockData.productId}-${stockData.stock}-${stockData.lastUpdated}"`;
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
    warehouse: stockData.warehouse,
    lastUpdated: stockData.lastUpdated,
    status: stockData.stock === 0 ? 'OUT_OF_STOCK' :
            stockData.stock < 5 ? 'LOW_STOCK' : 'IN_STOCK',
  });
}
