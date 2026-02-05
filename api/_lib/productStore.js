/**
 * 공유 상품 저장소
 * admin.js와 products.js에서 동일한 데이터를 참조하도록
 */

import { PRODUCTS as INITIAL_PRODUCTS } from '../products.js';

// 런타임 상품 저장소 (admin에서 수정 가능)
let productStore = null;

// 초기화 함수
export function initProductStore() {
  if (!productStore) {
    productStore = INITIAL_PRODUCTS.map((p) => ({ ...p }));
  }
  return productStore;
}

// 상품 목록 조회
export function getProductStore() {
  if (!productStore) {
    initProductStore();
  }
  return productStore;
}

// 상품 추가
export function addProduct(product) {
  if (!productStore) {
    initProductStore();
  }
  productStore.push(product);
  return product;
}

// 상품 수정
export function updateProduct(id, updates) {
  if (!productStore) {
    initProductStore();
  }
  const index = productStore.findIndex(p => p.id === id);
  if (index !== -1) {
    productStore[index] = { ...productStore[index], ...updates };
    return productStore[index];
  }
  return null;
}

// 상품 삭제
export function deleteProduct(id) {
  if (!productStore) {
    initProductStore();
  }
  const index = productStore.findIndex(p => p.id === id);
  if (index !== -1) {
    const deleted = productStore.splice(index, 1)[0];
    return deleted;
  }
  return null;
}

// 초기 데이터 가져오기
export function getInitialProducts() {
  return INITIAL_PRODUCTS;
}
