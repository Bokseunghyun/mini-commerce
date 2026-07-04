/**
 * api/status-codes.js - HTTP 상태 코드 연습용 API
 *
 * GET /api/status-codes?code=200 - 특정 상태 코드 반환
 *
 * QA 검증 포인트:
 * - 다양한 HTTP 상태 코드
 * - 2xx (성공), 3xx (리다이렉트), 4xx (클라이언트 오류), 5xx (서버 오류)
 * - Rate Limiting (429)
 * - Retry-After 헤더
 * - Location 헤더 (리다이렉트)
 */

import { applyCors } from './_lib/common.js';

// Rate limiting 응답(429) 헤더에 사용하는 상수
const RATE_LIMIT = 10; // 10회
const RATE_WINDOW = 60000; // 1분

export default async function statusCodesHandler(req, res) {
  // CORS 처리
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({
      message: 'GET 메서드만 허용됩니다',
      code: 'METHOD_NOT_ALLOWED',
      allowedMethods: ['GET']
    });
  }

  const { code, message, delay } = req.query;

  // 지연 시뮬레이션 (타임아웃 테스트용)
  if (delay) {
    const ms = Number(delay);
    if (!isNaN(ms) && ms > 0 && ms <= 10000) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // 상태 코드 검증
  if (!code) {
    return res.status(400).json({
      message: 'status code 파라미터가 필요합니다',
      code: 'CODE_REQUIRED',
      example: '/api/status-codes?code=200'
    });
  }

  const statusCode = Number(code);
  if (isNaN(statusCode) || statusCode < 100 || statusCode > 599) {
    return res.status(400).json({
      message: '유효하지 않은 상태 코드입니다 (100-599)',
      code: 'INVALID_STATUS_CODE'
    });
  }

  const customMessage = message || getDefaultMessage(statusCode);

  // 특별한 헤더가 필요한 케이스들
  switch (statusCode) {
    // 리다이렉트 계열: 301 Moved Permanently / 302 Found / 307 Temporary Redirect / 308 Permanent Redirect
    case 301:
    case 302:
    case 307:
    case 308:
      res.setHeader('Location', 'https://example.com/new-location');
      return res.status(statusCode).json({
        message: customMessage,
        redirectUrl: 'https://example.com/new-location'
      });

    // 304 Not Modified
    case 304:
      res.setHeader('ETag', '"33a64df551425fcc55e4d42a148795d9f25f89d4"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(304).end();

    // 401 Unauthorized
    case 401:
      res.setHeader('WWW-Authenticate', 'Bearer realm="API"');
      return res.status(401).json({
        message: customMessage,
        code: 'UNAUTHORIZED',
        authScheme: 'Bearer'
      });

    // 429 Too Many Requests (Rate Limiting)
    // case 블록 내 lexical 선언(no-case-declarations)을 피하기 위해 중괄호로 감싼다
    case 429: {
      const retryAfter = 60; // 60초 후 재시도
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + RATE_WINDOW).toISOString());
      return res.status(429).json({
        message: customMessage,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: retryAfter,
        limit: RATE_LIMIT,
        window: RATE_WINDOW / 1000
      });
    }

    // 503 Service Unavailable
    case 503:
      res.setHeader('Retry-After', '120');
      return res.status(503).json({
        message: customMessage,
        code: 'SERVICE_UNAVAILABLE',
        retryAfter: 120
      });

    // 기타 모든 상태 코드
    default:
      return res.status(statusCode).json({
        message: customMessage,
        statusCode: statusCode,
        category: getStatusCategory(statusCode)
      });
  }
}

function getDefaultMessage(code) {
  const messages = {
    // 2xx Success
    200: 'OK - 요청이 성공했습니다',
    201: 'Created - 리소스가 생성되었습니다',
    202: 'Accepted - 요청이 접수되었습니다',
    204: 'No Content - 응답 본문이 없습니다',

    // 3xx Redirection
    301: 'Moved Permanently - 리소스가 영구적으로 이동했습니다',
    302: 'Found - 리소스가 임시로 이동했습니다',
    304: 'Not Modified - 캐시된 버전을 사용하세요',
    307: 'Temporary Redirect - 임시 리다이렉트',
    308: 'Permanent Redirect - 영구 리다이렉트',

    // 4xx Client Error
    400: 'Bad Request - 잘못된 요청입니다',
    401: 'Unauthorized - 인증이 필요합니다',
    403: 'Forbidden - 권한이 없습니다',
    404: 'Not Found - 리소스를 찾을 수 없습니다',
    405: 'Method Not Allowed - 허용되지 않은 메서드입니다',
    408: 'Request Timeout - 요청 시간이 초과되었습니다',
    409: 'Conflict - 리소스 충돌이 발생했습니다',
    410: 'Gone - 리소스가 영구적으로 삭제되었습니다',
    413: 'Payload Too Large - 요청 본문이 너무 큽니다',
    415: 'Unsupported Media Type - 지원하지 않는 미디어 타입입니다',
    422: 'Unprocessable Entity - 처리할 수 없는 엔티티입니다',
    429: 'Too Many Requests - 너무 많은 요청입니다',

    // 5xx Server Error
    500: 'Internal Server Error - 서버 내부 오류입니다',
    501: 'Not Implemented - 구현되지 않았습니다',
    502: 'Bad Gateway - 잘못된 게이트웨이입니다',
    503: 'Service Unavailable - 서비스를 사용할 수 없습니다',
    504: 'Gateway Timeout - 게이트웨이 시간 초과',
  };

  return messages[code] || `Status Code ${code}`;
}

function getStatusCategory(code) {
  if (code >= 100 && code < 200) return 'Informational';
  if (code >= 200 && code < 300) return 'Success';
  if (code >= 300 && code < 400) return 'Redirection';
  if (code >= 400 && code < 500) return 'Client Error';
  if (code >= 500 && code < 600) return 'Server Error';
  return 'Unknown';
}
