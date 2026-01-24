export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const PRODUCTS = [
    { id: 1, name: '무선 마우스', price: 25000 },
    { id: 2, name: '기계식 키보드', price: 89000 },
    { id: 3, name: '주문불가 상품', price: 30000 },
    { id: 4, name: '주문불가 상품', price: 40000 },
  ];

  res.status(200).json(PRODUCTS);
}
