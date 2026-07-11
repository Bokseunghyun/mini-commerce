import { useState, useEffect } from "react";
import { toast } from "../lib/toast.js";

// 랜덤 이미지 URL 생성 (picsum.photos 사용)
function getRandomImage() {
  const randomId = Math.floor(Math.random() * 1000) + 1;
  return `https://picsum.photos/seed/${randomId}/400/400`;
}

export default function AdminPage({ products: initialProducts = [], onUpdateProducts, onAccessDenied, apiBase }) {
  // 상품 목록은 이 페이지가 직접 소유한다. App 의 products state 는 home/products
  // 페이지에서만 로드되므로, 이니시스 결제 리다이렉트로 앱이 리마운트된 뒤 곧장
  // /admin 으로 오면 비어 있다 → 아래 권한 확인(GET /api/admin) 응답의 전체 목록으로 채운다.
  const [products, setProducts] = useState(initialProducts);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    originalPrice: 0,
    discountedPrice: 0,
    discountRate: 0,
    stock: 0,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    category: "전자기기",
    originalPrice: "",
    discountMode: "none", // "none"(할인 없음) | "rate"(할인율) | "price"(할인가)
    discountedPrice: "",
    discountRate: "",
    stock: "",
  });
  const [addError, setAddError] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  // Vite 기준
  const API_BASE = apiBase || import.meta.env.VITE_API_BASE_URL || "";

  // 권한 검증
  useEffect(() => {
    const checkAdminAccess = async () => {
      const token = localStorage.getItem('token');
      
      try {
        const res = await fetch(`${API_BASE}/api/admin`, {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        
        const data = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          // 상태 코드별 적절한 메시지 표시
          let errorMessage = '';
          
          if (res.status === 401) {
            // 토큰 없음 또는 유효하지 않음
            errorMessage = `🔒 인증 오류 (${res.status})\n\n`;
            if (data.code === 'AUTH_NO_TOKEN') {
              errorMessage += '토큰이 없습니다.\n로그인이 필요합니다.';
            } else if (data.code === 'AUTH_INVALID_TOKEN') {
              errorMessage += '토큰이 유효하지 않습니다.\n다시 로그인해주세요.';
            } else {
              errorMessage += data.message || '인증에 실패했습니다.';
            }
          } else if (res.status === 403) {
            // 권한 없음
            errorMessage = `⛔ 권한 오류 (${res.status})\n\n`;
            errorMessage += data.message || '관리자 권한이 필요합니다.\n일반 사용자는 접근할 수 없습니다.';
          } else if (res.status === 500) {
            // 서버 오류
            errorMessage = `🔥 서버 오류 (${res.status})\n\n`;
            errorMessage += data.message || '서버에서 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.';
          } else {
            // 기타 오류
            errorMessage = `❌ API 오류 (${res.status})\n\n`;
            errorMessage += data.message || '알 수 없는 오류가 발생했습니다.';
          }
          
          toast.error(errorMessage);
          if (onAccessDenied) onAccessDenied();
          return;
        }
        
        // 성공 - 관리자 권한 확인됨.
        // GET /api/admin 은 비활성 포함 전체 상품 목록을 반환한다 → 그대로 사용해
        // App 의 products state 유무와 무관하게 항상 목록이 채워지도록 한다.
        if (Array.isArray(data.products)) {
          setProducts(data.products);
        }
        setIsAuthorized(true);
      } catch (e) {
        // 네트워크 오류
        toast.error(`🌐 네트워크 오류\n\n${e.message}\n\n서버에 연결할 수 없습니다.`);
        if (onAccessDenied) onAccessDenied();
      } finally {
        setIsChecking(false);
      }
    };

    checkAdminAccess();
  }, [API_BASE, onAccessDenied]);

  if (isChecking) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>권한 확인 중...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  // ============================================
  // 상품 수정
  // ============================================
  const handleEdit = (product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name ?? "",
      originalPrice: Number(product.originalPrice ?? 0),
      discountedPrice: Number(product.discountedPrice ?? 0),
      discountRate: Number(product.discountRate ?? 0),
      stock: Number(product.stock ?? 0),
    });
  };

  const handleSave = async () => {
    if (editingId == null) return;

    // API 호출
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || `수정 실패 (${res.status})`);
        return;
      }
    } catch {
      toast.error("API 호출 중 오류 발생. 클라이언트 상태만 업데이트됩니다.");
    }

    // 클라이언트 상태 업데이트
    const updatedProducts = products.map((p) =>
      p.id === editingId
        ? {
            ...p,
            ...editForm,
            price: editForm.discountedPrice || editForm.originalPrice,
          }
        : p
    );

    // localStorage에 전체 상품 목록의 변경사항 저장
    localStorage.setItem('allProductsModifications', JSON.stringify(updatedProducts));

    setProducts(updatedProducts);
    onUpdateProducts?.(updatedProducts);
    setEditingId(null);
    setEditForm({
      name: "",
      originalPrice: 0,
      discountedPrice: 0,
      discountRate: 0,
      stock: 0,
    });
    toast.success("상품 정보가 수정되었습니다.");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      originalPrice: 0,
      discountedPrice: 0,
      discountRate: 0,
      stock: 0,
    });
  };

  // ============================================
  // 활성/비활성 토글 (클라 상태만)
  // ============================================
  const handleToggleActive = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      const product = products.find(p => p.id === productId);
      
      if (!product) return;
      
      // active 값 토글
      const newActiveValue = product.active === false ? true : false;
      
      const res = await fetch(`${API_BASE}/api/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          id: productId,
          active: newActiveValue,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(`활성 상태 변경 실패\n상태 코드: ${res.status}\n메시지: ${data.message || '알 수 없는 오류'}`);
        return;
      }
      
      // 로컬 상태 업데이트
      const updatedProducts = products.map((p) =>
        p.id === productId ? { ...p, active: newActiveValue } : p
      );

      // localStorage에 전체 상품 목록 저장
      localStorage.setItem('allProductsModifications', JSON.stringify(updatedProducts));

      setProducts(updatedProducts);
      onUpdateProducts?.(updatedProducts);
      
    } catch (err) {
      toast.error('활성 상태 변경 중 오류 발생: ' + err.message);
    }
  };

  // ============================================
  // 상품 추가
  // ============================================
  const validateAddForm = () => {
    if (!addForm.name.trim()) return "상품명을 입력해주세요.";
    if (!addForm.originalPrice || Number(addForm.originalPrice) <= 0)
      return "정가를 올바르게 입력해주세요.";
    // 할인은 선택 사항 — 선택한 방식(할인율/할인가)만 검증한다.
    if (addForm.discountMode === "rate") {
      const r = Number(addForm.discountRate);
      if (addForm.discountRate === "" || !Number.isFinite(r) || r <= 0 || r >= 100)
        return "할인율(%)을 1~99 사이로 입력해주세요.";
    } else if (addForm.discountMode === "price") {
      const p = Number(addForm.discountedPrice);
      if (addForm.discountedPrice === "" || !Number.isFinite(p) || p <= 0)
        return "할인가를 올바르게 입력해주세요.";
      if (p >= Number(addForm.originalPrice))
        return "할인가는 정가보다 작아야 합니다.";
    }
    if (
      addForm.stock !== "" &&
      (!Number.isInteger(Number(addForm.stock)) || Number(addForm.stock) < 0)
    )
      return "재고는 0 이상의 정수여야 합니다.";
    return "";
  };

  const handleAddProduct = async () => {
    const error = validateAddForm();
    if (error) {
      setAddError(error);
      return;
    }
    setAddError("");

    const orig = Number(addForm.originalPrice);
    // 할인 방식(discountMode)에 따라 할인가/할인율을 산출한다.
    //  - none : 할인 없음 → 할인가=정가, 할인율=0
    //  - rate : 할인율 입력 → 할인가 = round(정가 * (1 - 율/100))
    //  - price: 할인가 입력 → 할인율 = round((1 - 할인가/정가) * 100)
    let disc = orig;
    let rate = 0;
    if (addForm.discountMode === "rate") {
      rate = Number(addForm.discountRate);
      disc = Math.round(orig * (1 - rate / 100));
    } else if (addForm.discountMode === "price") {
      disc = Number(addForm.discountedPrice);
      rate = orig > 0 ? Math.max(0, Math.round((1 - disc / orig) * 100)) : 0;
    }
    const imageUrl = getRandomImage();
    const newProduct = {
      name: addForm.name.trim(),
      category: addForm.category,
      originalPrice: orig,
      discountedPrice: disc,
      discountRate: rate,
      stock: addForm.stock !== "" ? Number(addForm.stock) : 20, // 선택 · 미입력 시 기본 20
      imageUrl, // 홈/목록 썸네일에 반영되도록 서버로 전송
      images: [imageUrl],
    };

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(newProduct),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || `추가 실패 (${res.status})`);
        return;
      }

      const added = data.product 
        ? {
            ...data.product,
            price: data.product.price || data.product.discountedPrice || newProduct.discountedPrice,
            imageUrl: data.product.imageUrl || getRandomImage(),
            description: data.product.description || `${newProduct.name} 상품입니다.`,
            active: data.product.active !== undefined ? data.product.active : true,
          }
        : {
            ...newProduct,
            id: Math.max(...products.map((p) => p.id), 0) + 1,
            price: newProduct.discountedPrice,
            imageUrl: getRandomImage(),
            description: `${newProduct.name} 상품입니다.`,
            active: true,
          };

      const updatedProducts = [...products, added];
      
      // localStorage에 전체 상품 목록 저장
      localStorage.setItem('allProductsModifications', JSON.stringify(updatedProducts));

      setProducts(updatedProducts);
      onUpdateProducts?.(updatedProducts);
      setIsAdding(false);
      setAddForm({
        name: "",
        category: "전자기기",
        originalPrice: "",
        discountMode: "none",
        discountedPrice: "",
        discountRate: "",
        stock: "",
      });
      toast.success("상품이 추가되었습니다.");
    } catch {
      toast.error("API 호출 중 오류 발생");
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setAddForm({
      name: "",
      category: "전자기기",
      originalPrice: "",
      discountMode: "none",
      discountedPrice: "",
      discountRate: "",
      stock: "",
    });
    setAddError("");
  };

  // ============================================
  // 상품 삭제
  // ============================================
  const handleDeleteProduct = async (productId) => {
    if (!confirm("이 상품을 삭제하시겠습니까?")) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/admin`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ id: productId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || `삭제 실패 (${res.status})`);
        return;
      }
    } catch {
      toast.error("API 호출 중 오류 발생. 클라이언트 상태만 업데이트됩니다.");
    }

    const updatedProducts = products.filter((p) => p.id !== productId);
    
    // localStorage에 전체 상품 목록 저장
    localStorage.setItem('allProductsModifications', JSON.stringify(updatedProducts));
    
    setProducts(updatedProducts);
    onUpdateProducts?.(updatedProducts);
    toast.error("상품이 삭제되었습니다.");
  };

  // ============================================
  // 데이터 초기화 (POST /api/reset) — 전 테이블 시드 상태 복구
  // ============================================
  const handleReset = async () => {
    if (
      !confirm(
        "모든 데이터를 시드 상태로 초기화합니다.\n\n" +
          "· 주문/리뷰/위시리스트/장바구니/쿠폰 삭제\n" +
          "· 가입 계정 삭제(시드 계정 test/admin/test2만 유지)\n" +
          "· 상품·재고를 초기값으로 복구\n\n계속하시겠습니까?"
      )
    ) {
      return;
    }
    setIsResetting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/reset`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || `초기화 실패 (${res.status})`);
        return;
      }
      toast.success(data.message || "모든 데이터가 초기화되었습니다.");
      // 상품·쿠폰 등 전 상태가 시드로 바뀌었으므로 페이지를 새로고침해 깨끗하게 반영
      window.location.reload();
    } catch (e) {
      toast.error("초기화 중 오류가 발생했습니다: " + e.message);
    } finally {
      setIsResetting(false);
    }
  };

  // 목록 표시는 ID 내림차순 (최신·높은 ID 상위) — 새로 추가한 상품이 곧바로 맨 위에 쌓인다.
  // 원본 products 배열은 정렬하지 않는다(find/최대 ID 계산 등 로직은 그대로 사용).
  const sortedProducts = [...products].sort((a, b) => b.id - a.id);

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .admin-page {
          min-height: 100vh;
          background-color: #f8f9fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .admin-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .admin-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a1a1a;
        }

        .add-product-btn {
          padding: 10px 20px;
          background-color: #10b981;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .add-product-btn:hover { background-color: #059669; }

        .admin-toolbar-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .reset-data-btn {
          padding: 10px 20px;
          background-color: #ef4444;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .reset-data-btn:hover:not(:disabled) { background-color: #dc2626; }
        .reset-data-btn:disabled { background-color: #fca5a5; cursor: not-allowed; }

        .admin-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .info-box {
          background-color: #dbeafe;
          border-left: 4px solid #3b82f6;
          padding: 16px;
          margin-bottom: 24px;
          border-radius: 4px;
        }

        .info-box-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 8px;
        }

        .info-box-text {
          font-size: 13px;
          color: #1e40af;
        }

        /* 상품 추가 폼 */
        .add-form-section {
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 24px;
          margin-bottom: 24px;
          border: 2px solid #10b981;
        }

        .add-form-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .add-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group { display: flex; flex-direction: column; gap: 6px; }

        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
        }

        .form-label .required { color: #dc2626; margin-left: 2px; }

        .form-input, .form-select {
          width: 100%;
          padding: 8px 12px;
          font-size: 14px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          outline: none;
          transition: border-color 0.2s;
          background: #fff;
        }

        .form-input:focus, .form-select:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
        }

        .add-form-error {
          color: #dc2626;
          font-size: 13px;
          margin-bottom: 12px;
          padding: 8px 12px;
          background-color: #fef2f2;
          border-radius: 6px;
          border: 1px solid #fecaca;
        }

        .add-form-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        /* 테이블 */
        .product-table {
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          overflow: hidden;
        }

        .table-wrapper { overflow-x: auto; }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 820px;
        }

        thead { background-color: #f3f4f6; }

        th {
          padding: 16px;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
          color: #4b5563;
          border-bottom: 2px solid #e5e7eb;
          white-space: nowrap;
        }

        td {
          padding: 16px;
          font-size: 14px;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: middle;
        }

        tbody tr:hover { background-color: #f9fafb; }

        .product-name-cell { font-weight: 500; color: #1f2937; }

        .edit-input {
          width: 100%;
          padding: 6px 10px;
          font-size: 13px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          outline: none;
        }

        .edit-input:focus {
          border-color: #1a1a1a;
          box-shadow: 0 0 0 2px rgba(26, 26, 26, 0.1);
        }

        .action-buttons { display: flex; gap: 8px; flex-wrap: wrap; }

        .btn {
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .btn-edit { background-color: #3b82f6; color: #ffffff; }
        .btn-edit:hover { background-color: #2563eb; }

        .btn-save { background-color: #10b981; color: #ffffff; }
        .btn-save:hover { background-color: #059669; }

        .btn-cancel { background-color: #6b7280; color: #ffffff; }
        .btn-cancel:hover { background-color: #4b5563; }

        .btn-toggle { background-color: #f59e0b; color: #ffffff; }
        .btn-toggle:hover { background-color: #d97706; }

        .btn-delete { background-color: #ef4444; color: #ffffff; }
        .btn-delete:hover { background-color: #dc2626; }

        .btn-confirm {
          padding: 8px 20px;
          background-color: #10b981;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-confirm:hover { background-color: #059669; }

        .btn-cancel-form {
          padding: 8px 20px;
          background-color: #6b7280;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .btn-cancel-form:hover { background-color: #4b5563; }

        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 12px;
        }

        .status-active { background-color: #d1fae5; color: #065f46; }
        .status-inactive { background-color: #fee2e2; color: #991b1b; }

        /* 재고 / 품절 표시 */
        .stock-badge {
          display: inline-block;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 12px;
          background-color: #eef2ff;
          color: #3730a3;
        }
        .stock-badge.soldout { background-color: #fee2e2; color: #991b1b; }

        /* 비활성 상품 행/카드 시각적 흐림 처리 */
        .row-inactive { opacity: 0.55; }
        .card-inactive { opacity: 0.55; }

        .empty-table {
          text-align: center;
          padding: 48px;
          color: #6b7280;
          font-size: 14px;
        }

        /* 모바일 카드 스타일 */
        .product-card-mobile {
          display: none;
        }

        @media (max-width: 768px) {
          .admin-toolbar { flex-direction: column; align-items: flex-start; gap: 12px; }
          .admin-title { font-size: 20px; }
          .admin-content { padding: 16px 12px !important; }

          /* 모바일에서 테이블 숨기고 카드 표시 */
          .table-wrapper { display: none; }
          
          .product-card-mobile {
            display: block;
            background-color: #ffffff;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          .product-card-header {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .product-card-title {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            flex: 1;
          }
          
          .product-card-id {
            font-size: 12px;
            color: #6b7280;
            background-color: #f3f4f6;
            padding: 4px 8px;
            border-radius: 4px;
            margin-left: 8px;
            flex-shrink: 0;
          }
          
          .product-card-body {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 12px;
          }
          
          .product-card-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
          }
          
          .product-card-label {
            color: #6b7280;
            font-weight: 500;
          }
          
          .product-card-value {
            color: #1f2937;
            font-weight: 500;
          }
          
          .product-card-actions {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
          }
          
          .form-grid { grid-template-columns: 1fr !important; }
          .add-form-section { padding: 16px; margin-bottom: 16px; }
          .info-box { padding: 12px; margin-bottom: 16px; }
        }
        @media (max-width: 480px) {
          .admin-title { font-size: 18px; }
          .add-product-btn { padding: 8px 16px; font-size: 13px; }
          .admin-content { padding: 12px 8px !important; }
          .add-form-section { padding: 12px; }
          .product-card-mobile { padding: 12px; }
        }
      `}</style>

      <div className="admin-page">
        <div className="admin-content">
          <div className="admin-toolbar">
            <h1 className="admin-title">관리자 페이지</h1>

            <div className="admin-toolbar-actions">
              {!isAdding && (
                <button
                  onClick={() => {
                    setIsAdding(true);
                    setAddError("");
                  }}
                  className="add-product-btn"
                >
                  + 상품 추가
                </button>
              )}
              <button
                type="button"
                id="admin-reset-btn"
                data-testid="admin-reset-btn"
                className="reset-data-btn"
                onClick={handleReset}
                disabled={isResetting}
                title="모든 데이터를 시드 상태로 초기화합니다"
              >
                {isResetting ? "초기화 중..." : "데이터 초기화"}
              </button>
            </div>
          </div>

          <div className="info-box">
            <div className="info-box-title">상품 관리</div>
            <div className="info-box-text">
              상품의 가격, 할인율을 수정하거나 활성화/비활성화, 추가, 삭제할 수 있습니다.
              수정·추가·삭제는 API와 연동됩니다.
            </div>
          </div>

          {isAdding && (
            <div className="add-form-section">
              <div className="add-form-title">새 상품 추가</div>

              {addError && <div className="add-form-error">{addError}</div>}

              <div className="add-form-grid">
                <div className="form-group">
                  <label className="form-label">
                    상품명 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="상품명 입력"
                    value={addForm.name}
                    onChange={(e) => {
                      setAddForm({ ...addForm, name: e.target.value });
                      setAddError("");
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    카테고리 <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={addForm.category}
                    onChange={(e) =>
                      setAddForm({ ...addForm, category: e.target.value })
                    }
                  >
                    <option value="전자기기">전자기기</option>
                    <option value="액세서리">액세서리</option>
                    <option value="생활">생활</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    정가 (원) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={addForm.originalPrice}
                    onChange={(e) => {
                      setAddForm({ ...addForm, originalPrice: e.target.value });
                      setAddError("");
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    할인 <span style={{ color: "#9ca3af", fontWeight: 400 }}>(선택 · 할인율 또는 할인가 중 하나)</span>
                  </label>
                  <select
                    className="form-select"
                    data-testid="admin-add-discount-mode"
                    value={addForm.discountMode}
                    onChange={(e) => {
                      setAddForm({
                        ...addForm,
                        discountMode: e.target.value,
                        discountedPrice: "",
                        discountRate: "",
                      });
                      setAddError("");
                    }}
                  >
                    <option value="none">할인 없음</option>
                    <option value="rate">할인율(%)로 입력</option>
                    <option value="price">할인가(원)로 입력</option>
                  </select>
                </div>

                {addForm.discountMode === "rate" && (
                  <div className="form-group">
                    <label className="form-label">할인율 (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      data-testid="admin-add-discount-rate"
                      placeholder="예: 10 (1~99)"
                      value={addForm.discountRate}
                      onChange={(e) => {
                        setAddForm({ ...addForm, discountRate: e.target.value });
                        setAddError("");
                      }}
                    />
                  </div>
                )}

                {addForm.discountMode === "price" && (
                  <div className="form-group">
                    <label className="form-label">할인가 (원)</label>
                    <input
                      type="number"
                      className="form-input"
                      data-testid="admin-add-discount-price"
                      placeholder="정가보다 작은 금액"
                      value={addForm.discountedPrice}
                      onChange={(e) => {
                        setAddForm({ ...addForm, discountedPrice: e.target.value });
                        setAddError("");
                      }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="admin-add-stock">
                    재고 <span style={{ color: "#9ca3af", fontWeight: 400 }}>(선택 · 미입력 시 20)</span>
                  </label>
                  <input
                    id="admin-add-stock"
                    data-testid="admin-add-stock"
                    type="number"
                    min="0"
                    className="form-input"
                    placeholder="미입력 시 20"
                    value={addForm.stock}
                    onChange={(e) => {
                      setAddForm({ ...addForm, stock: e.target.value });
                      setAddError("");
                    }}
                  />
                </div>
              </div>

              <div className="add-form-actions">
                <button onClick={handleCancelAdd} className="btn-cancel-form">
                  취소
                </button>
                <button onClick={handleAddProduct} className="btn-confirm">
                  상품 추가
                </button>
              </div>
            </div>
          )}

          <div className="product-table">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>이미지</th>
                    <th>상품명</th>
                    <th>카테고리</th>
                    <th>정가</th>
                    <th>할인가</th>
                    <th>할인율</th>
                    <th>재고</th>
                    <th>상태</th>
                    <th>ID</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="empty-table">
                        상품이 없습니다. 상단의 상품 추가 버튼을 사용하세요.
                      </td>
                    </tr>
                  ) : (
                    sortedProducts.map((product) => (
                      <tr
                        key={product.id}
                        data-testid={`admin-row-${product.id}`}
                        className={product.active === false ? "row-inactive" : undefined}
                      >
                        <td>
                          <img
                            src={product.imageUrl || "/placeholder.svg"}
                            alt={product.name}
                            style={{
                              width: "60px",
                              height: "60px",
                              objectFit: "cover",
                              borderRadius: "4px"
                            }}
                          />
                        </td>

                        <td className="product-name-cell">
                          {editingId === product.id ? (
                            <input
                              type="text"
                              className="edit-input"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                            />
                          ) : (
                            product.name
                          )}
                        </td>

                        <td>{product.category || "-"}</td>

                        <td>
                          {editingId === product.id ? (
                            <input
                              type="number"
                              className="edit-input"
                              value={editForm.originalPrice}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  originalPrice: Number(e.target.value),
                                })
                              }
                            />
                          ) : (
                            `${Number(product.originalPrice || 0).toLocaleString()}원`
                          )}
                        </td>

                        <td>
                          {editingId === product.id ? (
                            <input
                              type="number"
                              className="edit-input"
                              value={editForm.discountedPrice}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  discountedPrice: Number(e.target.value),
                                })
                              }
                            />
                          ) : (
                            `${Number(product.discountedPrice || 0).toLocaleString()}원`
                          )}
                        </td>

                        <td>
                          {editingId === product.id ? (
                            <input
                              type="number"
                              className="edit-input"
                              value={editForm.discountRate}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  discountRate: Number(e.target.value),
                                })
                              }
                            />
                          ) : (
                            `${Number(product.discountRate || 0)}%`
                          )}
                        </td>

                        <td>
                          {editingId === product.id ? (
                            <input
                              type="number"
                              min="0"
                              className="edit-input"
                              value={editForm.stock}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  stock: Number(e.target.value),
                                })
                              }
                            />
                          ) : (
                            <span
                              data-testid={`admin-stock-${product.id}`}
                              className={`stock-badge ${
                                Number(product.stock ?? 0) === 0 ? "soldout" : ""
                              }`}
                            >
                              {Number(product.stock ?? 0) === 0
                                ? "품절"
                                : `${Number(product.stock ?? 0)}개`}
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            data-testid={`admin-status-${product.id}`}
                            className={`status-badge ${
                              product.active !== false
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {product.active !== false ? "활성" : "비활성화"}
                          </span>
                        </td>

                        <td>{product.id}</td>

                        <td>
                          <div className="action-buttons">
                            {editingId === product.id ? (
                              <>
                                <button
                                  data-testid={`admin-save-btn-${product.id}`}
                                  onClick={handleSave}
                                  className="btn btn-save"
                                >
                                  저장
                                </button>
                                <button
                                  data-testid={`admin-cancel-btn-${product.id}`}
                                  onClick={handleCancel}
                                  className="btn btn-cancel"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  data-testid={`admin-edit-btn-${product.id}`}
                                  onClick={() => handleEdit(product)}
                                  className="btn btn-edit"
                                >
                                  수정
                                </button>
                                <button
                                  data-testid={`admin-toggle-btn-${product.id}`}
                                  onClick={() => handleToggleActive(product.id)}
                                  className="btn btn-toggle"
                                >
                                  {product.active !== false ? "비활성화" : "활성화"}
                                </button>
                                <button
                                  data-testid={`admin-delete-btn-${product.id}`}
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="btn btn-delete"
                                >
                                  삭제
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 레이아웃 */}
            <div className="product-cards-mobile">
              {products.length === 0 ? (
                <div className="empty-table">
                  상품이 없습니다. 상단의 상품 추가 버튼을 사용하세요.
                </div>
              ) : (
                sortedProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`product-card-mobile${
                      product.active === false ? " card-inactive" : ""
                    }`}
                  >
                    <div className="product-card-header">
                      <img
                        src={product.imageUrl || "/placeholder.svg"}
                        alt={product.name}
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                      />
                      <div className="product-card-id">ID: {product.id}</div>
                    </div>
                    
                    <div style={{ marginBottom: "12px" }}>
                      <div className="product-card-title">
                        {editingId === product.id ? (
                          <input
                            type="text"
                            className="edit-input"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                          />
                        ) : (
                          product.name
                        )}
                      </div>
                    </div>

                    <div className="product-card-body">
                      <div className="product-card-row">
                        <span className="product-card-label">카테고리</span>
                        <span className="product-card-value">{product.category || "-"}</span>
                      </div>

                      <div className="product-card-row">
                        <span className="product-card-label">정가</span>
                        <span className="product-card-value">
                          {editingId === product.id ? (
                            <input
                              type="number"
                              className="edit-input"
                              value={editForm.originalPrice}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  originalPrice: Number(e.target.value),
                                })
                              }
                              style={{ width: '100px' }}
                            />
                          ) : (
                            `${Number(product.originalPrice || 0).toLocaleString()}원`
                          )}
                        </span>
                      </div>

                      <div className="product-card-row">
                        <span className="product-card-label">할인가</span>
                        <span className="product-card-value">
                          {editingId === product.id ? (
                            <input
                              type="number"
                              className="edit-input"
                              value={editForm.discountedPrice}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  discountedPrice: Number(e.target.value),
                                })
                              }
                              style={{ width: '100px' }}
                            />
                          ) : (
                            `${Number(product.discountedPrice || 0).toLocaleString()}원`
                          )}
                        </span>
                      </div>

                      <div className="product-card-row">
                        <span className="product-card-label">할인율</span>
                        <span className="product-card-value">
                          {editingId === product.id ? (
                            <input
                              type="number"
                              className="edit-input"
                              value={editForm.discountRate}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  discountRate: Number(e.target.value),
                                })
                              }
                              style={{ width: '80px' }}
                            />
                          ) : (
                            `${Number(product.discountRate || 0)}%`
                          )}
                        </span>
                      </div>

                      <div className="product-card-row">
                        <span className="product-card-label">재고</span>
                        <span className="product-card-value">
                          {editingId === product.id ? (
                            <input
                              type="number"
                              min="0"
                              className="edit-input"
                              value={editForm.stock}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  stock: Number(e.target.value),
                                })
                              }
                              style={{ width: '80px' }}
                            />
                          ) : (
                            <span
                              data-testid={`admin-stock-${product.id}`}
                              className={`stock-badge ${
                                Number(product.stock ?? 0) === 0 ? "soldout" : ""
                              }`}
                            >
                              {Number(product.stock ?? 0) === 0
                                ? "품절"
                                : `${Number(product.stock ?? 0)}개`}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="product-card-row">
                        <span className="product-card-label">상태</span>
                        <span
                          data-testid={`admin-status-${product.id}`}
                          className={`status-badge ${
                            product.active !== false
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          {product.active !== false ? "활성" : "비활성화"}
                        </span>
                      </div>
                    </div>

                    <div className="product-card-actions">
                      {editingId === product.id ? (
                        <>
                          <button onClick={handleSave} className="btn btn-save">
                            저장
                          </button>
                          <button onClick={handleCancel} className="btn btn-cancel">
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            data-testid={`edit-btn-${product.id}`}
                            onClick={() => handleEdit(product)}
                            className="btn btn-edit"
                          >
                            수정
                          </button>
                          <button
                            data-testid={`toggle-btn-${product.id}`}
                            onClick={() => handleToggleActive(product.id)}
                            className="btn btn-toggle"
                          >
                            {product.active !== false ? "비활성화" : "활성화"}
                          </button>
                          <button
                            data-testid={`delete-btn-${product.id}`}
                            onClick={() => handleDeleteProduct(product.id)}
                            className="btn btn-delete"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ===== 쿠폰 관리 ===== */}
          <CouponAdminSection apiBase={API_BASE} />
        </div>
      </div>
    </>
  );
}

// 어드민 쿠폰 생성/목록 (자체 상태·스타일 포함)
function CouponAdminSection({ apiBase }) {
  const API_BASE = apiBase || "";
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({
    code: "",
    type: "percent",
    amount: "",
    minOrder: "",
    maxDiscount: "",
    expiresAt: "",
  });
  const [message, setMessage] = useState(null); // { type, text }
  const [creating, setCreating] = useState(false);

  const fetchCoupons = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_BASE}/api/admin/coupons`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
    } catch {
      /* 목록 로드 실패는 무시 */
    }
  };

  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    setMessage(null);
    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      const body = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        amount: Number(form.amount),
        minOrder: form.minOrder === "" ? 0 : Number(form.minOrder),
        maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount),
        expiresAt: form.expiresAt || null,
      };
      const res = await fetch(`${API_BASE}/api/admin/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: data.message || data.code || `쿠폰 생성 실패 (status=${res.status})` });
        return;
      }
      setMessage({ type: "success", text: data.message || "쿠폰이 생성되었습니다" });
      setForm({ code: "", type: "percent", amount: "", minOrder: "", maxDiscount: "", expiresAt: "" });
      fetchCoupons();
    } catch (err) {
      setMessage({ type: "error", text: `쿠폰 생성 중 오류가 발생했습니다: ${err.message}` });
    } finally {
      setCreating(false);
    }
  };

  const s = couponStyles;
  return (
    <section style={s.section} data-testid="admin-coupon-section" aria-label="쿠폰 관리">
      <h2 style={s.title}>쿠폰 관리</h2>
      <p style={s.desc}>쿠폰 번호를 생성하면 사용자가 내 정보에서 등록해 결제 시 사용할 수 있습니다.</p>

      <form onSubmit={handleCreate} style={s.form} className="admin-coupon-form">
        <div style={s.row}>
          <label style={s.label} htmlFor="admin-coupon-code">쿠폰 번호</label>
          <input id="admin-coupon-code" data-testid="admin-coupon-code" style={s.input}
            value={form.code} onChange={set("code")} placeholder="예: SUMMER30 (영문/숫자 4~20자)" />
        </div>
        <div style={s.row}>
          <label style={s.label} htmlFor="admin-coupon-type">할인 유형</label>
          <select id="admin-coupon-type" data-testid="admin-coupon-type" style={s.input}
            value={form.type} onChange={set("type")}>
            <option value="percent">정률(%)</option>
            <option value="fixed">정액(원)</option>
          </select>
        </div>
        <div style={s.row}>
          <label style={s.label} htmlFor="admin-coupon-amount">할인 값</label>
          <input id="admin-coupon-amount" data-testid="admin-coupon-amount" style={s.input} type="number"
            value={form.amount} onChange={set("amount")}
            placeholder={form.type === "percent" ? "1~100 (%)" : "할인 금액(원)"} />
        </div>
        <div style={s.row}>
          <label style={s.label} htmlFor="admin-coupon-min-order">최소 주문금액</label>
          <input id="admin-coupon-min-order" data-testid="admin-coupon-min-order" style={s.input} type="number"
            value={form.minOrder} onChange={set("minOrder")} placeholder="0 (선택)" />
        </div>
        <div style={s.row}>
          <label style={s.label} htmlFor="admin-coupon-max-discount">최대 할인금액</label>
          <input id="admin-coupon-max-discount" data-testid="admin-coupon-max-discount" style={s.input} type="number"
            value={form.maxDiscount} onChange={set("maxDiscount")} placeholder="정률 쿠폰 상한 (선택)" />
        </div>
        <div style={s.row}>
          <label style={s.label} htmlFor="admin-coupon-expiry">만료일</label>
          <input id="admin-coupon-expiry" data-testid="admin-coupon-expiry" style={s.input} type="date"
            value={form.expiresAt} onChange={set("expiresAt")} />
        </div>
        <button type="submit" id="admin-coupon-create-btn" data-testid="admin-coupon-create-btn"
          style={s.createBtn} disabled={creating}>
          {creating ? "생성 중..." : "쿠폰 생성"}
        </button>
      </form>

      {message && (
        <p id="admin-coupon-message" data-testid="admin-coupon-message"
          role={message.type === "success" ? "status" : "alert"}
          style={{ ...s.message, ...(message.type === "success" ? s.msgOk : s.msgErr) }}>
          {message.text}
        </p>
      )}

      <div style={s.listHead}>
        <strong>전체 쿠폰</strong>
        <span data-testid="admin-coupon-count">{coupons.length}개</span>
      </div>
      {coupons.length === 0 ? (
        <p data-testid="admin-coupons-empty" style={s.empty}>생성된 쿠폰이 없습니다.</p>
      ) : (
        <ul style={s.list} data-testid="admin-coupon-list">
          {coupons.map((c) => (
            <li key={c.code} data-testid={`admin-coupon-row-${c.code}`} style={s.item}>
              <span style={s.itemCode}>{c.code}</span>
              <span style={s.itemDesc}>
                {c.type === "percent" ? `${c.amount}%` : `${Number(c.amount).toLocaleString("ko-KR")}원`} 할인
                {c.minOrder ? ` · 최소 ${Number(c.minOrder).toLocaleString("ko-KR")}원` : ""}
                {c.maxDiscount ? ` · 최대 ${Number(c.maxDiscount).toLocaleString("ko-KR")}원` : ""}
                {c.expiresAt ? ` · ~${String(c.expiresAt).slice(0, 10)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const couponStyles = {
  section: { backgroundColor: "#ffffff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "24px", marginTop: "20px", display: "flex", flexDirection: "column", gap: "14px" },
  title: { fontSize: "18px", fontWeight: 700, color: "#1a1a1a", margin: 0 },
  desc: { fontSize: "13px", color: "#6b7280", margin: 0 },
  form: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", alignItems: "end" },
  row: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "13px", fontWeight: 600, color: "#374151" },
  input: { padding: "10px 12px", fontSize: "14px", border: "1px solid #d1d5db", borderRadius: "8px" },
  createBtn: { padding: "12px 20px", fontSize: "14px", fontWeight: 700, color: "#ffffff", backgroundColor: "#1a1a1a", border: "none", borderRadius: "8px", cursor: "pointer", whiteSpace: "nowrap", height: "42px" },
  message: { margin: 0, padding: "10px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: 500 },
  msgOk: { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" },
  msgErr: { backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" },
  listHead: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "14px", color: "#374151", borderTop: "1px solid #f0f0f0", paddingTop: "14px" },
  empty: { fontSize: "14px", color: "#6b7280", textAlign: "center", padding: "16px 0", margin: 0 },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "8px" },
  item: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", border: "1px dashed #d1d5db", borderRadius: "10px", backgroundColor: "#fafafa", flexWrap: "wrap" },
  itemCode: { fontSize: "15px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "0.5px", minWidth: "120px" },
  itemDesc: { fontSize: "13px", color: "#6b7280" },
};
