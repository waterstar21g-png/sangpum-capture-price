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

export interface ProductScoutResult {
  keyword: string;
  productName: string;
  category?: string;
  competitionIntensity: number;
  competitionLabel: string;
  weeklyViews: number;
  competingProducts: number;
  weeklySales: number;
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
