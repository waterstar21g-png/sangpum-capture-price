import { isAndroidDevice } from '@/lib/kiwi-browser';

export const COUPANG_APP_PACKAGE = 'com.coupang.mobile';

export function coupangWebSearchUrl(query: string): string {
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`;
}

/** 쿠팡 앱 검색 딥링크 (클리앙 검증: coupang://search?q=) */
export function coupangAppSearchUrl(query: string): string {
  return `coupang://search?q=${encodeURIComponent(query)}`;
}

/** Android Intent — 쿠팡 앱 검색 (미설치 시 웹 검색 fallback) */
export function buildCoupangIntentUrl(query: string): string {
  const q = encodeURIComponent(query);
  const webFallback = encodeURIComponent(coupangWebSearchUrl(query));
  return (
    `intent://search?q=${q}#Intent;` +
    `scheme=coupang;` +
    `package=${COUPANG_APP_PACKAGE};` +
    `action=android.intent.action.VIEW;` +
    `S.browser_fallback_url=${webFallback};` +
    `end`
  );
}

function launchIntent(intentUrl: string): void {
  const a = document.createElement('a');
  a.href = intentUrl;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export interface OpenCoupangResult {
  mode: 'app' | 'web';
  message: string;
}

/** 쿠팡 앱 검색 열기 (Android → 앱, iOS → coupang://, PC → 웹) */
export function openCoupangSearch(query: string): OpenCoupangResult {
  const text = query.trim();
  if (!text) {
    return { mode: 'web', message: '검색어가 없습니다.' };
  }

  const webUrl = coupangWebSearchUrl(text);

  if (isAndroidDevice()) {
    launchIntent(buildCoupangIntentUrl(text));
    return { mode: 'app', message: '쿠팡 앱에서 검색을 열었습니다.' };
  }

  const isIos =
    typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIos) {
    window.location.href = coupangAppSearchUrl(text);
    window.setTimeout(() => {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }, 800);
    return { mode: 'app', message: '쿠팡 앱으로 연결합니다.' };
  }

  window.open(webUrl, '_blank', 'noopener,noreferrer');
  return { mode: 'web', message: '쿠팡 웹에서 검색을 열었습니다.' };
}
