export default async function productsRoutes(req, res) {
  const user = req.user;

  const PRODUCTS = [
    // 전자기기
    {
      id: 1,
      name: "프리미엄 무선 블루투스 이어폰 노이즈 캔슬링",
      category: "전자기기",
      originalPrice: 189000,
      discountedPrice: 129000,
      price: 129000,
      discountRate: 32,
      imageUrl:
        "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
    },
    {
      id: 2,
      name: "스마트 워치 헬스 트래커 방수 기능",
      category: "전자기기",
      originalPrice: 299000,
      discountedPrice: 199000,
      price: 199000,
      discountRate: 33,
      imageUrl:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    },
    {
      id: 3,
      name: "휴대용 블루투스 스피커 360도 서라운드 사운드",
      category: "전자기기",
      originalPrice: 79000,
      discountedPrice: 59000,
      price: 59000,
      discountRate: 25,
      imageUrl:
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop",
    },
    {
      id: 4,
      name: "4K 웹캠 자동 초점 내장 마이크",
      category: "전자기기",
      originalPrice: 129000,
      discountedPrice: 89000,
      price: 89000,
      discountRate: 31,
      imageUrl:
        "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=400&fit=crop",
    },
    {
      id: 5,
      name: "태블릿 10.5인치 8GB RAM 128GB 저장공간",
      category: "전자기기",
      originalPrice: 459000,
      discountedPrice: 359000,
      price: 359000,
      discountRate: 22,
      imageUrl:
        "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop",
    },
    {
      id: 6,
      name: "노트북 스탠드 알루미늄 각도조절",
      category: "전자기기",
      originalPrice: 55000,
      discountedPrice: 39000,
      price: 39000,
      discountRate: 29,
      imageUrl:
        "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop",
    },
    
    // 액세서리
    {
      id: 7,
      name: "인체공학 무선 마우스 DPI 조절 가능",
      category: "액세서리",
      originalPrice: 49000,
      discountedPrice: 35000,
      price: 35000,
      discountRate: 29,
      imageUrl:
        "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop",
    },
    {
      id: 8,
      name: "기계식 RGB 게이밍 키보드 청축",
      category: "액세서리",
      originalPrice: 159000,
      discountedPrice: 119000,
      price: 119000,
      discountRate: 25,
      imageUrl:
        "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop",
    },
    {
      id: 9,
      name: "USB-C 멀티 허브 7in1 맥북 호환",
      category: "액세서리",
      originalPrice: 69000,
      discountedPrice: 49000,
      price: 49000,
      discountRate: 29,
      imageUrl:
        "https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=400&fit=crop",
    },
    {
      id: 10,
      name: "고속 무선 충전 패드 15W 퀵차지",
      category: "액세서리",
      originalPrice: 39000,
      discountedPrice: 29000,
      price: 29000,
      discountRate: 26,
      imageUrl:
        "https://images.unsplash.com/photo-1633269540827-728aabbb7646?w=400&h=400&fit=crop",
    },
    {
      id: 11,
      name: "스마트폰 거치대 자석 타입 360도 회전",
      category: "액세서리",
      originalPrice: 25000,
      discountedPrice: 18000,
      price: 18000,
      discountRate: 28,
      imageUrl:
        "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=400&h=400&fit=crop",
    },
    {
      id: 12,
      name: "보조배터리 20000mAh 고속충전 PD 지원",
      category: "액세서리",
      originalPrice: 59000,
      discountedPrice: 42000,
      price: 42000,
      discountRate: 29,
      imageUrl:
        "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop",
    },
    
    // 생활
    {
      id: 13,
      name: "스테인리스 텀블러 보온보냉 500ml",
      category: "생활",
      originalPrice: 35000,
      discountedPrice: 24000,
      price: 24000,
      discountRate: 31,
      imageUrl:
        "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop",
    },
    {
      id: 14,
      name: "LED 스탠드 조명 무선충전 기능",
      category: "생활",
      originalPrice: 89000,
      discountedPrice: 65000,
      price: 65000,
      discountRate: 27,
      imageUrl:
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop",
    },
    {
      id: 15,
      name: "공기청정기 미니 탁상용 저소음",
      category: "생활",
      originalPrice: 129000,
      discountedPrice: 89000,
      price: 89000,
      discountRate: 31,
      imageUrl:
        "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop",
    },
    {
      id: 16,
      name: "가습기 초음파 3L 대용량 LED 무드등",  
      category: "생활",
      originalPrice: 69000, 
      discountedPrice: 49000,
      price: 49000,
      discountRate: 29,
      imageUrl:
        "https://images.unsplash.com/photo-1585435557001-1ba8d415c605?w=400&h=400&fit=crop",
    },
    {
      id: 17,
      name: "전기담요 세탁가능 자동온도조절",
      category: "생활",
      originalPrice: 89000,
      discountedPrice: 59000,
      price: 59000,
      discountRate: 34,
      imageUrl:
        "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=400&h=400&fit=crop",
    },
    {
      id: 18,
      name: "발마사지기 무선 온열 기능",
      category: "생활",
      originalPrice: 159000,
      discountedPrice: 119000,
      price: 119000,
      discountRate: 25,
      imageUrl:
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
    },
  ];

  const safeProducts = PRODUCTS.map((p) => ({
    ...p,
    description: `${p.name} 상품입니다.`,
    details: [
      "정품 보증",
      "빠른 배송",
      "안전 포장",
      "교환/환불 가능",
      "상세 스펙은 상품 정보 참고",
    ],
  }));




  return res.status(200).json({
    user,
    products: safeProducts,
  });
}
