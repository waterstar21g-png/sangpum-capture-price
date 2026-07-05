import type {
  ProductScoutResult,
  ViewTrendPoint,
  PriceCompare,
  PriceCompareItem,
  ChannelCompetition,
  OverviewChartPoint,
  RatioSlice,
} from '@/lib/itemscout/types';

const DEFAULT_BASE = 'https://api.itemscout.io';

/** 경쟁강도(비율) 라벨 — 예: 0.40 */
function intensityLabel(ratio: number): string {
  if (ratio >= 1) return '매우 높음';
  if (ratio >= 0.6) return '높음';
  if (ratio >= 0.4) return '보통';
  if (ratio >= 0.2) return '낮음';
  return '매우 낮음';
}

function buildChannelCompetition(
  channel: 'naver' | 'coupang',
  label: string,
  productCount: number,
  monthlySearches: number,
): ChannelCompetition {
  const intensity =
    monthlySearches > 0
      ? Math.round((productCount / monthlySearches) * 100) / 100
      : 0;
  return {
    channel,
    label,
    productCount,
    monthlySearches,
    intensity,
    intensityLabel: intensityLabel(intensity),
  };
}

function hashKeyword(keyword: string): number {
  let h = 0;
  for (let i = 0; i < keyword.length; i++) {
    h = (h * 31 + keyword.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seeded(min: number, max: number, seed: number, offset = 0): number {
  const x = Math.sin((seed + offset) * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

/** 네이버쇼핑 가격비교 데모 — 동일 상품명, 스크린샷 양식 */
function buildDemoPriceCompare(productName: string, seed: number): PriceCompare {
  const title = productName.trim() || '상품';
  const mallLowest: PriceCompareItem[] = [
    { name: '11번가', price: 55890 + seeded(0, 200, seed, 1), isLowest: true },
    { name: 'G마켓', price: 59150 + seeded(0, 200, seed, 2) },
    { name: '쿠팡', price: 78000 + seeded(0, 300, seed, 3) },
    { name: 'MIRACLE365', price: 79000 + seeded(0, 200, seed, 4), npay: true },
    { name: '옥션', price: 79400 + seeded(0, 200, seed, 5) },
  ].sort((a, b) => a.price - b.price);
  mallLowest.forEach((r, i) => {
    r.isLowest = i === 0;
  });

  const brandCatalog: PriceCompareItem[] = [
    { name: 'G마켓', price: 32200 + seeded(0, 200, seed, 6), isLowest: true },
    { name: '백년친구', price: 35000 + seeded(0, 200, seed, 7), npay: true },
    { name: '지태헬스', price: 36730 + seeded(0, 200, seed, 8), npay: true },
    { name: 'BOTO', price: 49900 + seeded(0, 200, seed, 9), npay: true },
  ].sort((a, b) => a.price - b.price);
  brandCatalog.forEach((r, i) => {
    r.isLowest = i === 0;
  });

  const lowestPrice = Math.min(mallLowest[0].price, brandCatalog[0].price);
  return {
    productName: title,
    lowestPrice,
    mallLowest,
    brandCatalog,
    compareUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(title)}`,
  };
}

import { fetchNaverPriceCompare } from '@/lib/naver-shopping';
import { EMPTY_ITEMSCOUT_METRICS } from '@/lib/itemscout/empty-metrics';

/** 키워드 기반 데모 + 네이버쇼핑 가격비교(키 있을 때) */
export async function buildMarketResult(
  keyword: string,
  productName: string,
  category?: string,
): Promise<ProductScoutResult> {
  const base = buildDemoScoutResult(keyword, productName, category);
  try {
    const naver = await fetchNaverPriceCompare(keyword, productName);
    const hasData =
      naver.priceCompare.mallLowest.length > 0 || naver.priceCompare.brandCatalog.length > 0;
    if (hasData) {
      return {
        ...base,
        priceCompare: naver.priceCompare,
        source: 'naver',
        priceSource: 'naver',
      };
    }
  } catch (e) {
    console.warn('[market] naver', e instanceof Error ? e.message : e);
  }
  return { ...base, priceSource: 'demo' };
}

/** API 키 없을 때 — 가격비교 데모만, 지표·차트는 비움 */
export function buildDemoScoutResult(
  keyword: string,
  productName: string,
  category?: string,
): ProductScoutResult {
  const seed = hashKeyword(keyword);

  return {
    keyword,
    productName,
    category,
    ...EMPTY_ITEMSCOUT_METRICS,
    priceCompare: buildDemoPriceCompare(productName, seed),
    source: 'demo',
    analyzedAt: new Date().toISOString(),
  };
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v.replace(/,/g, ''));
      if (!Number.isNaN(n)) return n;
    }
  }
  return undefined;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizePriceCompareItems(raw: unknown): PriceCompareItem[] {
  if (!Array.isArray(raw)) return [];
  const items: PriceCompareItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const price = pickNumber(o, ['price', 'lowestPrice', 'salePrice', 'amount', 'minPrice']);
    const name = pickString(o, ['name', 'mallName', 'brand', 'shopName', 'storeName', 'seller']);
    if (price == null || !name) continue;
    items.push({
      name,
      price,
      badge: pickString(o, ['badge', 'membership', 'label']),
      url: pickString(o, ['url', 'link', 'productUrl']),
    });
  }
  return items.sort((a, b) => a.price - b.price);
}

function normalizeOverviewChart(raw: unknown): OverviewChartPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: OverviewChartPoint[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const searchPct = pickNumber(o, ['searchPct', 'searchPercent', 'searchRatio', 'search']);
    const clickPct = pickNumber(o, ['clickPct', 'clickPercent', 'clickRatio', 'click']);
    const label =
      pickString(o, ['label', 'date', 'month', 'period']) ?? `M${points.length + 1}`;
    if (searchPct == null && clickPct == null) continue;
    points.push({
      label,
      searchPct: searchPct ?? 0,
      clickPct: clickPct ?? 0,
    });
  }
  return points.slice(-12);
}

function normalizeRatioSlices(raw: unknown): RatioSlice[] {
  if (!Array.isArray(raw)) return [];
  const slices: RatioSlice[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const label = pickString(o, ['label', 'name', 'age', 'gender']);
    const pct = pickNumber(o, ['pct', 'percent', 'ratio', 'value']);
    if (!label || pct == null) continue;
    slices.push({ label, pct });
  }
  return slices;
}

function normalizeTrend(raw: unknown): ViewTrendPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: ViewTrendPoint[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const views = pickNumber(o, ['views', 'searchCount', 'clickCount', 'count', 'value']);
    const date =
      pickString(o, ['date', 'label', 'day', 'period']) ??
      (typeof o.date === 'number' ? String(o.date) : undefined);
    if (views == null) continue;
    points.push({ date: date ?? `D${points.length + 1}`, views });
  }
  return points.slice(-12);
}

/** B2B API 응답을 앱 표시 형식으로 정규화 (필드명 유연 매핑) */
function normalizeApiResponse(
  data: unknown,
  keyword: string,
  productName: string,
  category?: string,
): ProductScoutResult | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const payload =
    (root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null) ??
    (root.result && typeof root.result === 'object' ? (root.result as Record<string, unknown>) : null) ??
    root;

  const weeklyViews = pickNumber(payload, [
    'weeklyViews',
    'weekViews',
    'searchCountWeek',
    'recentWeekViews',
    'clickCount7d',
    'searchCount',
  ]);
  const competingProducts = pickNumber(payload, [
    'competingProducts',
    'productCount',
    'goodsCount',
    'itemCount',
    'totalProducts',
  ]);
  const weeklySales = pickNumber(payload, [
    'weeklySales',
    'weekSales',
    'salesCount7d',
    'salesVolumeWeek',
    'purchaseCount',
  ]);
  const rawCompetitionIntensity = pickNumber(payload, [
    'competitionIntensity',
    'competition',
    'competitionScore',
    'competitionDegree',
    'competitionLevel',
  ]);

  const pricePayload =
    payload.priceCompare && typeof payload.priceCompare === 'object'
      ? (payload.priceCompare as Record<string, unknown>)
      : null;
  const mallLowest = normalizePriceCompareItems(
    pricePayload?.mallLowest ?? payload.mallLowest ?? payload.lowestPrices,
  );
  const brandCatalog = normalizePriceCompareItems(
    pricePayload?.brandCatalog ?? payload.brandCatalog,
  );
  const viewTrend = normalizeTrend(
    payload.viewTrend ?? payload.searchTrend ?? payload.trend ?? payload.chart ?? payload.clicks,
  );
  const overviewChart = normalizeOverviewChart(
    payload.overviewChart ?? payload.monthlyChart ?? payload.searchClickTrend,
  );
  const genderClickRatio = normalizeRatioSlices(
    payload.genderClickRatio ?? payload.genderRatio ?? payload.gender,
  );
  const ageClickRatio = normalizeRatioSlices(
    payload.ageClickRatio ?? payload.ageRatio ?? payload.age,
  );

  const hasTrend = viewTrend.length > 0 || overviewChart.length > 0;
  const hasCompetition =
    competingProducts != null &&
    pickNumber(payload, ['monthlySearches', 'monthlySearchCount', 'searchCountMonth']) != null;
  const itemscoutMetricsAvailable = hasTrend || hasCompetition;

  if (
    !itemscoutMetricsAvailable &&
    weeklyViews == null &&
    competingProducts == null &&
    weeklySales == null &&
    !mallLowest.length &&
    !brandCatalog.length
  ) {
    return null;
  }

  const seed = hashKeyword(keyword);
  const name = pickString(payload, ['productName', 'name']) ?? productName;

  let competitionByChannel: ChannelCompetition[] = [];
  let competitionIntensity = 0;
  let competitionLabel = '';

  if (hasCompetition && competingProducts != null) {
    const monthly =
      pickNumber(payload, ['monthlySearches', 'monthlySearchCount', 'searchCountMonth']) ??
      Math.max(competingProducts, 1);
    const ratio =
      rawCompetitionIntensity != null && rawCompetitionIntensity <= 2
        ? rawCompetitionIntensity
        : rawCompetitionIntensity != null
          ? Math.round((rawCompetitionIntensity / 100) * 100) / 100
          : Math.round((competingProducts / monthly) * 100) / 100;

    competitionByChannel = [
      buildChannelCompetition('naver', '네이버', competingProducts, monthly),
      buildChannelCompetition(
        'coupang',
        '쿠팡',
        pickNumber(payload, ['coupangProductCount', 'coupangProducts']) ??
          Math.max(1, Math.round(competingProducts * 0.8)),
        pickNumber(payload, ['coupangMonthlySearches', 'coupangSearchCount']) ??
          Math.max(1, Math.round(monthly * 0.7)),
      ),
    ];
    if (rawCompetitionIntensity != null) {
      competitionByChannel[0] = {
        ...competitionByChannel[0],
        intensity: ratio,
        intensityLabel: intensityLabel(ratio),
      };
    }
    competitionIntensity = competitionByChannel[0].intensity;
    competitionLabel = competitionByChannel[0].intensityLabel;
  }

  const demoCompare = buildDemoPriceCompare(name, seed);

  return {
    keyword: pickString(payload, ['keyword', 'searchKeyword']) ?? keyword,
    productName: name,
    category: pickString(payload, ['category']) ?? category,
    competitionIntensity,
    competitionLabel,
    weeklyViews: weeklyViews ?? 0,
    competingProducts: competingProducts ?? 0,
    weeklySales: weeklySales ?? 0,
    competitionByChannel,
    overviewChart,
    genderClickRatio,
    ageClickRatio,
    priceCompare: {
      productName: name,
      lowestPrice: demoCompare.lowestPrice,
      mallLowest: mallLowest.length ? mallLowest : demoCompare.mallLowest,
      brandCatalog: brandCatalog.length ? brandCatalog : demoCompare.brandCatalog,
      compareUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(name)}`,
    },
    viewTrend,
    itemscoutMetricsAvailable,
    source: 'itemscout',
    analyzedAt: new Date().toISOString(),
  };
}

export interface FetchKeywordAnalysisOptions {
  keyword: string;
  productName: string;
  category?: string;
}

/**
 * 아이템스카우트 B2B API 호출.
 * ITEMSCOUT_API_KEY 미설정 시 데모 데이터 반환.
 * ITEMSCOUT_KEYWORD_PATH 로 엔드포인트 커스터마이즈 가능 (기본: /api/open/v1/keyword).
 */
export async function fetchKeywordAnalysis(
  opts: FetchKeywordAnalysisOptions,
): Promise<ProductScoutResult> {
  const itemscoutKey = process.env.ITEMSCOUT_API_KEY?.trim();
  if (!itemscoutKey) {
    return buildMarketResult(opts.keyword, opts.productName, opts.category);
  }

  const apiKey = itemscoutKey;

  const base = (process.env.ITEMSCOUT_API_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '');
  const path = process.env.ITEMSCOUT_KEYWORD_PATH?.trim() || '/api/open/v1/keyword';
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const authHeader = process.env.ITEMSCOUT_AUTH_HEADER?.trim() || 'Authorization';
  const authScheme = process.env.ITEMSCOUT_AUTH_SCHEME?.trim() || 'Bearer';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      [authHeader]: `${authScheme} ${apiKey}`,
    },
    body: JSON.stringify({ keyword: opts.keyword }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`itemscout_api:${res.status}:${errText.slice(0, 300)}`);
  }

  const json: unknown = await res.json();
  const normalized = normalizeApiResponse(json, opts.keyword, opts.productName, opts.category);
  if (!normalized) {
    throw new Error('itemscout_parse_failed');
  }
  return normalized;
}
