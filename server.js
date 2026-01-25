import express from 'express';
import cors from 'cors';

import loginRoutes from './api/login.js';
import productsRoutes from './api/products.js';
import productDetailRoutes from './api/productDetail.js'; // 기존 유지
import orderRoutes from './api/order.js';
import cartRoutes from './api/cart.js';
import verifyToken from './api/_utils/auth.js'; // 기존 verifyToken 그대로

const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  'https://mini-commerce.vercel.app',
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS 허용 안됨'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// ---------------- Routes ----------------
app.post('/api/login', loginRoutes);
app.get('/api/products', productsRoutes);                  // public
app.get('/api/products/:id', productDetailRoutes);         // public
app.post('/api/order', verifyToken, orderRoutes);          // JWT 필요
app.post('/api/cart', verifyToken, cartRoutes);            // JWT 필요

if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

export default app;
