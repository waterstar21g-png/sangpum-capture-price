/** Kiwi Intent → 우리 앱 경유 → itemscout 자동 리다이렉트 */

export function isAllowedKiwiGoTarget(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'itemscout.io';
  } catch {
    return false;
  }
}

export function buildKiwiGoUrl(targetUrl: string, origin?: string): string | null {
  if (!isAllowedKiwiGoTarget(targetUrl)) return null;
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) return null;
  return `${base}/kiwi-go?u=${encodeURIComponent(targetUrl)}`;
}
