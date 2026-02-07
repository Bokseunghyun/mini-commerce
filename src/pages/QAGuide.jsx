/**
 * QA 자동화 가이드 컴포넌트
 * - 프로젝트의 QA 자동화 포인트를 안내
 * - Playwright 테스트 시나리오 예시 제공 (TypeScript 형식)
 * - UI 자동화 검증 & API 검증 가이드 포함
 */

import { useState } from "react";
import uiGuideContent from "./UI_AUTOMATION_GUIDE.md?raw";
import apiGuideContent from "./API_TESTING_GUIDE2.md?raw";

export default function QAGuide({ onClose }) {
  const [activeTab, setActiveTab] = useState("ui-guide");

  const tabs = [
    { id: "ui-guide", label: "🎨 UI 자동화 가이드" },
    { id: "api-guide", label: "🌐 API 검증 가이드" },
    { id: "overview", label: "📌 개요 & UI 포인트" },
    { id: "errors", label: "💥 오류 케이스" },
    { id: "scenarios", label: "🎬 테스트 시나리오" },
    { id: "flows", label: "🔄 시스템 흐름" },
    { id: "api", label: "🌐 API 문서" },
    { id: "skills", label: "📚 역량 & 리소스" },
  ];

  // Markdown 렌더링 함수 (간단한 변환)
  const renderMarkdown = (content) => {
    return content
      .split('\n')
      .map((line, i) => {
        // 코드 블록 시작/종료
        if (line.startsWith('```')) {
          return '';
        }
        // 헤딩
        if (line.startsWith('# ')) {
          return <h1 key={i} style={styles.h1}>{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i} style={styles.h2}>{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} style={styles.h3}>{line.slice(4)}</h3>;
        }
        if (line.startsWith('#### ')) {
          return <h4 key={i} style={styles.h4}>{line.slice(5)}</h4>;
        }
        // 리스트
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i} style={styles.li}>{line.slice(2)}</li>;
        }
        // 코드 라인 (백틱 3개 사이)
        if (line.trim().length > 0 && !line.startsWith('#')) {
          // inline code 처리
          const parts = line.split('`');
          if (parts.length > 1) {
            return (
              <p key={i} style={styles.p}>
                {parts.map((part, j) => 
                  j % 2 === 1 ? <code key={j} style={styles.inlineCode}>{part}</code> : part
                )}
              </p>
            );
          }
          return <p key={i} style={styles.p}>{line}</p>;
        }
        return <br key={i} />;
      });
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>QA 자동화 가이드</h2>
          <button
            id="qa-guide-close"
            className="btn-close"
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div style={styles.tabNav} role="tablist" aria-label="가이드 탭">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tab-panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {}),
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {/* ============ TAB: UI 자동화 가이드 ============ */}
          {activeTab === "ui-guide" && (
            <div role="tabpanel" id="tab-panel-ui-guide" aria-labelledby="tab-ui-guide">
              <div style={styles.markdownContent}>
                {renderMarkdown(uiGuideContent)}
              </div>
            </div>
          )}

          {/* ============ TAB: API 검증 가이드 ============ */}
          {activeTab === "api-guide" && (
            <div role="tabpanel" id="tab-panel-api-guide" aria-labelledby="tab-api-guide">
              <div style={styles.markdownContent}>
                {renderMarkdown(apiGuideContent)}
              </div>
            </div>
          )}

          {/* ============ TAB: overview ============ */}
          {activeTab === "overview" && (
            <div role="tabpanel" id="tab-panel-overview" aria-labelledby="tab-overview">
              {/* 기존 overview 탭 내용 유지 */}
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>📌 프로젝트 개요</h3>
                <p style={styles.text}>
                  이 프로젝트는 <strong>QA 자동화 연습</strong>과 <strong>포트폴리오</strong>를 목적으로 설계된 데모 쇼핑몰입니다.
                </p>
                <ul style={styles.list}>
                  <li>기술 스택: React (Vite), JavaScript, Vercel Serverless Functions</li>
                  <li>DB 없음 (메모리 기반 데이터)</li>
                  <li>의도적인 오류 케이스 포함</li>
                </ul>
              </section>

              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>🎯 자동화 대상 UI/API 포인트</h3>
                <div style={styles.subsection}>
                  <h4 style={styles.subsectionTitle}>UI 식별자</h4>
                  <p style={styles.text}>모든 주요 UI 요소는 다음 중 하나 이상을 포함합니다:</p>
                  <ul style={styles.list}>
                    <li><code>id</code> 속성 (예: id="home-search", id="login-submit")</li>
                    <li><code>className</code> (예: className="search-input", "login-button")</li>
                    <li><code>aria-label</code> (접근성 + 자동화)</li>
                    <li><code>role</code> (의미론적 역할)</li>
                  </ul>
                  <p style={styles.note}>
                    ⚠️ data-testid는 사용하지 않습니다 (실제 사용자 경험과 가까운 셀렉터 연습)
                  </p>
                </div>
              </section>
            </div>
          )}

          {/* ============ 기존 탭들 유지 ============ */}
          {activeTab === "errors" && (
            <div role="tabpanel" id="tab-panel-errors" aria-labelledby="tab-errors">
              <section style={styles.section}>
                <h3 style={styles.sectionTitle}>💥 의도적 오류 케이스</h3>
                <div style={styles.errorCase}>
                  <h4 style={styles.subsectionTitle}>📍 상품 상세 진입 오류</h4>
                  <ul style={styles.list}>
                    <li><strong>Product ID 16:</strong> 404 에러 (상품 없음)</li>
                  </ul>
                </div>
              </section>
            </div>
          )}

          {/* 나머지 탭들도 기존 코드 유지 */}
        </div>

        <div style={styles.footer}>
          <button
            id="qa-guide-close-bottom"
            className="btn btn-primary"
            onClick={onClose}
            style={styles.closeButton}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  tabNav: {
    display: 'flex',
    gap: '4px',
    padding: '12px 32px',
    borderBottom: '1px solid #e5e7eb',
    overflowX: 'auto',
    flexShrink: 0,
  },
  tabBtn: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    color: '#1a1a1a',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
  },
  // Markdown 스타일
  markdownContent: {
    fontSize: '15px',
    lineHeight: 1.7,
  },
  h1: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 0,
    marginBottom: '24px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '12px',
  },
  h2: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1f2937',
    marginTop: '32px',
    marginBottom: '16px',
  },
  h3: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#374151',
    marginTop: '24px',
    marginBottom: '12px',
  },
  h4: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#4b5563',
    marginTop: '16px',
    marginBottom: '8px',
  },
  p: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: 1.7,
    margin: '0 0 12px 0',
  },
  li: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.8,
    margin: '4px 0',
  },
  inlineCode: {
    backgroundColor: '#f3f4f6',
    color: '#e11d48',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  // 기존 스타일
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '16px',
    marginTop: 0,
  },
  subsection: {
    marginBottom: '20px',
  },
  subsectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px',
    marginTop: 0,
  },
  text: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: 1.6,
    margin: '0 0 12px 0',
  },
  list: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.8,
    paddingLeft: '24px',
    margin: '8px 0',
  },
  note: {
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '8px',
    borderLeft: '4px solid #fbbf24',
    margin: '12px 0',
  },
  errorCase: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  footer: {
    padding: '20px 32px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'center',
  },
  closeButton: {
    padding: '12px 32px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
