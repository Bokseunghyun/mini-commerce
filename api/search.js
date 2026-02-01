/**
 * api/search.js - 상품 검색 API
 * 
 * GET /api/search?q=검색어&category=카테고리&minPrice=최소가격&maxPrice=최대가격&sort=정렬
 * 
 * QA 검증 포인트:
 * - 쿼리 파라미터 검증
 * - 빈 검색어 처리
 * - 가격 범위 검증
 * - 정렬 옵션 검증
 * - 결과 없음 처리
 */

import { applyCors } from './_lib/common.js';

const PRODUCTS = [
  {
    id: 1,
    name: "프리미엄 무선 블루투스 이어폰 노이즈 캔슬링",
    category: "전자기기",
    originalPrice: 189000,
    discountedPrice: 129000,
    price: 129000,
    discountRate: 32,
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
  },
  {
    id: 2,
    name: "스마트 워치 헬스 트래커 방수 기능",
    category: "전자기기",
    originalPrice: 299000,
    discountedPrice: 199000,
    price: 199000,
    discountRate: 33,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
  },
  {
    id: 3,
    name: "휴대용 블루투스 스피커 360도 서라운드 사운드",
    category: "전자기기",
    originalPrice: 79000,
    discountedPrice: 59000,
    price: 59000,
    discountRate: 25,
    imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop",
  },
  {
    id: 7,
    name: "인체공학 무선 마우스 DPI 조절 가능",
    category: "액세서리",
    originalPrice: 49000,
    discountedPrice: 35000,
    price: 35000,
    discountRate: 29,
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop",
  },
  {
    id: 13,
    name: "스테인리스 텀블러 보온보냉 500ml",
    category: "생활",
    originalPrice: 35000,
    discountedPrice: 24000,
    price: 24000,
    discountRate: 31,
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop",
  },
];

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

    // 검색어 검증
    if (q && typeof q !== 'string') {
      return res.status(400).json({
        message: '검색어는 문자열이어야 합니다',
        code: 'INVALID_QUERY_TYPE'
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

    // 필터링
    let results = [...PRODUCTS];

    // 검색어 필터링
    if (q && q.trim()) {
      const searchTerm = q.toLowerCase().trim();
      results = results.filter(p => 
        p.name.toLowerCase().includes(searchTerm)
      );
    }

    // 카테고리 필터링
    if (category) {
      results = results.filter(p => p.category === category);
    }

    // 가격 범위 필터링
    results = results.filter(p => {
      const price = p.discountedPrice || p.price;
      return price >= min && price <= max;
    });

    // 정렬
    if (sort) {
      switch (sort) {
        case 'price-asc':
          results.sort((a, b) => (a.price || 0) - (b.price || 0));
          break;
        case 'price-desc':
          results.sort((a, b) => (b.price || 0) - (a.price || 0));
          break;
        case 'name':
          results.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
          break;
        case 'discount':
          results.sort((a, b) => (b.discountRate || 0) - (a.discountRate || 0));
          break;
      }
    }

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
