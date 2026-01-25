import express from 'express';
import cors from 'cors';
import  loginRoutes  from './api/login.js';
import  productsRoutes  from './api/products.js';
import  orderRoutes  from './api/order.js';
import  productDetailRoutes from './api/productDetail.js';
import  cartRoutes  from './api/cart.js';
import verifyToken from './api/_utils/auth.js';
import serverless from 'serverless-http';

const app = express();

/* CORS 설정 (로컬 + Vercel 공용) */
const allowedOrigins = [
  'http://localhost:5173',
  'https://mini-commerce.vercel.app',
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS 허용 안됨'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Demo-Mode', 'X-Demo-Case'],
}));


app.use(express.json());

/* ---------------- Routes ---------------- */
app.post('/api/login', loginRoutes);
app.get('/api/products', verifyToken, productsRoutes);
app.post('/api/order', verifyToken, orderRoutes);
app.get('/api/products/:id', productDetailRoutes);
app.post('/api/cart', verifyToken, cartRoutes);

/* ---------------- 로컬에서만 listen ---------------- */
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`API 서버 실행 중: http://localhost:${PORT}`);
  });
}

export const handler = serverless(app);