import { isAndroidDevice } from '@/lib/kiwi-browser';

/** 네이버플러스 스토어(네이버쇼핑) 앱 */
export const NAVER_SHOPPING_APP_PACKAGE = 'com.navercorp.navershopping';

/** 네이버 메인 앱 (쇼핑 URL 인앱 브라우저 fallback) */
export const NAVER_APP_PACKAGE = 'com.nhn.android.search';

export function naverShoppingWebSearchUrl(query: string): string {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;
}

function launchIntent(intentUrl: string): void {
  const a = document.createElement('a');
  a.href = intentUrl;
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function openHttps(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Android Intent — 네이버쇼핑 앱 + HTTPS 검색 URL */
export function buildNaverShoppingAppIntentUrl(query: string): string {
  const webUrl = naverShoppingWebSearchUrl(query);
  const webFallback = encodeURIComponent(webUrl);
  const q = encodeURIComponent(query);
  const intentPath = `search.shopping.naver.com/search/all?query=${q}`;

  return (
    `intent://${intentPath}#Intent;` +
    `scheme=https;` +
    `package=${NAVER_SHOPPING_APP_PACKAGE};` +
    `action=android.intent.action.VIEW;` +
    `category=android.intent.category.BROWSABLE;` +
    `S.browser_fallback_url=${webFallback};` +
    `end`
  );
}

/** Android Intent — 네이버 앱 인앱 브라우저로 쇼핑 검색 (쇼핑앱 미설치 시) */
export function buildNaverAppShoppingIntentUrl(query: string): string {
  const webUrl = naverShoppingWebSearchUrl(query);
  const webFallback = encodeURIComponent(webUrl);
  const inappUrl = encodeURIComponent(webUrl);
  const intentPath = `inappbrowser?url=${inappUrl}&target=new&version=6`;

  return (
    `intent://${intentPath}#Intent;` +
    `scheme=naversearchapp;` +
    `package=${NAVER_APP_PACKAGE};` +
    `action=android.intent.action.VIEW;` +
    `category=android.intent.category.BROWSABLE;` +
    `S.browser_fallback_url=${webFallback};` +
    `end`
  );
}

export interface OpenNaverShoppingResult {
  mode: 'app' | 'web';
  message: string;
}

/** 네이버쇼핑 앱 검색 열기 (Android → 앱, iOS/PC → 웹) */
export function openNaverShoppingSearch(query: string): OpenNaverShoppingResult {
  const text = query.trim();
  if (!text) {
    return { mode: 'web', message: '검색어가 없습니다.' };
  }

  const webUrl = naverShoppingWebSearchUrl(text);

  if (isAndroidDevice()) {
    launchIntent(buildNaverShoppingAppIntentUrl(text));
    return { mode: 'app', message: '네이버쇼핑 앱에서 검색을 열었습니다.' };
  }

  const isIos =
    typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIos) {
    window.location.href = webUrl;
    return { mode: 'app', message: '네이버쇼핑으로 연결합니다.' };
  }

  openHttps(webUrl);
  return { mode: 'web', message: '네이버쇼핑 웹에서 검색을 열었습니다.' };
}
