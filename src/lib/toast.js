// ============================================
// 전역 토스트 스토어 (훅 없이 어디서든 toast.success/error/info 호출)
// - alert() 대체용. 논블로킹 알림 + 자동 소멸.
// - ToastHost 가 subscribeToasts 로 구독해 렌더한다.
// ============================================
let listeners = [];
let items = [];
let counter = 0;

function emit() {
  for (const l of listeners) l(items);
}

function push(type, message, duration = 3000) {
  counter += 1;
  const id = counter;
  items = [...items, { id, type, message: String(message ?? "") }];
  emit();
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration);
  }
  return id;
}

export function dismiss(id) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener) {
  listeners.push(listener);
  listener(items); // 최초 상태 즉시 전달
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export const toast = {
  success: (message, duration) => push("success", message, duration),
  error: (message, duration) => push("error", message, duration),
  info: (message, duration) => push("info", message, duration),
};
