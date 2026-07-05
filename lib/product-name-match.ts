/** 가격비교용 상품명 정규화·동일상품 판별 */

export function normalizeProductText(s: string): string {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

/** 의미 있는 토큰 (숫자·단위·1글자 제외에 가깝게) */
export function productNameTokens(name: string): string[] {
  const parts = name
    .replace(/<[^>]+>/g, ' ')
    .split(/[\s,/|·\-–—_()[\]【】「」『』{}＋+]+/)
    .map(p => normalizeProductText(p))
    .filter(tok => tok.length >= 2);

  // 중복 제거, 긴 토큰 우선
  return [...new Set(parts)].sort((a, b) => b.length - a.length);
}

/**
 * 네이버 상품 타이틀이 비교 대상 상품명과 동일한지 판별.
 * - 정규화한 상품명 전체가 타이틀에 포함되거나
 * - 상품명의 모든 핵심 토큰이 타이틀에 포함되어야 함
 */
export function isSameProductTitle(
  listingTitle: string,
  productName: string,
  keyword?: string,
): boolean {
  const title = normalizeProductText(listingTitle);
  if (!title) return false;

  const primary = (productName || keyword || '').trim();
  if (!primary) return false;

  const primaryNorm = normalizeProductText(primary);
  if (primaryNorm.length >= 2 && title.includes(primaryNorm)) {
    return true;
  }

  const tokens = productNameTokens(primary);
  if (tokens.length === 0) return false;

  // 모든 토큰 일치 (동일 상품명)
  if (tokens.every(tok => title.includes(tok))) {
    return true;
  }

  // keyword 가 productName 과 다를 때만 보조: keyword 전체 포함 + productName 토큰 과반
  if (keyword) {
    const kwNorm = normalizeProductText(keyword);
    if (kwNorm.length >= 2 && title.includes(kwNorm)) {
      const hit = tokens.filter(tok => title.includes(tok)).length;
      if (hit >= Math.ceil(tokens.length * 0.8)) return true;
    }
  }

  return false;
}
