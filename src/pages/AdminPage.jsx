import { useState, useEffect } from "react";

export default function AdminPage({ products = [], onBack, onUpdateProducts, onAccessDenied, apiBase }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    originalPrice: 0,
    discountedPrice: 0,
    discountRate: 0,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    category: "전자기기",
    originalPrice: "",
    discountedPrice: "",
    discountRate: "",
  });
  const [addError, setAddError] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

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
          
          alert(errorMessage);
          if (onAccessDenied) onAccessDenied();
          return;
        }
        
        // 성공 - 관리자 권한 확인됨
        setIsAuthorized(true);
      } catch (e) {
        // 네트워크 오류
        alert(`🌐 네트워크 오류\n\n${e.message}\n\n서버에 연결할 수 없습니다.`);
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
        alert(data.message || `수정 실패 (${res.status})`);
        return;
      }
    } catch (e) {
      alert("API 호출 중 오류 발생. 클라이언트 상태만 업데이트됩니다.");
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

    onUpdateProducts(updatedProducts);
    setEditingId(null);
    setEditForm({
      name: "",
      originalPrice: 0,
      discountedPrice: 0,
      discountRate: 0,
    });
    alert("상품 정보가 수정되었습니다.");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({
      name: "",
      originalPrice: 0,
      discountedPrice: 0,
      discountRate: 0,
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
        alert(`활성 상태 변경 실패\n상태 코드: ${res.status}\n메시지: ${data.message || '알 수 없는 오류'}`);
        return;
      }
      
      // 로컬 상태 업데이트
      const updatedProducts = products.map((p) =>
        p.id === productId ? { ...p, active: newActiveValue } : p
      );

      // localStorage에 전체 상품 목록 저장
      localStorage.setItem('allProductsModifications', JSON.stringify(updatedProducts));

      onUpdateProducts(updatedProducts);
      
    } catch (err) {
      alert('활성 상태 변경 중 오류 발생: ' + err.message);
    }
  };

  // ============================================
  // 상품 추가
  // ============================================
  const validateAddForm = () => {
    if (!addForm.name.trim()) return "상품명을 입력해주세요.";
    if (!addForm.originalPrice || Number(addForm.originalPrice) <= 0)
      return "정가를 올바르게 입력해주세요.";
    if (!addForm.discountedPrice || Number(addForm.discountedPrice) <= 0)
      return "할인가를 올바르게 입력해주세요.";
    if (Number(addForm.discountedPrice) > Number(addForm.originalPrice))
      return "할인가는 정가보다 작아야 합니다.";
    if (addForm.discountRate !== "" && Number(addForm.discountRate) < 0)
      return "할인율은 0 이상이어야 합니다.";
    return "";
  };

  const handleAddProduct = async () => {
    const error = validateAddForm();
    if (error) {
      setAddError(error);
      return;
    }
    setAddError("");

    const newProduct = {
      name: addForm.name.trim(),
      category: addForm.category,
      originalPrice: Number(addForm.originalPrice),
      discountedPrice: Number(addForm.discountedPrice),
      discountRate: addForm.discountRate !== "" ? Number(addForm.discountRate) : 0,
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
        alert(data.message || `추가 실패 (${res.status})`);
        return;
      }

      const added =
        data.product ||
        ({
          ...newProduct,
          id: Math.max(...products.map((p) => p.id), 0) + 1,
          price: newProduct.discountedPrice,
          imageUrl: "",
          description: `${newProduct.name} 상품입니다.`,
          active: true,
        });

      const updatedProducts = [...products, added];
      
      // localStorage에 전체 상품 목록 저장
      localStorage.setItem('allProductsModifications', JSON.stringify(updatedProducts));

      onUpdateProducts(updatedProducts);
      setIsAdding(false);
      setAddForm({
        name: "",
        category: "전자기기",
        originalPrice: "",
        discountedPrice: "",
        discountRate: "",
      });
      alert("상품이 추가되었습니다.");
    } catch (e) {
      alert("API 호출 중 오류 발생");
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setAddForm({
      name: "",
      category: "전자기기",
      originalPrice: "",
      discountedPrice: "",
      discountRate: "",
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
        alert(data.message || `삭제 실패 (${res.status})`);
        return;
      }
    } catch (e) {
      alert("API 호출 중 오류 발생. 클라이언트 상태만 업데이트됩니다.");
    }

    const updatedProducts = products.filter((p) => p.id !== productId);
    
    // localStorage에 전체 상품 목록 저장
    localStorage.setItem('allProductsModifications', JSON.stringify(updatedProducts));
    
    onUpdateProducts(updatedProducts);
    alert("상품이 삭제되었습니다.");
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .admin-page {
          min-height: 100vh;
          background-color: #f8f9fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .admin-header {
          background-color: #1a1a1a;
          color: #ffffff;
          padding: 20px 24px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .admin-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .admin-title {
          font-size: 24px;
          font-weight: 700;
        }

        .header-buttons {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .back-btn {
          padding: 10px 20px;
          background-color: #ffffff;
          color: #1a1a1a;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .back-btn:hover { background-color: #e5e5e5; }

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
          .admin-header { padding: 16px 12px; }
          .admin-header-inner { flex-direction: column; align-items: flex-start; gap: 12px; }
          .admin-title { font-size: 20px; }
          .header-buttons { width: 100%; justify-content: flex-start; }
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
            justify-content: space-between;
            align-items: flex-start;
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
          .admin-header { padding: 12px 8px; }
          .admin-title { font-size: 18px; }
          .back-btn, .add-product-btn { padding: 8px 16px; font-size: 13px; }
          .admin-content { padding: 12px 8px !important; }
          .add-form-section { padding: 12px; }
          .product-card-mobile { padding: 12px; }
        }
      `}</style>

      <div className="admin-page">
        <header className="admin-header">
          <div className="admin-header-inner">
            <h1 className="admin-title">관리자 페이지</h1>

            <div className="header-buttons">
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

              <button onClick={onBack} className="back-btn">
                홈으로 돌아가기
              </button>
            </div>
          </div>
        </header>

        <div className="admin-content">
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
                    할인가 (원) <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={addForm.discountedPrice}
                    onChange={(e) => {
                      setAddForm({
                        ...addForm,
                        discountedPrice: e.target.value,
                      });
                      setAddError("");
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">할인율 (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={addForm.discountRate}
                    onChange={(e) =>
                      setAddForm({ ...addForm, discountRate: e.target.value })
                    }
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
                    <th>ID</th>
                    <th>상품명</th>
                    <th>카테고리</th>
                    <th>정가</th>
                    <th>할인가</th>
                    <th>할인율</th>
                    <th>상태</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-table">
                        상품이 없습니다. 상단의 상품 추가 버튼을 사용하세요.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.id}</td>

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
                          <span
                            className={`status-badge ${
                              product.active !== false
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {product.active !== false ? "활성" : "비활성"}
                          </span>
                        </td>

                        <td>
                          <div className="action-buttons">
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
                                  onClick={() => handleEdit(product)}
                                  className="btn btn-edit"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => handleToggleActive(product.id)}
                                  className="btn btn-toggle"
                                >
                                  {product.active !== false ? "비활성화" : "활성화"}
                                </button>
                                <button
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
                products.map((product) => (
                  <div key={product.id} className="product-card-mobile">
                    <div className="product-card-header">
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
                      <div className="product-card-id">ID: {product.id}</div>
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
                        <span className="product-card-label">상태</span>
                        <span
                          className={`status-badge ${
                            product.active !== false
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          {product.active !== false ? "활성" : "비활성"}
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
        </div>
      </div>
    </>
  );
}
