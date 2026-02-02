import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import loginRoutes from './api/login.js';
import productsRoutes from './api/products.js';
import productDetailRoutes from './api/productDetail.js';
import orderRoutes from './api/order.js';
import cartRoutes from './api/cart.js';
import verifyToken from './api/_utils/auth.js';

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

//  문제 없이 OPTIONS만 200으로 처리
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  return next();
});

// ---------------- Routes ----------------
// login은 app.post가 아니라 app.all로 고정해서 어떤 레이어가 껴도 login.js가 일관 처리하게 함
app.all('/api/login', (req, res) => loginRoutes(req, res));

app.get('/api/products', productsRoutes); // public
app.get('/api/products/:id', productDetailRoutes); // public

app.post('/api/order', verifyToken, orderRoutes); // JWT 필요
app.post('/api/cart', verifyToken, cartRoutes); // JWT 필요

if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

export const handler = serverless(app);
