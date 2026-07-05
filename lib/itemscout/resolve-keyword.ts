/** 아이템스카우트 검색 입력 maxLength 와 동일 */
export const ITEMSCOUT_KEYWORD_MAX_LEN = 30;

export function clipItemscoutKeyword(text: string): string {
  return text.replace(/[\u200B\uFFFC]/g, '').trim().slice(0, ITEMSCOUT_KEYWORD_MAX_LEN);
}

export function itemscoutKeywordPageUrl(keywordId: number): string {
  return `https://itemscout.io/keyword/${keywordId}`;
}

/**
 * 상품명/키워드 → 아이템스카우트 keywordId
 * (브라우저·서버 모두에서 호출 가능, 인증 불필요)
 */
export async function resolveItemscoutKeywordId(keyword: string): Promise<number | null> {
  const q = clipItemscoutKeyword(keyword);
  if (!q) return null;

  const res = await fetch('https://api.itemscout.io/api/keyword', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: 'https://itemscout.io',
      Referer: 'https://itemscout.io/',
    },
    body: JSON.stringify({ keyword: q }),
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const json = (await res.json()) as { status?: string; data?: unknown };
  if (json.status !== 'success') return null;

  const id = Number(json.data);
  return Number.isFinite(id) && id > 0 ? id : null;
}
