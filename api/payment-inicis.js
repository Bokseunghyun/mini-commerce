/**
 * api/payment-inicis.js - KG이니시스 표준결제(INIStdPay) 실결제 샌드박스
 *
 * 흐름:
 *  1) POST /api/payment-inicis?step=prepare (auth)
 *     → oid/timestamp/price/서명 생성해 프론트에 반환. 프론트는 이 값으로 INIStdPay 결제창을 연다.
 *  2) 사용자가 이니시스 결제창에서 테스트 카드로 결제 → 이니시스가 returnUrl 로 POST(form-urlencoded)
 *     POST /api/payment-inicis
 *     → resultCode 0000 이면 authUrl 로 서버-서버 승인요청 → 성공 시 결제내역 저장(payments)
 *     → 결과를 opener(체크아웃) 로 postMessage 하는 HTML 반환 후 팝업 닫힘
 *  3) GET /api/payment-inicis?close=1 → 사용자가 창을 닫았을 때의 안내 페이지
 *
 * 승인된 결제는 paymentKey(PAY-INICIS-...) 로 저장되어, 기존 주문 흐름
 * (POST /api/user-actions {action:'order', paymentKey}) 과 동일하게 연결된다.
 */
import crypto from 'node:crypto';
import { applyCors, requireUser } from './_lib/common.js';
import { isConfigured, respondDbNotConfigured } from './_lib/db.js';
import { createPayment } from './_lib/store.js';
import {
  INICIS_MID,
  INICIS_SDK_URL,
  buildRequestSign,
  buildApprovalSign,
  makeOid,
  absoluteUrl,
} from './_lib/inicis-utils.js';

