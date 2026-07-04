/**
 * api/upload.js - 파일 업로드 (모의) API
 *
 * POST /api/upload  (인증 필요)
 *   body: { kind: 'review' | 'avatar', image: <data URL 문자열> }
 *
 * 실제 외부 스토리지는 없다. 자동화 연습(파일 형식/용량 검증)을 위한
 * "에코-검증" 엔드포인트로, 검증을 통과한 data URL 을 그대로 돌려준다.
 * 호출자가 그 URL 을 리뷰/아바타에 저장하는 구조.
 *
 * 검증:
 *   - image 는 data URL 이미지여야 한다
 *     (data:image/png|jpeg|webp|gif;base64,...) → 아니면 400 INVALID_FILE_TYPE
 *   - 디코딩 용량 <= 2MB → 초과 시 413 FILE_TOO_LARGE
 *   - kind 는 'review' | 'avatar' → 아니면 400 INVALID_KIND
 *
 * QA 검증 포인트:
 *   - 인증 필요 (401 AUTH_NO_TOKEN / AUTH_INVALID_TOKEN)
 *   - 잘못된 파일 형식(이미지 아님) → 400 INVALID_FILE_TYPE
 *   - 용량 초과(> 2MB) → 413 FILE_TOO_LARGE
 *   - 정상 → 201 { url, kind }
 *   - GET/PATCH/DELETE 등 → 405
 */

import { applyCors, requireUser } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { validateImageDataUrl } from './_lib/upload-utils.js';

const AVAILABLE_KINDS = ['review', 'avatar'];

async function handlePost(req, res) {
  const body = req.body || {};
  const { kind, image } = body;

  // kind 검증
  if (!AVAILABLE_KINDS.includes(kind)) {
    return res.status(400).json({
      message: `지원하지 않는 kind: ${kind ?? '(없음)'}`,
      code: 'INVALID_KIND',
      availableKinds: AVAILABLE_KINDS,
    });
  }

  // 이미지 data URL 형식/용량 검증 (upload-utils 공유)
  const result = validateImageDataUrl(image);
  if (!result.ok) {
    return res.status(result.status).json({
      message: result.message,
      code: result.code,
    });
  }

  // 외부 스토리지가 없으므로 검증 통과한 data URL 을 그대로 반환(에코).
  return res.status(201).json({
    url: image,
    kind,
  });
}

export default async function uploadHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  // DB 미설정 시 503 (단일 코드 경로 — 인메모리 폴백 없음)
  if (!isConfigured()) return respondDbNotConfigured(res);

  // 인증 필수
  const user = requireUser(req, res);
  if (!user) return; // 401 이미 응답됨

  try {
    if (req.method === 'POST') {
      return await handlePost(req, res);
    }
    return res.status(405).json({
      message: '허용되지 않은 메서드',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['POST'],
    });
  } catch (error) {
    console.error('Upload API error:', error);
    return res.status(500).json({
      message: '서버 내부 오류',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
