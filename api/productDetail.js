// app/api/products/[id]/route.js
import { NextResponse } from 'next/server';

const PRODUCTS = [
  { id: 1, name: '무선 마우스', price: 25000, description: '정상 상품' },
  { id: 2, name: '기계식 키보드', price: 89000, description: '정상 상품' },
  { id: 3, name: '주문불가 상품', price: 30000 },
  { id: 4, name: '주문불가 상품', price: 40000 },
];

export async function GET(req, { params }) {
  const id = Number(params.id);  // 여기서 params.id 사용
  const product = PRODUCTS.find(p => p.id === id);

  if (!product) return NextResponse.json({ message: '상품 없음' }, { status: 404 });

  if (product.id === 3 || product.id === 4) {
    return NextResponse.json({ message: '상품 조회 실패 (의도적 장애)' }, { status: 500 });
  }

  return NextResponse.json(product);
}