function htmlRelay(payload) {
  // 팝업(opener 존재) → 결과 postMessage 후 닫기
  // 리다이렉트(전체 페이지) → 앱 완료 페이지(/payment-inicis-complete)로 이동해 주문 생성
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  const q =
    payload.success && payload.paymentKey
      ? `status=success&paymentKey=${encodeURIComponent(payload.paymentKey)}`
      : `status=${payload.canceled ? 'canceled' : 'fail'}`;
  const completeUrl = `/payment-inicis-complete?${q}`;
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>결제 처리</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;color:#374151">
<p>${payload.success ? '결제가 완료되었습니다. 잠시만 기다려주세요...' : '결제가 취소/실패되었습니다. 이동 중...'}</p>
<script>
  (function(){
    var result = ${json};
    var opener = null;
    try { if (window.opener && window.opener !== window && !window.opener.closed) opener = window.opener; } catch(e){}
    if (opener) {
      // 팝업 방식: 원래 체크아웃 창에 결과 전달 후 닫기
      try { opener.postMessage(Object.assign({source:'inicis'}, result), '*'); } catch(e){}
      setTimeout(function(){ try { window.close(); } catch(e){} }, 300);
    } else {
      // 리다이렉트 방식: 앱 완료 페이지로 이동 (거기서 보존된 컨텍스트로 주문 생성)
      location.replace(${JSON.stringify(completeUrl)});
    }
  })();
</script>
</body></html>`;
}

function sendHtml(res, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send ? res.status(200).send(html) : res.status(200).end(html);
}

export default async function inicisHandler(req, res) {
  if (applyCors(req, res)) return;

  const query = req.query || {};

  // 창 닫힘 안내 (팝업이면 취소 메시지 후 닫기, 리다이렉트면 체크아웃으로 복귀)
  if (req.method === 'GET' && (query.close === '1' || query.close === 'true')) {
    return sendHtml(
      res,
      `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>결제 취소</title></head>
<body style="font-family:sans-serif;text-align:center;padding:40px;color:#374151">
<p>결제를 취소했습니다. 이동 중...</p>
<script>(function(){var opener=null;try{if(window.opener&&window.opener!==window&&!window.opener.closed)opener=window.opener;}catch(e){}if(opener){try{opener.postMessage({source:'inicis',success:false,canceled:true},'*');}catch(e){}setTimeout(function(){try{window.close();}catch(e){}},300);}else{location.replace('/payment-inicis-complete?status=canceled');}})();</script>
</body></html>`
    );
  }

  // 가상계좌 입금통보(noti) 수신 — INIpayTest 테스트 상점은 실제 입금이 없어
  // 호출되지 않지만, Vbank 규격상 notiUrl 이 요구되므로 200 OK 로만 응답한다.
  if (query.noti === '1' || query.noti === 'true') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send ? res.status(200).send('OK') : res.status(200).end('OK');
  }

  if (!isConfigured()) return respondDbNotConfigured(res);

  // 1) 결제 준비: 서명 파라미터 발급
  if (req.method === 'POST' && query.step === 'prepare') {
    const user = requireUser(req, res);
    if (!user) return;

    const { amount, orderName } = req.body || {};
    const price = Math.trunc(Number(amount));
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: '결제 금액이 올바르지 않습니다', code: 'INVALID_AMOUNT' });
    }

    const timestamp = String(Date.now());
    const oid = makeOid(`${timestamp}_${crypto.randomBytes(4).toString('hex')}`);
    const sign = buildRequestSign({ oid, price, timestamp });

    return res.status(200).json({
      sdkUrl: INICIS_SDK_URL,
      params: {
        mid: INICIS_MID,
        oid,
        price,
        timestamp,
        signature: sign.signature,
        verification: sign.verification,
        mKey: sign.mKey,
        goodname: String(orderName || '주문상품').slice(0, 40),
        buyername: user.username,
        returnUrl: absoluteUrl(req, '/api/payment-inicis'),
        closeUrl: absoluteUrl(req, '/api/payment-inicis?close=1'),
        notiUrl: absoluteUrl(req, '/api/payment-inicis?noti=1'),
      },
    });
  }

  // 2) 이니시스 인증결과 수신(returnUrl) → 승인요청 → 결제내역 저장 → 팝업 relay
  if (req.method === 'POST') {
    const body = req.body || {};
    const resultCode = body.resultCode || body.P_STATUS;
    const authToken = body.authToken;
    const authUrl = body.authUrl;
    const oid = body.orderNumber || body.oid || '';

    // 인증 실패
    if (resultCode !== '0000' || !authToken || !authUrl) {
      return sendHtml(
        res,
        htmlRelay({ success: false, message: body.resultMsg || '결제 인증 실패', code: 'INICIS_AUTH_FAILED' })
      );
    }

    // authUrl 은 반드시 이니시스 도메인이어야 함 (SSRF 방지)
    if (!/^https:\/\/[a-z0-9.-]*inicis\.com\//i.test(authUrl)) {
      return sendHtml(res, htmlRelay({ success: false, message: '유효하지 않은 승인 URL', code: 'INVALID_AUTH_URL' }));
    }

    try {
      const timestamp = String(Date.now());
      const sign = buildApprovalSign({ authToken, timestamp });
      const form = new URLSearchParams({
        mid: INICIS_MID,
        authToken,
        timestamp,
        signature: sign.signature,
        verification: sign.verification,
        charset: 'UTF-8',
        format: 'JSON',
      });

      const approvalRes = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body: form.toString(),
      });
      const approval = await approvalRes.json().catch(() => ({}));

      if (approval.resultCode !== '0000') {
        return sendHtml(
          res,
          htmlRelay({ success: false, message: approval.resultMsg || '결제 승인 실패', code: 'INICIS_APPROVAL_FAILED' })
        );
      }

      const tid = approval.tid || `INICIS-${Date.now()}`;
      const amount = Math.trunc(Number(approval.TotPrice || approval.price || 0));
      const paymentKey = `PAY-INICIS-${tid}`;

      // 결제수단 구분: 가상계좌(무통장입금) vs 신용카드.
      // 테스트 가상계좌는 '계좌 발급 = 완료(입금대기)'로 보고 status DONE 으로 저장한다
      // (실제 입금 통보가 없으므로 데모에선 발급 시점을 결제완료로 취급).
      const payMethod = String(approval.payMethod || approval.PayMethod || '').toUpperCase();
      const isVbank = payMethod.includes('VBANK') || payMethod.includes('VACT') || !!approval.VACT_Num;

      await createPayment({
        id: paymentKey,
        orderId: null,
        username: approval.buyerName || body.buyername || '',
        method: isVbank ? 'INICIS-VBANK' : 'INICIS',
        cardLast4: '',
        amount,
        status: 'DONE',
        fault: null,
      });

      return sendHtml(res, htmlRelay({ success: true, paymentKey, amount, oid, tid }));
    } catch (e) {
      console.error('Inicis approval error:', e);
      return sendHtml(res, htmlRelay({ success: false, message: '결제 승인 처리 중 오류', code: 'INICIS_ERROR' }));
    }
  }

  return res.status(405).json({ message: '허용되지 않은 메서드', code: 'METHOD_NOT_ALLOWED' });
}
