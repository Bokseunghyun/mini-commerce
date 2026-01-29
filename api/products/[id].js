// api/products/[id].js
import { applyCors } from '../_lib/common.js';

export default async function productDetail(req, res) { 
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res
      .status(405)
      .json({ message: '허용되지 않은 요청', code: 'METHOD_NOT_ALLOWED' });
  }

  //  Vercel 동적 라우트는 req.query.id 로 들어옴
  const { id } = req.query || {};
  const productId = Number(id);

  if (!id || !Number.isFinite(productId) || productId <= 0) {
    return res
      .status(400)
      .json({ message: 'id 파라미터 오류', code: 'INVALID_ID' });
  }

  const PRODUCTS = [
    {
      id: 1,
      name: '프리미엄 무선 블루투스 이어폰 노이즈 캔슬링',
      originalPrice: 189000,
      discountedPrice: 129000,
      price: 129000,
      discountRate: 32,
      imageUrl:
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    },
    {
      id: 2,
      name: '스마트 워치 헬스 트래커 방수 기능',
      originalPrice: 299000,
      discountedPrice: 199000,
      price: 199000,
      discountRate: 33,
      imageUrl:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    },
    {
      id: 3,
      name: '휴대용 블루투스 스피커 360도 서라운드 사운드',
      originalPrice: 79000,
      discountedPrice: 59000,
      price: 59000,
      discountRate: 25,
      imageUrl:
        'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop',
    },
    {
      id: 4,
      name: '인체공학 무선 마우스 DPI 조절 가능',
      originalPrice: 49000,
      discountedPrice: 35000,
      price: 35000,
      discountRate: 29,
      imageUrl:
        'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop',
    },
    {
      id: 5,
      name: '기계식 RGB 게이밍 키보드 청축',
      originalPrice: 159000,
      discountedPrice: 119000,
      price: 119000,
      discountRate: 25,
      imageUrl:
        'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop',
    },
    {
      id: 6,
      name: '4K 웹캠 자동 초점 내장 마이크',
      originalPrice: 129000,
      discountedPrice: 89000,
      price: 89000,
      discountRate: 31,
      imageUrl:
        'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=400&fit=crop',
    },
    {
      id: 7,
      name: 'USB-C 멀티 허브 7in1 맥북 호환',
      originalPrice: 69000,
      discountedPrice: 49000,
      price: 49000,
      discountRate: 29,
      imageUrl:
        'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=400&fit=crop',
    },
    {
      id: 8,
      name: '고속 무선 충전 패드 15W 퀵차지',
      originalPrice: 39000,
      discountedPrice: 29000,
      price: 29000,
      discountRate: 26,
      imageUrl:
        'https://images.unsplash.com/photo-1633269540827-728aabbb7646?w=400&h=400&fit=crop',
    },
  ];

  const safeProducts = PRODUCTS.map((p) => ({
    ...p,
    description: `${p.name} 상품입니다.`,
    details: [
      '정품 보증',
      '빠른 배송',
      '안전 포장',
      '교환/환불 가능',
      '상세 스펙은 상품 정보 참고',
    ],
  }));

  const product = safeProducts.find((p) => p.id === productId);
  if (!product) {
    return res
      .status(404)
      .json({ message: '상품 없음', code: 'PRODUCT_NOT_FOUND' });
  }

  // 의도적 장애 유지 (3,4번 상세 진입 시 500)
  if (product.id === 3 || product.id === 4) {
    return res.status(500).json({
      message: '상품 조회 실패 (의도적 장애)',
      code: 'PRODUCT_INTENTIONAL_FAIL',
    });
  }

  return res.status(200).json(product);
}
