export interface ShortcutQuery {
  /** 상품캡처로 인식된 상품명 */
  productName: string;
  /** 분석 키워드 */
  keyword: string;
}

export interface MarketShortcut {
  id: string;
  label: string;
  /** 아이콘 표시용 짧은 글자 */
  mark: string;
  /** 배경색 */
  color: string;
  buildUrl: (q: ShortcutQuery) => string;
}

/** 검색어: 상품명 우선, 없으면 키워드 */
export function shortcutSearchText(q: ShortcutQuery): string {
  return (q.productName || q.keyword || '').trim();
}

/**
 * 아이템스카우트 키워드 분석 URL
 * — 상품명을 우리 API로 넘겨 keywordId 로 변환한 뒤 분석 페이지로 이동
 *   (아이템스카우트는 /keyword/{숫자ID} 만 인식. 상품명 path 는 검색란에 안 들어감)
 */
export function itemscoutKeywordAnalysisUrl(productName: string, keyword?: string): string {
  const text = (productName || keyword || '').trim();
  if (!text) return 'https://itemscout.io/keyword';
  return `/api/itemscout-redirect?q=${encodeURIComponent(text)}`;
}

/** 캡처·결과 화면 바로가기 — 7개 (1688·타obao 제외, 아이템스카우트 보존) */
export const CAPTURE_SHORTCUT_IDS = [
  'coupang',
  'naver',
  'naver-shopping',
  'domeggook',
  'domeme',
  'alibaba',
  'itemscout',
] as const;

export type CaptureShortcutId = (typeof CAPTURE_SHORTCUT_IDS)[number];

export function filterMarketShortcuts(ids: readonly string[] = CAPTURE_SHORTCUT_IDS) {
  const set = new Set(ids);
  return MARKET_SHORTCUTS.filter(s => set.has(s.id));
}

/** 결과 화면 바로가기 마켓 목록 */
export const MARKET_SHORTCUTS: MarketShortcut[] = [
  {
    id: 'coupang',
    label: '쿠팡',
    mark: '쿠',
    color: '#e31837',
    buildUrl: q =>
      `https://www.coupang.com/np/search?q=${encodeURIComponent(shortcutSearchText(q))}`,
  },
  {
    id: 'naver',
    label: '네이버',
    mark: 'N',
    color: '#03c75a',
    buildUrl: q =>
      `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(shortcutSearchText(q))}`,
  },
  {
    id: 'naver-shopping',
    label: '비교',
    mark: '比',
    color: '#00a84d',
    buildUrl: q =>
      `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(shortcutSearchText(q))}`,
  },
  {
    id: 'domeggook',
    label: '도매꾹',
    mark: '꾹',
    color: '#2563eb',
    buildUrl: q =>
      `https://domeggook.com/main/item/itemList.php?sf=subject&sw=${encodeURIComponent(shortcutSearchText(q))}`,
  },
  {
    id: 'domeme',
    label: '도매매',
    mark: '매',
    color: '#0ea5e9',
    buildUrl: q => {
      const text = encodeURIComponent(shortcutSearchText(q));
      return `https://domemedb.domeggook.com/index/item/supplyList.php?sf=subject&sw=${text}&fromOversea=2`;
    },
  },
  {
    id: 'alibaba',
    label: '알리',
    mark: 'Al',
    color: '#ff6a00',
    buildUrl: q =>
      `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&SearchText=${encodeURIComponent(shortcutSearchText(q))}`,
  },
  {
    id: 'itemscout',
    label: '스카우트',
    mark: '스',
    color: '#7c3aed',
    buildUrl: q => itemscoutKeywordAnalysisUrl(q.productName, q.keyword),
  },
];
