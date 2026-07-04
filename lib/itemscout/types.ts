/** 아이템스카우트 키워드 분석 결과 */

export interface PriceListing {
  rank: number;
  productName: string;
  price: number;
  mallName: string;
  url?: string;
}

export interface ViewTrendPoint {
  date: string;
  views: number;
}

/** 채널별 경쟁강도 (네이버·쿠팡) */
export interface ChannelCompetition {
  channel: 'naver' | 'coupang';
  label: string;
  /** 상품수 */
  productCount: number;
  /** 한 달 검색수 */
  monthlySearches: number;
  /** 경쟁강도 = 상품수 / 한 달 검색수 */
  intensity: number;
  intensityLabel: string;
}

export interface OverviewChartPoint {
  label: string;
  /** 검색량 (%) */
  searchPct: number;
  /** 클릭량 (%) */
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
  /** @deprecated 채널별 competitionByChannel 사용 */
  competitionIntensity: number;
  competitionLabel: string;
  weeklyViews: number;
  competingProducts: number;
  weeklySales: number;
  /** 네이버·쿠팡 경쟁강도 */
  competitionByChannel: ChannelCompetition[];
  /** 종합 차트: 검색량(%) · 클릭량(%) */
  overviewChart: OverviewChartPoint[];
  /** 성별 클릭 비율 */
  genderClickRatio: RatioSlice[];
  /** 연령별 클릭 비율 */
  ageClickRatio: RatioSlice[];
  lowestPrices: PriceListing[];
  viewTrend: ViewTrendPoint[];
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
