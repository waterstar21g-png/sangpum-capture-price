export interface MarketShortcut {
  id: string;
  label: string;
  /** 아이콘 표시용 짧은 글자 */
  mark: string;
  /** 배경색 */
  color: string;
  buildUrl: (keyword: string) => string;
}

/** 결과 화면 바로가기 마켓 목록 */
export const MARKET_SHORTCUTS: MarketShortcut[] = [
  {
    id: 'itemsourcing',
    label: '아이템소싱',
    mark: '소',
    color: '#7c3aed',
    buildUrl: q => `https://itemscout.io/keyword/${encodeURIComponent(q)}`,
  },
  {
    id: 'naver',
    label: '네이버',
    mark: 'N',
    color: '#03c75a',
    buildUrl: q => `https://search.naver.com/search.naver?query=${encodeURIComponent(q)}`,
  },
  {
    id: 'naver-shopping',
    label: '네이버쇼핑',
    mark: '쇼',
    color: '#00c73c',
    buildUrl: q => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`,
  },
  {
    id: 'coupang',
    label: '쿠팡',
    mark: '쿠',
    color: '#e31837',
    buildUrl: q => `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'domeggook',
    label: '도매꾹',
    mark: '꾹',
    color: '#2563eb',
    buildUrl: q =>
      `https://domeggook.com/main/item/itemList.php?sf=subject&sw=${encodeURIComponent(q)}`,
  },
  {
    id: 'domeme',
    label: '도매매',
    mark: '매',
    color: '#0ea5e9',
    buildUrl: q => `https://domeme.com/goods/goods_search.php?keyword=${encodeURIComponent(q)}`,
  },
  {
    id: '1688',
    label: '1688',
    mark: '16',
    color: '#ff6a00',
    buildUrl: q =>
      `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(q)}`,
  },
  {
    id: 'alibaba',
    label: 'Alibaba',
    mark: 'Al',
    color: '#ff6a00',
    buildUrl: q =>
      `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&SearchText=${encodeURIComponent(q)}`,
  },
  {
    id: 'taobao',
    label: 'TaoBao',
    mark: '淘',
    color: '#ff5000',
    buildUrl: q => `https://s.taobao.com/search?q=${encodeURIComponent(q)}`,
  },
];
