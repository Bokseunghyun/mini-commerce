/**
 * api/_lib/upload-utils.js - 파일 업로드/이미지 검증 유틸 (공유)
 *
 * 실제 외부 스토리지(S3 등)는 없다. 자동화 연습용으로
 *  - data URL(base64) 형식/용량 검증
 *  - 리뷰 이미지의 경우 http(s) URL 도 허용
 * 만 수행한다. 검증 통과한 문자열을 그대로(에코) 저장/반환하는 모델.
 *
 * 검증 로직을 upload.js / user-actions.js(set_avatar) / reviews.js 에서
 * 공유하기 위해 여기로 모은다.
 */

// 허용 이미지 MIME 서브타입 (data URL 헤더 기준)
const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,([a-z0-9+/]+={0,2})$/i;

// 업로드/아바타 용량 상한 (2MB) — base64 디코딩된 실제 바이트 기준
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

/**
 * base64 문자열 길이로 디코딩 후 바이트 수를 계산한다 (실제 디코딩 없이).
 *  - base64 4문자 -> 3바이트. 끝의 '=' 패딩 수만큼 차감.
 */
export function base64ByteLength(base64) {
  const len = base64.length;
  if (len === 0) return 0;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor(len / 4) * 3 - padding;
}

/**
 * data URL 이미지 검증 (업로드/아바타 공용).
 * 반환:
 *   { ok: true, bytes }                      정상
 *   { ok: false, status, code, message }     검증 실패 (상태코드/코드/메시지 포함)
 *
 * status/code/message 규약:
 *   - data URL 형식 아님/미지원 MIME  -> 400 INVALID_FILE_TYPE
 *   - 디코딩 용량 > 2MB               -> 413 FILE_TOO_LARGE
 */
export function validateImageDataUrl(image) {
  if (typeof image !== 'string' || image.trim() === '') {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_FILE_TYPE',
      message: '이미지는 data URL 형식이어야 합니다 (data:image/...;base64,...)',
    };
  }

  const match = image.match(DATA_URL_RE);
  if (!match) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_FILE_TYPE',
      message:
        '지원하지 않는 파일 형식입니다 (data:image/png|jpeg|webp|gif;base64,... 만 허용)',
    };
  }

  const bytes = base64ByteLength(match[2]);
  if (bytes > MAX_FILE_BYTES) {
    return {
      ok: false,
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: '파일이 너무 큽니다 (최대 2MB)',
    };
  }

  return { ok: true, bytes };
}

/**
 * 리뷰 첨부 이미지 1건 검증.
 *  - data URL 이미지 (용량 상한 포함) 또는 http(s) URL 을 허용한다.
 *  - 외부 URL 은 실제 도달성 검사는 하지 않는다(연습용).
 * 반환: true(통과) | false(실패)
 */
export function isValidReviewImage(image) {
  if (typeof image !== 'string' || image.trim() === '') return false;

  const trimmed = image.trim();

  // http(s) URL 허용
  if (/^https?:\/\/[^\s]+$/i.test(trimmed)) return true;

  // data URL 은 형식 + 용량까지 검증
  const result = validateImageDataUrl(trimmed);
  return result.ok;
}

/**
 * 리뷰 images 배열 검증 (최대 3개, 각 항목은 isValidReviewImage 통과).
 * 반환:
 *   { ok: true, images }                     정상 (trim 적용된 배열)
 *   { ok: false, status, code, message }      검증 실패
 *
 * status/code 규약:
 *   - 배열 아님 / 개수 초과 / 무효 항목  -> 400 INVALID_REVIEW_IMAGE
 */
export function validateReviewImages(images) {
  if (images === undefined || images === null) {
    return { ok: true, images: [] };
  }

  if (!Array.isArray(images)) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_REVIEW_IMAGE',
      message: '리뷰 이미지는 배열이어야 합니다',
    };
  }

  if (images.length > 3) {
    return {
      ok: false,
      status: 400,
      code: 'INVALID_REVIEW_IMAGE',
      message: '리뷰 이미지는 최대 3개까지 첨부할 수 있습니다',
    };
  }

  const normalized = [];
  for (const img of images) {
    if (!isValidReviewImage(img)) {
      return {
        ok: false,
        status: 400,
        code: 'INVALID_REVIEW_IMAGE',
        message:
          '유효하지 않은 리뷰 이미지입니다 (data URL 이미지 또는 http(s) URL, 최대 2MB)',
      };
    }
    normalized.push(String(img).trim());
  }

  return { ok: true, images: normalized };
}
