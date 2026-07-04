"use client";

import React from "react";

// 장바구니 아이콘
function ShoppingBagIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

// 플러스 아이콘
function PlusIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

// 마이너스 아이콘
function MinusIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

// 삭제 아이콘
function TrashIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

// 뒤로가기 아이콘
function ArrowLeftIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

// 가격 포맷
function formatPrice(price) {
  const n = Number(price) || 0;
  return n.toLocaleString("ko-KR");
}

// 장바구니 아이템 컴포넌트 (서버 장바구니 shape: { productId, name, price, imageUrl, quantity, stock })
function CartItem({ item, onIncrease, onDecrease, onRemove, isSelected, onSelect }) {
  const qty = Number(item.quantity) || 1;
  const price = Number(item.price) || 0;
  const subtotal = price * qty;
  const stock = Number(item.stock);
  const isSoldOut = Number.isFinite(stock) && stock <= 0;

  return (
    <article className="cart-item" data-testid={`cart-item-${item.productId}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onSelect(item.productId)}
        className="cart-item-checkbox"
        aria-label={`${item.name} 선택`}
      />
      
      <div className="cart-item-image-wrapper">
        <img
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          className="cart-item-image"
        />
      </div>

      <div className="cart-item-info">
        <h3 className="cart-item-name">{item.name}</h3>
        <p className="cart-item-price">{formatPrice(price)}원</p>
        {isSoldOut && (
          <p
            className="cart-item-soldout"
            style={{ color: "#e53e3e", fontSize: "0.75rem", fontWeight: 600, margin: 0 }}
            data-testid={`cart-soldout-${item.productId}`}
          >
            품절
          </p>
        )}
      </div>

      <div className="cart-item-quantity">
        <button
          type="button"
          className="cart-quantity-decrease"
          onClick={() => onDecrease(item.productId)}
          aria-label={`${item.name} 수량 감소`}
          disabled={qty <= 1}
          data-testid={`cart-decrease-${item.productId}`}
        >
          <MinusIcon className="quantity-icon" />
        </button>
        <span className="quantity-value" aria-live="polite" data-testid={`cart-qty-${item.productId}`}>
          {qty}
        </span>
        <button
          type="button"
          className="cart-quantity-increase"
          onClick={() => onIncrease(item.productId)}
          aria-label={`${item.name} 수량 증가`}
          data-testid={`cart-increase-${item.productId}`}
        >
          <PlusIcon className="quantity-icon" />
        </button>
      </div>

      <div className="cart-item-subtotal">
        <span className="subtotal-label">소계</span>
        <span className="subtotal-value" data-testid={`cart-subtotal-${item.productId}`}>{formatPrice(subtotal)}원</span>
      </div>

      <button
        type="button"
        className="remove-item-btn"
        onClick={() => onRemove(item.productId)}
        aria-label={`${item.name} 장바구니에서 삭제`}
        data-testid={`cart-remove-${item.productId}`}
      >
        <TrashIcon className="trash-icon" />
      </button>
    </article>
  );
}

// App.jsx에서 상태/핸들러를 받아서 동작하는 장바구니 UI
export default function CartPage({
  cartItems = [],
  onIncrease,
  onDecrease,
  onRemove,
  onCheckout,
  onBack,
}) {
  const [selectedItems, setSelectedItems] = React.useState([]);

  React.useEffect(() => {
    setSelectedItems(cartItems.map(item => item.productId));
  }, [cartItems]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(cartItems.map(item => item.productId));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const selectedCartItems = cartItems.filter(item => selectedItems.includes(item.productId));
  const totalItems = selectedCartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const totalPrice = selectedCartItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  // 주문하기: 주문/결제 페이지로 이동 (실제 주문 생성은 결제 페이지에서 수행)
  const handleCheckout = () => {
    onCheckout();
  };

  const allSelected = cartItems.length > 0 && selectedItems.length === cartItems.length;

  return (
    <>
      <style>{`
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background-color: #f8f8f8;
    color: #1a1a1a;
    line-height: 1.5;
  }

  .cart-page { min-height: 100vh; background-color: #f8f8f8; }

  .page-header {
    background-color: #ffffff;
    border-bottom: 1px solid #e5e5e5;
    position: sticky;
    top: 0;
    z-index: 10;
    width: 350px;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .page-header {
      width: 100%;
    }
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }

  @media (min-width: 768px) {
    .header-content {
      padding: 16px;
      gap: 16px;
    }
  }

  .back-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 8px;
    color: #1a1a1a;
    text-decoration: none;
    transition: background-color 0.2s ease;
    border: none;
    background: none;
    cursor: pointer;
  }

  .back-link:hover { background-color: #f5f5f5; }

  .back-icon { width: 20px; height: 20px; }

  .page-title {
    font-size: 1.125rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  @media (min-width: 768px) {
    .page-title {
      font-size: 1.25rem;
    }
  }

  .cart-icon-header { width: 24px; height: 24px; }

  .cart-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    width: 100%;
    box-sizing: border-box;
  }

  @media (min-width: 768px) {
    .cart-container {
      padding: 24px 16px;
      flex-direction: row;
      align-items: flex-start;
      gap: 24px;
    }
  }

  .cart-items-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
    min-height: 520px;
    width: 100%;
    background-color: #ffffff;
    border-radius: 12px;
    padding: 16px;
  }

  @media (min-width: 768px) {
    .cart-items-section {
      flex: 1;
      min-width: 600px;
      max-width: 600px;
      width: auto;
    }
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #666666;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e5e5;
    background-color: #ffffff;
  }

  @media (min-width: 768px) {
    .section-title {
      font-size: 1rem;
    }
  }

  .cart-items-list { display: flex; flex-direction: column; gap: 12px; }

  .cart-item {
    background-color: #ffffff;
    border-radius: 12px;
    padding: 12px;
    display: grid;
    grid-template-columns: 60px 1fr;
    grid-template-rows: auto auto auto;
    gap: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  @media (min-width: 640px) {
    .cart-item {
      grid-template-columns: auto 100px 1fr auto auto auto;
      grid-template-rows: auto;
      align-items: center;
      gap: 20px;
      padding: 16px;
    }
  }

  .cart-item-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    grid-column: 1 / 2;
    grid-row: 1 / 2;
  }

  @media (min-width: 640px) {
    .cart-item-checkbox {
      width: 20px;
      height: 20px;
      grid-column: auto;
      grid-row: auto;
    }
  }

  .cart-item-image-wrapper {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    background-color: #f5f5f5;
    grid-column: 1 / 2;
    grid-row: 2 / 3;
  }

  @media (min-width: 640px) {
    .cart-item-image-wrapper {
      width: 100px;
      height: 100px;
      grid-column: auto;
      grid-row: auto;
    }
  }

  .cart-item-image { width: 100%; height: 100%; object-fit: cover; }

  .cart-item-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    grid-column: 2 / 3;
    grid-row: 1 / 3;
  }

  @media (min-width: 640px) {
    .cart-item-info {
      grid-column: auto;
      grid-row: auto;
    }
  }

  .cart-item-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: #1a1a1a;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
  }

  @media (min-width: 640px) {
    .cart-item-name {
      font-size: 0.9375rem;
    }
  }

  .cart-item-price {
    font-size: 0.8125rem;
    color: #666666;
  }

  @media (min-width: 640px) {
    .cart-item-price {
      font-size: 0.875rem;
    }
  }

  .cart-item-quantity {
    display: flex;
    align-items: center;
    gap: 6px;
    grid-column: 1 / 2;
    grid-row: 3 / 4;
    justify-self: start;
  }

  @media (min-width: 640px) {
    .cart-item-quantity {
      gap: 8px;
      grid-column: auto;
      grid-row: auto;
    }
  }

  .cart-quantity-decrease, .cart-quantity-increase {
    width: 28px;
    height: 28px;
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    background-color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  @media (min-width: 640px) {
    .cart-quantity-decrease, .cart-quantity-increase {
      width: 32px;
      height: 32px;
    }
  }

  .cart-quantity-decrease:hover:not(:disabled), .cart-quantity-increase:hover {
    background-color: #f5f5f5;
    border-color: #cccccc;
  }

  .cart-quantity-decrease:disabled { opacity: 0.4; cursor: not-allowed; }

  .quantity-icon { width: 14px; height: 14px; color: #1a1a1a; }

  @media (min-width: 640px) {
    .quantity-icon {
      width: 16px;
      height: 16px;
    }
  }

  .quantity-value {
    min-width: 20px;
    text-align: center;
    font-size: 0.875rem;
    font-weight: 500;
  }

  @media (min-width: 640px) {
    .quantity-value {
      min-width: 24px;
      font-size: 0.9375rem;
    }
  }

  .cart-item-subtotal {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    grid-column: 2 / 3;
    grid-row: 3 / 4;
  }

  @media (min-width: 640px) {
    .cart-item-subtotal {
      grid-column: auto;
      grid-row: auto;
    }
  }

  .subtotal-label {
    font-size: 0.6875rem;
    color: #999999;
  }

  @media (min-width: 640px) {
    .subtotal-label {
      font-size: 0.75rem;
    }
  }

  .subtotal-value {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #1a1a1a;
  }

  @media (min-width: 640px) {
    .subtotal-value {
      font-size: 1rem;
    }
  }

  .remove-item-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background-color: #fff5f5;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s ease;
    grid-column: 2 / 3;
    grid-row: 2 / 3;
    justify-self: end;
    align-self: end;
  }

  @media (min-width: 640px) {
    .remove-item-btn {
      width: 36px;
      height: 36px;
      grid-column: auto;
      grid-row: auto;
      justify-self: auto;
      align-self: auto;
    }
  }

  .remove-item-btn:hover { background-color: #ffe5e5; }

  .trash-icon {
    width: 16px;
    height: 16px;
    color: #e53e3e;
  }

  @media (min-width: 640px) {
    .trash-icon {
      width: 18px;
      height: 18px;
    }
  }

  .empty-cart {
    background-color: transparent;
    border-radius: 0;
    padding: 48px 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    flex: 1;
    width: 350px;
    justify-content: center;
  }
  
  @media (min-width: 768px) {
    .empty-cart {
      min-width: auto;
      max-width: none;
      width: 100%;
    }
  }

  .empty-cart-icon { width: 64px; height: 64px; color: #cccccc; }
  .empty-cart-text { font-size: 1rem; color: #666666; }

  .continue-shopping-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background-color: #1a1a1a;
    color: #ffffff;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background-color 0.2s ease;
    border: none;
    cursor: pointer;
  }

  .continue-shopping-link:hover { background-color: #333333; }

  .order-summary-section {
    width: 350px;
    flex-shrink: 0;
    background-color: #ffffff;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  @media (min-width: 768px) {
    .order-summary-section { width: 320px; position: sticky; top: 88px; }
  }

  .summary-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e5e5;
  }

  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .summary-label { font-size: 0.9375rem; color: #666666; }
  .summary-value { font-size: 0.9375rem; font-weight: 500; }

  .summary-divider { height: 1px; background-color: #e5e5e5; margin: 16px 0; }

  .summary-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .summary-total-label { font-size: 1rem; font-weight: 600; }

  .cart-total-price { font-size: 1.5rem; font-weight: 700; color: #e53e3e; }

  .checkout-btn {
    width: 100%;
    padding: 16px;
    background-color: #1a1a1a;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .checkout-btn:hover { background-color: #333333; }

  .checkout-btn:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }


  @media (min-width: 768px) {
    .cart-items-section { min-height: 640px; }
  }
`}</style>

      <main id="cart-page" className="cart-page">
        <header className="page-header">
          <div className="header-content">
            <button
              type="button"
              className="back-link"
              aria-label="상품 목록으로 돌아가기"
              onClick={onBack}
            >
              <ArrowLeftIcon className="back-icon" />
            </button>
            <h1 className="page-title">
              <ShoppingBagIcon className="cart-icon-header" />
              장바구니
            </h1>
          </div>
        </header>

        <div className="cart-container">
          <section className="cart-items-section" aria-label="장바구니 상품 목록">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="select-all-checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                aria-label="전체 선택"
              />
              <h2 className="section-title" style={{ flex: 1, border: 'none', paddingBottom: 0 }}>
                장바구니 상품 ({totalItems}개)
              </h2>
            </div>

            {cartItems.length > 0 ? (
              <div className="cart-items-list">
                {cartItems.map((item) => (
                  <CartItem
                    key={item.productId}
                    item={item}
                    onIncrease={onIncrease}
                    onDecrease={onDecrease}
                    onRemove={onRemove}
                    isSelected={selectedItems.includes(item.productId)}
                    onSelect={handleSelectItem}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-cart">
                <ShoppingBagIcon className="empty-cart-icon" />
                <p className="empty-cart-text" data-testid="cart-empty">장바구니가 비어있습니다</p>
                <button type="button" className="continue-shopping-link" onClick={onBack}>
                  쇼핑 계속하기
                </button>
              </div>
            )}
          </section>

          <aside className="order-summary-section" aria-label="주문 요약">
            <h2 className="summary-title">주문 요약</h2>

            <div className="summary-row">
              <span className="summary-label">총 상품 수</span>
              <span className="summary-value">{totalItems}개</span>
            </div>

            <div className="summary-row">
              <span className="summary-label">상품 금액</span>
              <span className="summary-value">{formatPrice(totalPrice)}원</span>
            </div>

            <div className="summary-row">
              <span className="summary-label">배송비</span>
              <span className="summary-value">무료</span>
            </div>

            <div className="summary-divider" />

            <div className="summary-total-row">
              <span className="summary-total-label">총 결제 금액</span>
              <span className="cart-total-price" data-testid="cart-total">{formatPrice(totalPrice)}원</span>
            </div>

            <button
              id="checkout-btn"
              type="button"
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
              aria-label="주문하기"
              data-testid="checkout-button"
            >
              주문하기
            </button>
          </aside>
        </div>
      </main>
    </>
  );
}