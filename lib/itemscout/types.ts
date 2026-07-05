/** 아이템스카우트 키워드 분석 결과 */

/** 네이버쇼핑 가격비교 한 줄 (쇼핑몰/판매처) */
export interface PriceCompareItem {
  /** 쇼핑몰명 또는 판매처명 */
  name: string;
  price: number;
  /** 네이버페이/플러스 여부 */
  npay?: boolean;
  /** 최저가 행 (↓ 표시) */
  isLowest?: boolean;
  url?: string;
  badge?: string;
}

/** 네이버쇼핑 가격비교 — 동일 상품 1건 기준 */
export interface PriceCompare {
  /** 비교 대상 상품명 (네이버 표기와 동일하게) */
  productName: string;
  /** 전체 최저가 */
  lowestPrice?: number;
  /** 1) 쇼핑몰별 최저가 */
  mallLowest: PriceCompareItem[];
  /** 2) 브랜드 카탈로그 */
  brandCatalog: PriceCompareItem[];
  /** 네이버쇼핑 가격비교 페이지 */
  compareUrl?: string;
}

export interface ViewTrendPoint {
  date: string;
  views: number;
}

/** 채널별 경쟁강도 (네이버·쿠팡) */
export interface ChannelCompetition {
  channel: 'naver' | 'coupang';
  label: string;
  productCount: number;
  monthlySearches: number;
  intensity: number;
  intensityLabel: string;
}

export interface OverviewChartPoint {
  label: string;
  searchPct: number;
  clickPct: number;
}

export interface RatioSlice {
  label: string;
  pct: number;
}

export interface ProductScoutResult {
  keyword: string;
  productName: string;
  category?: string;
  competitionIntensity: number;
  competitionLabel: string;
  weeklyViews: number;
  competingProducts: number;
  weeklySales: number;
  competitionByChannel: ChannelCompetition[];
  overviewChart: OverviewChartPoint[];
  genderClickRatio: RatioSlice[];
  ageClickRatio: RatioSlice[];
  priceCompare: PriceCompare;
  viewTrend: ViewTrendPoint[];
  /** true = 아이템스카우트 API 실측 지표 (추세·경쟁강도·클릭비율 등) */
  itemscoutMetricsAvailable: boolean;
  source: 'naver' | 'itemscout' | 'demo';
  priceSource?: 'naver' | 'demo';
  analyzedAt: string;
}

export interface ProductVisionResult {
  productName: string;
  keyword: string;
  category: string;
  description: string;
  confidence: number;
}
