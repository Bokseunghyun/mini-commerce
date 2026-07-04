/**
 * api/search.js - 상품 검색 API
 *
 * GET /api/search?q=검색어&category=카테고리&minPrice=최소가격&maxPrice=최대가격&sort=정렬
 *
 * 검색 대상은 Postgres의 전체 상품이다 (기존 5개 하드코딩 목록 드리프트 해소).
 *
 * QA 검증 포인트:
 * - 쿼리 파라미터 검증
 * - 빈 검색어 처리
 * - 가격 범위 검증
 * - 정렬 옵션 검증
 * - 결과 없음 처리
 */

import { applyCors } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { listProducts } from './_lib/store.js';

// 외부 정렬 파라미터 -> DAL 정렬 키 (화이트리스트 매핑)
const SORT_MAP = {
  'price-asc': 'price_asc',
  'price-desc': 'price_desc',
  name: 'name',
  discount: 'discount',
};

export default async function searchHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    const { q, category, minPrice, maxPrice, sort } = req.query;

    // 검색어 타입 검증 — .trim() 호출 전에 먼저 확인해야 함
    // (q가 배열 등으로 파싱되면 q.trim()에서 500이 나므로 400으로 방어)
    if (q !== undefined && q !== null && typeof q !== 'string') {
      return res.status(400).json({
        message: '검색어는 문자열이어야 합니다',
        code: 'INVALID_QUERY_TYPE'
      });
    }

    // 검색어 검증 (빈 문자열)
    if (q !== undefined && q !== null && !q.trim()) {
      return res.status(400).json({
        message: '검색어를 입력해주세요',
        code: 'EMPTY_QUERY'
      });
    }

    // 검색어 길이 제한
    if (q && q.length > 100) {
      return res.status(400).json({
        message: '검색어는 100자 이하여야 합니다',
        code: 'QUERY_TOO_LONG'
      });
    }

    // 가격 범위 검증
    if (minPrice && isNaN(Number(minPrice))) {
      return res.status(400).json({
        message: '최소 가격은 숫자여야 합니다',
        code: 'INVALID_MIN_PRICE'
      });
    }

    if (maxPrice && isNaN(Number(maxPrice))) {
      return res.status(400).json({
        message: '최대 가격은 숫자여야 합니다',
        code: 'INVALID_MAX_PRICE'
      });
    }

    const min = minPrice ? Number(minPrice) : 0;
    const max = maxPrice ? Number(maxPrice) : Infinity;

    if (min < 0) {
      return res.status(400).json({
        message: '최소 가격은 0 이상이어야 합니다',
        code: 'MIN_PRICE_NEGATIVE'
      });
    }

    if (min > max) {
      return res.status(400).json({
        message: '최소 가격이 최대 가격보다 클 수 없습니다',
        code: 'INVALID_PRICE_RANGE'
      });
    }

    // 정렬 옵션 검증
    const validSorts = ['price-asc', 'price-desc', 'name', 'discount'];
    if (sort && !validSorts.includes(sort)) {
      return res.status(400).json({
        message: `정렬 옵션이 유효하지 않습니다. 사용 가능한 옵션: ${validSorts.join(', ')}`,
        code: 'INVALID_SORT_OPTION'
      });
    }

    // DB 미설정 시 503 (인메모리 폴백 없음 — 단일 코드 경로)
    if (!isConfigured()) return respondDbNotConfigured(res);

    // Postgres 전체 상품 대상 검색 (q는 상품명 ILIKE 부분 일치)
    const results = await listProducts({
      q: q ? q.trim() : undefined,
      category,
      minPrice: min > 0 ? min : undefined,
      maxPrice: max === Infinity ? undefined : max,
      sort: sort ? SORT_MAP[sort] : undefined,
    });

    // 응답
    return res.status(200).json({
      query: q || '',
      filters: {
        category: category || null,
        minPrice: min,
        maxPrice: max === Infinity ? null : max,
        sort: sort || null,
      },
      count: results.length,
      products: results,
    });

  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({
      message: '검색 중 오류가 발생했습니다',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
