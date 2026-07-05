/** Kiwi Browser (Android) + 아이템스카우트 확장 프로그램 */

export const KIWI_BROWSER_PACKAGE = 'com.kiwibrowser.browser';
/** GitHub 빌드 Kiwi (Play Store 버전과 별도 설치 가능) */
export const KIWI_BROWSER_PACKAGE_DEV = 'com.kiwibrowser.browser.dev';

export const ITEMSCOUT_EXTENSION_ID = 'ecmeogcbcoalojmkfkmancobmiahaigg';
export const ITEMSCOUT_EXTENSION_NAME = '아이템스카우트';

export const ITEMSCOUT_EXTENSION_URL = `https://chromewebstore.google.com/detail/${ITEMSCOUT_EXTENSION_ID}`;

/** Kiwi 확장 관리 — Kiwi 앱 안에서 주소창에 입력 */
export const KIWI_EXTENSIONS_URL = 'kiwi://extensions';

/** Play Store 등록 종료(2025) — 공식 GitHub 릴리스만 사용 */
export const KIWI_GITHUB_RELEASE_URL =
  'https://github.com/kiwibrowser/src.next/releases/tag/14310011181';

export const KIWI_APK_ARM64_URL =
  'https://github.com/kiwibrowser/src.next/releases/download/14310011181/com.kiwibrowser.browser-arm64-14310011181-github.apk';

/** @deprecated Play Store에서 Kiwi 제거됨 */
export const KIWI_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.kiwibrowser.browser';

const EXT_OK_KEY = 'sangpum-capture:kiwi-itemscout-ext-ok';

export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function kiwiSetupPageUrl(step: 'install' | 'extension' = 'install'): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/kiwi-setup?step=${step}`;
  }
  return `/kiwi-setup?step=${step}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Android Intent — package 없음 → Chrome·Kiwi 등 앱 선택
 */
export function buildBrowserChooserIntent(targetUrl: string): string {
  const httpsFallback = encodeURIComponent(targetUrl);
  let host = '';
  let path = '';
  try {
    const u = new URL(targetUrl);
    host = u.host;
    path = `${u.pathname}${u.search}`;
  } catch {
    const stripped = targetUrl.replace(/^https?:\/\//, '');
    const slash = stripped.indexOf('/');
    host = slash >= 0 ? stripped.slice(0, slash) : stripped;
    path = slash >= 0 ? stripped.slice(slash) : '/';
  }
  const intentPath = `${host}${path.startsWith('/') ? path : `/${path}`}`;

  return (
    `intent://${intentPath}#Intent;` +
    `scheme=https;` +
    `action=android.intent.action.VIEW;` +
    `category=android.intent.category.BROWSABLE;` +
    `S.browser_fallback_url=${httpsFallback};` +
    `end`
  );
}

/**
 * Android Intent — Kiwi 지정 (package 고정)
 */
export function buildKiwiIntentUrl(
  targetUrl: string,
  kiwiPackage = KIWI_BROWSER_PACKAGE,
  fallbackHttps?: string,
): string {
  const httpsFallback = encodeURIComponent(fallbackHttps ?? targetUrl);
  let host = '';
  let path = '';
  try {
    const u = new URL(targetUrl);
    host = u.host;
    path = `${u.pathname}${u.search}`;
  } catch {
    const stripped = targetUrl.replace(/^https?:\/\//, '');
    const slash = stripped.indexOf('/');
    host = slash >= 0 ? stripped.slice(0, slash) : stripped;
    path = slash >= 0 ? stripped.slice(slash) : '/';
  }
  const intentPath = `${host}${path.startsWith('/') ? path : `/${path}`}`;

  return (
    `intent://${intentPath}#Intent;` +
    `scheme=https;` +
    `package=${kiwiPackage};` +
    `action=android.intent.action.VIEW;` +
    `category=android.intent.category.BROWSABLE;` +
    `S.browser_fallback_url=${httpsFallback};` +
    `end`
  );
}

export function isItemscoutExtensionMarkedInstalled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(EXT_OK_KEY) === '1';
  } catch {
    return false;
  }
}

