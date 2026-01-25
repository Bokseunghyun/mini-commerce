import productDetailRoutes from './api/productDetail.js';

export default function handler(req, res) {
  return productDetailRoutes(req, res);
}
