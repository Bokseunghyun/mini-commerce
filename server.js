// server.js — 로컬 개발용 API 서버
// Vercel 서버리스 핸들러(api/*.js)를 Express에 그대로 마운트한다.
// 실행: npm run start-api (port 3000)
// vite dev 서버(5173)가 /api 요청을 이 서버로 프록시한다 (vite.config.js 참고)
import './scripts/load-env.js'; // .env의 DATABASE_URL/JWT_SECRET 로드 (로컬 전용)
import express from 'express';

import loginHandler from './api/login.js';
import signupHandler from './api/signup.js';
import productsHandler from './api/products.js';
import productDetailHandler from './api/products/[id].js';
import searchHandler from './api/search.js';
import reviewsHandler from './api/reviews.js';
import inventoryHandler from './api/inventory.js';
import userActionsHandler from './api/user-actions.js';
import couponsHandler from './api/coupons.js';
import ordersHandler from './api/orders.js';
import orderDetailHandler from './api/orders/[id].js';
import adminHandler from './api/admin.js';
import statusCodesHandler from './api/status-codes.js';
import resetHandler from './api/reset.js';

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

// 잘못된 JSON 본문도 JSON 형태로 응답 (API 테스트 계약 일관성)
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: '잘못된 JSON 본문', code: 'INVALID_JSON' });
  }
  next(err);
});

// 핸들러에서 예외가 나도 서버가 죽지 않도록 감싼다
const wrap = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (e) {
    console.error(`[api] ${req.method} ${req.url} 처리 중 오류:`, e);
    if (!res.headersSent) {
      res.status(500).json({ message: '서버 내부 오류', code: 'INTERNAL_SERVER_ERROR' });
    }
  }
};

app.all('/api/login', wrap(loginHandler));
app.all('/api/signup', wrap(signupHandler));
app.all('/api/products', wrap(productsHandler));
// Vercel 동적 라우트([id].js)는 req.query.id 를 기대한다
// (Express 5의 req.query는 getter 전용이라 defineProperty로 덮어쓴다)
app.all('/api/products/:id', wrap((req, res) => {
  Object.defineProperty(req, 'query', {
    value: { ...req.query, id: req.params.id },
    writable: true,
    configurable: true,
  });
  return productDetailHandler(req, res);
}));
app.all('/api/search', wrap(searchHandler));
app.all('/api/reviews', wrap(reviewsHandler));
app.all('/api/inventory', wrap(inventoryHandler));
app.all('/api/user-actions', wrap(userActionsHandler));
app.all('/api/coupons', wrap(couponsHandler));
app.all('/api/orders', wrap(ordersHandler));
// 주문 상세/취소 — Vercel 동적 라우트([id].js)는 req.query.id 를 기대한다
// (Express 5의 req.query는 getter 전용이라 defineProperty로 덮어쓴다)
app.all('/api/orders/:id', wrap((req, res) => {
  Object.defineProperty(req, 'query', {
    value: { ...req.query, id: req.params.id },
    writable: true,
    configurable: true,
  });
  return orderDetailHandler(req, res);
}));
app.all('/api/admin', wrap(adminHandler));
app.all('/api/status-codes', wrap(statusCodesHandler));
// 테스트 상태 초기화 (반드시 /api 404 폴백보다 먼저 등록)
app.all('/api/reset', wrap(resetHandler));

// 존재하지 않는 API 경로 → 404 JSON (테스트에서 오타 감지용)
app.use('/api', (req, res) => {
  res.status(404).json({ message: '존재하지 않는 API 경로', code: 'NOT_FOUND', path: req.originalUrl });
});

app.listen(PORT, () => {
  console.log(`[mini-commerce] API 서버 실행 중: http://localhost:${PORT}`);
  console.log('프론트엔드는 별도 터미널에서 npm run dev (http://localhost:5173)');
});