export function markItemscoutExtensionInstalled(): void {
  try {
    localStorage.setItem(EXT_OK_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearItemscoutExtensionInstalled(): void {
  try {
    localStorage.removeItem(EXT_OK_KEY);
  } catch {
    /* ignore */
  }
}

function openHttps(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function launchKiwiIntent(intentUrl: string): void {
  const a = document.createElement('a');
  a.href = intentUrl;
  a.rel = 'noopener noreferrer';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export interface OpenInKiwiResult {
  mode: 'kiwi' | 'browser';
  openedExtensionSetup: boolean;
  /** 클립보드에 복사된 URL */
  copiedUrl?: string;
  copied: boolean;
  message: string;
}

/**
 * Android: Chrome·Kiwi 선택창 → itemscout 열기
 * PC: 새 탭
 */
export async function openInKiwiBrowser(pageUrl: string): Promise<OpenInKiwiResult> {
  if (!pageUrl.startsWith('http')) {
    return {
      mode: 'browser',
      openedExtensionSetup: false,
      copied: false,
      message: '열 수 있는 URL이 없습니다.',
    };
  }

  if (!isAndroidDevice()) {
    openHttps(pageUrl);
    return {
      mode: 'browser',
      openedExtensionSetup: false,
      copied: false,
      message: 'PC 브라우저에서 열었습니다.',
    };
  }

  const copied = await copyToClipboard(pageUrl);
  launchKiwiIntent(buildBrowserChooserIntent(pageUrl));

  return {
    mode: 'kiwi',
    openedExtensionSetup: false,
    copiedUrl: pageUrl,
    copied,
    message: copied
      ? 'Chrome 또는 Kiwi를 선택하세요. (추세·확장은 Kiwi 권장, 링크 복사됨)'
      : 'Chrome 또는 Kiwi를 선택하세요.',
  };
}

/** Kiwi Browser 설치 — GitHub APK */
export function openKiwiInstallPage(): OpenInKiwiResult {
  openHttps(KIWI_GITHUB_RELEASE_URL);
  return {
    mode: 'browser',
    openedExtensionSetup: false,
    copied: false,
    message:
      'Play 스토어에서 Kiwi가 내려갔습니다. GitHub에서 arm64 APK를 받아 설치하세요. ' +
      '「알 수 없는 앱」 설치 허용이 필요할 수 있습니다.',
  };
}

/** arm64 APK 직접 다운로드 */
export function openKiwiApkDownload(): OpenInKiwiResult {
  openHttps(KIWI_APK_ARM64_URL);
  return {
    mode: 'browser',
    openedExtensionSetup: false,
    copied: false,
    message: 'Kiwi APK 다운로드가 시작됩니다. 받은 파일을 열어 설치하세요.',
  };
}

/** @deprecated openKiwiInstallPage 사용 */
export function openKiwiPlayStore(): void {
  openKiwiInstallPage();
}

/** 확장 설치 안내 (Intent 사용 안 함 — Kiwi 홈만 열리는 문제 회피) */
export function openItemscoutExtensionGuide(): OpenInKiwiResult {
  if (!isAndroidDevice()) {
    return {
      mode: 'browser',
      openedExtensionSetup: false,
      copied: false,
      message: '아이템스카우트 확장은 Android 휴대폰(Kiwi Browser)에서만 설치하면 됩니다.',
    };
  }

  openHttps(kiwiSetupPageUrl('extension'));

  return {
    mode: 'browser',
    openedExtensionSetup: true,
    copied: false,
    message:
      `Kiwi Browser 실행 → ⋮ → Extensions → + (스토어) → ` +
      `「${ITEMSCOUT_EXTENSION_NAME}」검색 → 「Chrome에 추가」`,
  };
}

/** @deprecated openItemscoutExtensionGuide */
export function openKiwiExtensionsPage(): OpenInKiwiResult {
  return openItemscoutExtensionGuide();
}

export function openItemscoutExtensionInKiwi(): OpenInKiwiResult {
  return openItemscoutExtensionGuide();
}

export function reinstallItemscoutExtensionInKiwi(): OpenInKiwiResult {
  clearItemscoutExtensionInstalled();
  return openItemscoutExtensionGuide();
}

/** kiwi://extensions — Kiwi 주소창에 직접 입력용 */
export async function copyKiwiExtensionsAddress(): Promise<OpenInKiwiResult> {
  const copied = await copyToClipboard(KIWI_EXTENSIONS_URL);
  return {
    mode: 'kiwi',
    openedExtensionSetup: true,
    copied,
    copiedUrl: KIWI_EXTENSIONS_URL,
    message: copied
      ? `「${KIWI_EXTENSIONS_URL}」복사됨. Kiwi 주소창에 붙여넣기 → Extensions 화면 → + (스토어).`
      : `Kiwi 주소창에 ${KIWI_EXTENSIONS_URL} 입력 → Extensions → + (스토어).`,
  };
}
