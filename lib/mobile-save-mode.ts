const STORAGE_KEY = 'sangpum-capture:mobile-save';

/** 터치·좁은 화면 = 모바일 */
export function isMobileClient(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(max-width: 768px)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

/** 모바일 절약 — 입력 중 자동검색·AI인식 최소화 (모바일 기본 ON) */
export function loadMobileSaveMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
    return isMobileClient();
  } catch {
    return isMobileClient();
  }
}

export function saveMobileSaveMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}
