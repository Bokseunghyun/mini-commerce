/**
 * api/practice.js - RESTful API 연습용 엔드포인트
 * 
 * 메모리 기반 CRUD 작업 (DB 없이도 RESTful API 테스트 가능)
 * 
 * GET    /api/practice       - 모든 아이템 조회
 * GET    /api/practice?id=1  - 특정 아이템 조회
 * POST   /api/practice       - 새 아이템 생성
 * PUT    /api/practice       - 아이템 전체 수정
 * PATCH  /api/practice       - 아이템 부분 수정
 * DELETE /api/practice       - 아이템 삭제
 * 
 * QA 검증 포인트:
 * - HTTP 메서드별 동작 (GET/POST/PUT/PATCH/DELETE)
 * - 상태 코드 (200, 201, 204, 400, 404, 422)
 * - Request/Response Body 검증
 * - Content-Type 검증
 * - Idempotency (멱등성) 테스트
 */

import { applyCors } from './_lib/common.js';

// 메모리 저장소 (서버리스 환경이므로 재시작 시 초기화)
let items = [
  { id: 1, title: 'Sample Item 1', description: 'This is a sample item', status: 'active', createdAt: new Date().toISOString() },
  { id: 2, title: 'Sample Item 2', description: 'Another sample item', status: 'inactive', createdAt: new Date().toISOString() },
];

let nextId = 3;

export default async function practiceHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  const { id } = req.query;

  // ============================================
  // GET - 조회
  // ============================================
  if (req.method === 'GET') {
    // 특정 아이템 조회
    if (id) {
      const itemId = Number(id);
      const item = items.find(i => i.id === itemId);

      if (!item) {
        return res.status(404).json({
          message: '아이템을 찾을 수 없습니다',
          code: 'ITEM_NOT_FOUND',
          requestedId: itemId,
        });
      }

      return res.status(200).json(item);
    }

    // 전체 아이템 조회
    return res.status(200).json({
      count: items.length,
      items,
    });
  }

  // ============================================
  // POST - 생성
  // ============================================
  if (req.method === 'POST') {
    const { title, description, status } = req.body || {};

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        message: 'title은 필수이며 비어있을 수 없습니다',
        code: 'TITLE_REQUIRED',
      });
    }

    if (title.length > 100) {
      return res.status(422).json({
        message: 'title은 100자를 초과할 수 없습니다',
        code: 'TITLE_TOO_LONG',
      });
    }

    if (description && description.length > 500) {
      return res.status(422).json({
        message: 'description은 500자를 초과할 수 없습니다',
        code: 'DESCRIPTION_TOO_LONG',
      });
    }

    if (status && !['active', 'inactive', 'archived'].includes(status)) {
      return res.status(422).json({
        message: 'status는 active, inactive, archived 중 하나여야 합니다',
        code: 'INVALID_STATUS',
      });
    }

    // 생성
    const newItem = {
      id: nextId++,
      title: title.trim(),
      description: description?.trim() || '',
      status: status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    items.push(newItem);

    // 201 Created with Location header
    res.setHeader('Location', `/api/practice?id=${newItem.id}`);
    return res.status(201).json(newItem);
  }

  // ============================================
  // PUT - 전체 수정 (Replace)
  // ============================================
  if (req.method === 'PUT') {
    if (!id) {
      return res.status(400).json({
        message: 'id 파라미터가 필요합니다',
        code: 'ID_REQUIRED',
      });
    }

    const itemId = Number(id);
    const index = items.findIndex(i => i.id === itemId);

    if (index === -1) {
      return res.status(404).json({
        message: '아이템을 찾을 수 없습니다',
        code: 'ITEM_NOT_FOUND',
      });
    }

    const { title, description, status } = req.body || {};

    // PUT은 전체 교체이므로 모든 필드 필요
    if (!title) {
      return res.status(400).json({
        message: 'title은 필수입니다 (PUT은 전체 교체)',
        code: 'TITLE_REQUIRED',
      });
    }

    // Validation
    if (title.length > 100) {
      return res.status(422).json({
        message: 'title은 100자를 초과할 수 없습니다',
        code: 'TITLE_TOO_LONG',
      });
    }

    if (description && description.length > 500) {
      return res.status(422).json({
        message: 'description은 500자를 초과할 수 없습니다',
        code: 'DESCRIPTION_TOO_LONG',
      });
    }

    if (status && !['active', 'inactive', 'archived'].includes(status)) {
      return res.status(422).json({
        message: 'status는 active, inactive, archived 중 하나여야 합니다',
        code: 'INVALID_STATUS',
      });
    }

    // 전체 교체
    const updatedItem = {
      id: itemId,
      title: title.trim(),
      description: description?.trim() || '',
      status: status || 'active',
      createdAt: items[index].createdAt, // 생성일은 유지
      updatedAt: new Date().toISOString(),
    };

    items[index] = updatedItem;
    return res.status(200).json(updatedItem);
  }

  // ============================================
  // PATCH - 부분 수정 (Update)
  // ============================================
  if (req.method === 'PATCH') {
    if (!id) {
      return res.status(400).json({
        message: 'id 파라미터가 필요합니다',
        code: 'ID_REQUIRED',
      });
    }

    const itemId = Number(id);
    const index = items.findIndex(i => i.id === itemId);

    if (index === -1) {
      return res.status(404).json({
        message: '아이템을 찾을 수 없습니다',
        code: 'ITEM_NOT_FOUND',
      });
    }

    const { title, description, status } = req.body || {};

    // PATCH는 부분 수정이므로 제공된 필드만 업데이트
    const currentItem = items[index];
    const updates = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          message: 'title은 비어있을 수 없습니다',
          code: 'TITLE_EMPTY',
        });
      }
      if (title.length > 100) {
        return res.status(422).json({
          message: 'title은 100자를 초과할 수 없습니다',
          code: 'TITLE_TOO_LONG',
        });
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (description.length > 500) {
        return res.status(422).json({
          message: 'description은 500자를 초과할 수 없습니다',
          code: 'DESCRIPTION_TOO_LONG',
        });
      }
      updates.description = description.trim();
    }

    if (status !== undefined) {
      if (!['active', 'inactive', 'archived'].includes(status)) {
        return res.status(422).json({
          message: 'status는 active, inactive, archived 중 하나여야 합니다',
          code: 'INVALID_STATUS',
        });
      }
      updates.status = status;
    }

    // 업데이트
    items[index] = {
      ...currentItem,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return res.status(200).json(items[index]);
  }

  // ============================================
  // DELETE - 삭제
  // ============================================
  if (req.method === 'DELETE') {
    if (!id) {
      return res.status(400).json({
        message: 'id 파라미터가 필요합니다',
        code: 'ID_REQUIRED',
      });
    }

    const itemId = Number(id);
    const index = items.findIndex(i => i.id === itemId);

    if (index === -1) {
      return res.status(404).json({
        message: '아이템을 찾을 수 없습니다',
        code: 'ITEM_NOT_FOUND',
      });
    }

    // 삭제
    items.splice(index, 1);

    // 204 No Content (body 없음)
    return res.status(204).end();
  }

  // ============================================
  // 지원하지 않는 메서드
  // ============================================
  return res.status(405).json({
    message: '지원하지 않는 HTTP 메서드입니다',
    code: 'METHOD_NOT_ALLOWED',
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });
}
