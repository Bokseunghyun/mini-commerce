export default async function productDetailRoutes(req, res) {
  //  Vercel rewrite(query) + express(params) 둘 다 지원
  const id = req.query?.id || req.params?.id;

  const PRODUCTS = [
    {
      id: 1,
      name: "프리미엄 무선 블루투스 이어폰 노이즈 캔슬링",
      originalPrice: 189000,
      discountedPrice: 129000,
      discountRate: 32,
      imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop"
    },
    {
      id: 2,
      name: "스마트 워치 헬스 트래커 방수 기능",
      originalPrice: 299000,
      discountedPrice: 199000,
      discountRate: 33,
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"
    },
    {
      id: 3,
      name: "휴대용 블루투스 스피커 360도 서라운드 사운드",
      originalPrice: 79000,
      discountedPrice: 59000,
      discountRate: 25,
      imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop"
    },
    {
      id: 4,
      name: "인체공학 무선 마우스 DPI 조절 가능",
      originalPrice: 49000,
      discountedPrice: 35000,
      discountRate: 29,
      imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop"
    },
    {
      id: 5,
      name: "기계식 RGB 게이밍 키보드 청축",
      originalPrice: 159000,
      discountedPrice: 119000,
      discountRate: 25,
      imageUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop"
    },
    {
      id: 6,
      name: "4K 웹캠 자동 초점 내장 마이크",
      originalPrice: 129000,
      discountedPrice: 89000,
      discountRate: 31,
      imageUrl: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=400&fit=crop"
    },
    {
      id: 7,
      name: "USB-C 멀티 허브 7in1 맥북 호환",
      originalPrice: 69000,
      discountedPrice: 49000,
      discountRate: 29,
      imageUrl: "https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=400&fit=crop"
    },
    {
      id: 8,
      name: "고속 무선 충전 패드 15W 퀵차지",
      originalPrice: 39000,
      discountedPrice: 29000,
      discountRate: 26,
      imageUrl: "https://images.unsplash.com/photo-1633269540827-728aabbb7646?w=400&h=400&fit=crop"
    }
  ];

  const pid = Number(id);
  const product = PRODUCTS.find((p) => p.id === pid);

  if (!product) return res.status(404).json({ message: "상품 없음" });

  // 의도적 장애
  if (product.id === 3 || product.id === 4) {
    return res.status(500).json({ message: "상품 조회 실패 (의도적 장애)" });
  }

  return res.json(product);
}
