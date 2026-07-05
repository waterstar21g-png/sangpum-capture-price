import type { ProductScoutResult } from '@/lib/itemscout/types';

/** 아이템스카우트 실데이터 없을 때 — 차트·경쟁강도 등 표시하지 않음 */
export const EMPTY_ITEMSCOUT_METRICS = {
  competitionIntensity: 0,
  competitionLabel: '',
  weeklyViews: 0,
  competingProducts: 0,
  weeklySales: 0,
  competitionByChannel: [] as ProductScoutResult['competitionByChannel'],
  overviewChart: [] as ProductScoutResult['overviewChart'],
  genderClickRatio: [] as ProductScoutResult['genderClickRatio'],
  ageClickRatio: [] as ProductScoutResult['ageClickRatio'],
  viewTrend: [] as ProductScoutResult['viewTrend'],
  itemscoutMetricsAvailable: false,
} as const;
