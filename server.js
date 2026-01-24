import express from 'express';
import cors from 'cors';
import {loginRoutes} from './api/login.js';
import {productsRoutes} from './api/products.js';
import {orderRoutes} from './api/order.js';
import {productDetailRoutes} from './api/productDetail.js';
import {cartRoutes} from './api/cart.js';


const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/login', loginRoutes);
app.get('/api/products', productsRoutes);
app.post('/api/order', orderRoutes);
app.get('/api/products/:id', productDetailRoutes);
app.post('/api/cart', cartRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API 서버 실행 중: http://localhost:${PORT}`);
});
