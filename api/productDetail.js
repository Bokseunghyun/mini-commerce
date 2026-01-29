const BLOCKED_DETAIL_IDS = new Set([3, 4]);

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
    description: "노이즈 캔슬링과 고음질을 동시에 제공하는 프리미엄 이어폰입니다.",
    details: ["액티브 노이즈 캔슬링", "최대 30시간 배터리", "IPX4 생활 방수"],
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
    description: "운동/수면/심박을 한 번에 관리하는 스마트 워치입니다.",
    details: ["수면/심박 측정", "방수", "운동 모드 지원"],
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
    description: "의도적으로 상세 진입이 막혀야 하는 상품입니다.",
    details: ["의도적 오류 케이스", "상세 진입 차단"],
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
    description: "의도적으로 상세 진입이 막혀야 하는 상품입니다.",
    details: ["의도적 오류 케이스", "상세 진입 차단"],
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
    description: "청축 특유의 타건감과 RGB를 제공하는 게이밍 키보드입니다.",
    details: ["RGB 백라이트", "청축 스위치", "키캡 교체 가능"],
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
    description: "고화질 화상 회의용 웹캠입니다.",
    details: ["4K 지원", "자동 초점", "내장 마이크"],
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
    description: "노트북 확장에 필수인 멀티 허브입니다.",
    details: ["7in1", "PD 충전", "4K HDMI"],
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
    description: "빠르고 안정적인 무선 충전 패드입니다.",
    details: ["15W", "퀵차지", "과열 보호"],
  },
];

export default async function productDetailRoutes(req, res) {
  const id = Number(req.params?.id);
  if (!id) return res.status(400).json({ message: "id 파라미터 오류" });

  //  3,4번 상세 차단을 status로 반환
  if (BLOCKED_DETAIL_IDS.has(id)) {
    return res.status(403).json({ message: "상세 페이지 진입 불가(의도적 오류)" });
  }

  const product = PRODUCTS.find((p) => p.id === id);
  if (!product) return res.status(404).json({ message: "상품이 없습니다" });

  return res.status(200).json(product);
}
