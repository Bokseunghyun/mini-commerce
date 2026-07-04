/**
 * api/index.js - Vercel 단일 서버리스 함수 (모든 /api/* 요청 디스패치)
 *
 * 왜 하나로 모으나:
 *   Vercel Hobby(무료) 플랜은 배포당 서버리스 함수 최대 12개 제한이 있다.
 *   api/*.js 를 파일별 함수로 두면 14개 이상이라 배포가 실패한다.
 *   → 이 파일 하나만 함수로 빌드하고(vercel.json), 나머지 핸들러는
 *     import로 번들에 포함시켜 내부에서 경로 기반으로 라우팅한다.
 *   로컬(server.js)은 동일한 핸들러를 Express로 마운트하므로 동작이 같다.
 */

import loginHandler from './login.js';
import signupHandler from './signup.js';
import productsHandler from './products.js';
import productDetailHandler from './products/[id].js';
import searchHandler from './search.js';
import reviewsHandler from './reviews.js';
import inventoryHandler from './inventory.js';
import userActionsHandler from './user-actions.js';
import couponsHandler from './coupons.js';
import paymentHandler from './payment.js';
import uploadHandler from './upload.js';
import trackingHandler from './tracking.js';
import ordersHandler from './orders.js';
import orderDetailHandler from './orders/[id].js';
import adminHandler from './admin.js';
import adminCouponsHandler from './admin-coupons.js';
import statusCodesHandler from './status-codes.js';
import resetHandler from './reset.js';

export default async function handler(req, res) {
  const rawUrl = req.url || '';
  const qIdx = rawUrl.indexOf('?');
  const pathname = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
  const search = qIdx >= 0 ? rawUrl.slice(qIdx + 1) : '';

  // 쿼리스트링을 파싱해 req.query를 항상 보장 (핸들러가 req.query 존재를 가정함).
  // 동적 라우트의 id도 여기서 함께 주입한다. getter-only 환경 대비 defineProperty 폴백.
  const baseQuery = Object.fromEntries(new URLSearchParams(search));
  function setQuery(extra) {
    const q = { ...baseQuery, ...(extra || {}) };
    try {
      req.query = q;
    } catch {
      Object.defineProperty(req, 'query', { value: q, writable: true, configurable: true });
    }
  }

  // "/api/products/1" -> "products/1", "/api/login" -> "login"
  const path = pathname.replace(/^\/+api\/?/, '').replace(/\/+$/, '');

  // 동적 라우트 먼저 처리
  let m;
  if ((m = path.match(/^products\/(.+)$/))) {
    setQuery({ id: decodeURIComponent(m[1]) });
    return productDetailHandler(req, res);
  }
  if ((m = path.match(/^orders\/(.+)$/))) {
    setQuery({ id: decodeURIComponent(m[1]) });
    return orderDetailHandler(req, res);
  }

  setQuery();

  // 정확 경로 우선 매칭: /api/admin/coupons 는 'admin' 케이스보다 먼저 처리
  if (path === 'admin/coupons') {
    return adminCouponsHandler(req, res);
  }

  switch (path) {
    case 'login':
      return loginHandler(req, res);
    case 'signup':
      return signupHandler(req, res);
    case 'products':
      return productsHandler(req, res);
    case 'search':
      return searchHandler(req, res);
    case 'reviews':
      return reviewsHandler(req, res);
    case 'inventory':
      return inventoryHandler(req, res);
    case 'user-actions':
      return userActionsHandler(req, res);
    case 'coupons':
      return couponsHandler(req, res);
    case 'payment':
      return paymentHandler(req, res);
    case 'upload':
      return uploadHandler(req, res);
    case 'tracking':
      return trackingHandler(req, res);
    case 'orders':
      return ordersHandler(req, res);
    case 'admin':
      return adminHandler(req, res);
    case 'status-codes':
      return statusCodesHandler(req, res);
    case 'reset':
      return resetHandler(req, res);
    default:
      return res.status(404).json({
        message: '존재하지 않는 API 경로',
        code: 'NOT_FOUND',
        path: pathname,
      });
  }
}
