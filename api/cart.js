// api/cart.js
export async function cartRoutes(req, res) {
const body = await req.json();
  const { action, index, cart } = body;

  if (action === 'remove') {
    const newCart = cart.filter((_, i) => i !== index);
    return res.status(200).json({ message: '삭제 성공', cart: newCart });
  }

  return res.status(400).json({ message: '삭제 실패' });
}
