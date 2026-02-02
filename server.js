import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import mainRoutes from './api/main.js';
import productsRoutes from './api/products.js';
import productDetailRoutes from './api/products/[id].js';
import adminRoutes from './api/admin.js';
import statusCodesRoutes from './api/status-codes.js';
import practiceRoutes from './api/practice.js';
import verifyToken from './api/_utils/auth.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://mini-commerce.vercel.app',
  'https://mini-commerce-tawny.vercel.app',
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS 허용 안됨'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// OPTIONS 처리
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  return next();
});

// ---------------- Routes ----------------
// 통합 API (main.js)
app.all('/api/main', (req, res) => mainRoutes(req, res));

// 상품 API
app.get('/api/products', productsRoutes);
app.get('/api/products/:id', (req, res) => productDetailRoutes(req, res));

// 관리자 API
app.all('/api/admin', verifyToken, adminRoutes);

// 상태 코드 테스트 API
app.get('/api/status-codes', statusCodesRoutes);

// RESTful 연습 API
app.all('/api/practice', practiceRoutes);

if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

export const handler = serverless(app);
