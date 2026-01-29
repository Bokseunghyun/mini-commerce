export default async function productDetailRoutes(req, res) {

  // id 파싱
  const idRaw = req.query?.id || req.params?.id;
  const id = Number(idRaw);

  const PRODUCTS = [
    {
      id: 1,
      name: "프리미엄 무선 블루투스 이어폰 노이즈 캔슬링",
      originalPrice: 189000,
      discountedPrice: 129000,
      price: 129000,
      discountRate: 32,
      imageUrl:
        "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop",
      description: "노이즈 캔슬링과 고음질을 동시에",
      details: ["노이즈 캔슬링", "블루투스 5.3", "충전 케이스 포함"],
    },
    {
      id: 2,
      name: "스마트 워치 헬스 트래커 방수 기능",
      originalPrice: 299000,
      discountedPrice: 199000,
      price: 199000,
      discountRate: 33,
      imageUrl:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
      description: "운동/수면/심박 트래킹",
      details: ["방수", "심박 측정", "운동 모드 지원"],
    },
    {
      id: 3,
      name: "휴대용 블루투스 스피커 360도 서라운드 사운드",
      originalPrice: 79000,
      discountedPrice: 59000,
      price: 59000,
      discountRate: 25,
      imageUrl:
        "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop",
      description: "360도 풍부한 사운드",
      details: ["360도 사운드", "휴대용", "배터리 오래감"],
    },
    {
      id: 4,
      name: "인체공학 무선 마우스 DPI 조절 가능",
      originalPrice: 49000,
      discountedPrice: 35000,
      price: 35000,
      discountRate: 29,
      imageUrl:
        "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop",
      description: "손목 부담을 줄이는 에르고노믹",
      details: ["무선", "DPI 조절", "인체공학 디자인"],
    },
    {
      id: 5,
      name: "기계식 RGB 게이밍 키보드 청축",
      originalPrice: 159000,
      discountedPrice: 119000,
      price: 119000,
      discountRate: 25,
      imageUrl:
        "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop",
      description: "청축 특유의 클릭감",
      details: ["RGB", "청축", "게이밍 최적화"],
    },
    {
      id: 6,
      name: "4K 웹캠 자동 초점 내장 마이크",
      originalPrice: 129000,
      discountedPrice: 89000,
      price: 89000,
      discountRate: 31,
      imageUrl:
        "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=400&fit=crop",
      description: "선명한 4K 화질",
      details: ["4K", "오토포커스", "내장 마이크"],
    },
    {
      id: 7,
      name: "USB-C 멀티 허브 7in1 맥북 호환",
      originalPrice: 69000,
      discountedPrice: 49000,
      price: 49000,
      discountRate: 29,
      imageUrl:
        "https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=400&fit=crop",
      description: "포트 확장 필수템",
      details: ["7in1", "맥북 호환", "휴대성"],
    },
    {
      id: 8,
      name: "고속 무선 충전 패드 15W 퀵차지",
      originalPrice: 39000,
      discountedPrice: 29000,
      price: 29000,
      discountRate: 26,
      imageUrl:
        "https://images.unsplash.com/photo-1633269540827-728aabbb7646?w=400&h=400&fit=crop",
      description: "빠르고 편한 무선 충전",
      details: ["15W", "퀵차지", "안전 보호"],
    },
  ];

  const found = PRODUCTS.find((p) => p.id === id);

  if (!found) {
    return res.status(404).json({ message: "상품을 찾을 수 없습니다" });
  }

  //  price 보정: 상세 응답에 price가 항상 존재하도록 강제
  const normalized = {
    ...found,
    price:
      Number(found.price) ||
      Number(found.discountedPrice) ||
      Number(found.originalPrice) ||
      0,
  };

  return res.status(200).json(normalized);
}
