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

/** 결과 화면 바로가기 마켓 목록 */
export const MARKET_SHORTCUTS: MarketShortcut[] = [
  {
    id: 'itemscout',
    label: '아이템스카우트',
    mark: '스',
    color: '#7c3aed',
    buildUrl: q => itemscoutKeywordAnalysisUrl(q.productName, q.keyword),
  },
  {
    id: 'naver',
    label: '쇼핑앱',
    mark: 'N',
    color: '#03c75a',
    buildUrl: q =>
      `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(shortcutSearchText(q))}`,
  },
  {
    id: 'naver-shopping',
    label: '가격비교',
    mark: '比',
    color: '#00a84d',
    buildUrl: q =>
      `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(shortcutSearchText(q))}`,
  },
  {
    id: 'coupang',
    label: '쿠팡',
    mark: '쿠',
    color: '#e31837',
    buildUrl: q =>
      `https://www.coupang.com/np/search?q=${encodeURIComponent(shortcutSearchText(q))}`,
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
      // domeme.com/goods/goods_search.php 는 폐기됨 → domemedb 상품검색 사용
      return `https://domemedb.domeggook.com/index/item/supplyList.php?sf=subject&sw=${text}&fromOversea=2`;
    },
  },
  {
    id: '1688',
    label: '1688',
    mark: '16',
    color: '#ff6a00',
    buildUrl: q =>
      `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(shortcutSearchText(q))}`,
  },
  {
    id: 'alibaba',
    label: 'Alibaba',
    mark: 'Al',
    color: '#ff6a00',
    buildUrl: q =>
      `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&SearchText=${encodeURIComponent(shortcutSearchText(q))}`,
  },
  {
    id: 'taobao',
    label: 'TaoBao',
    mark: '淘',
    color: '#ff5000',
    buildUrl: q =>
      `https://s.taobao.com/search?q=${encodeURIComponent(shortcutSearchText(q))}`,
  },
];
