import type {
  ProductScoutResult,
  ViewTrendPoint,
  PriceListing,
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

function buildOverviewChart(seed: number): OverviewChartPoint[] {
  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  return labels.map((label, i) => {
    const searchPct = seeded(8, 22, seed, 20 + i);
    const clickPct = seeded(5, 18, seed, 30 + i);
    return { label, searchPct, clickPct };
  });
}

function buildGenderClickRatio(seed: number): RatioSlice[] {
  const male = seeded(35, 65, seed, 40);
  return [
    { label: '남성', pct: male },
    { label: '여성', pct: 100 - male },
  ];
}

function buildAgeClickRatio(seed: number): RatioSlice[] {
  const ages = ['10대', '20대', '30대', '40대', '50대+'];
  const weights = ages.map((_, i) => seeded(8, 30, seed, 50 + i));
  const sum = weights.reduce((a, b) => a + b, 0);
  return ages.map((label, i) => ({
    label,
    pct: Math.round((weights[i] / sum) * 1000) / 10,
  }));
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

function buildWeekTrend(seed: number, baseViews: number): ViewTrendPoint[] {
  const points: ViewTrendPoint[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const variance = seeded(-0.15, 0.2, seed, i + 10);
    const views = Math.max(100, Math.round(baseViews * (1 + variance)));
    points.push({ date: label, views });
  }
  return points;
}

/** 동일상품 가격비교 — 최소 사이트 수 */
export const MIN_PRICE_COMPARE_SITES = 5;

const PRICE_COMPARE_SITES = [
  '네이버쇼핑',
  '쿠팡',
  'G마켓',
  '11번가',
  '옥션',
  '스마트스토어',
  '위메프',
];

/** 동일상품 기준 사이트별 가격 (최소 5개 사이트) */
function buildDemoPrices(productName: string, seed: number): PriceListing[] {
  const base = seeded(8000, 45000, seed, 1);
  const items = PRICE_COMPARE_SITES.slice(0, MIN_PRICE_COMPARE_SITES).map((mall, i) => ({
    rank: i + 1,
    productName,
    price: base + seeded(0, 12000, seed, i + 2),
    mallName: mall,
  }));
  return items.sort((a, b) => a.price - b.price).map((p, i) => ({ ...p, rank: i + 1 }));
}

/**
 * 동일상품 가격비교: 서로 다른 사이트 최소 N개 보장.
 * API 결과가 부족하면 데모 사이트로 보강한다.
 */
export function ensureMinPriceSites(
  prices: PriceListing[],
  productName: string,
  seed: number,
  minSites = MIN_PRICE_COMPARE_SITES,
): PriceListing[] {
  const byMall = new Map<string, PriceListing>();
  for (const p of prices) {
    const key = p.mallName.trim() || '미상';
    const existing = byMall.get(key);
    if (!existing || p.price < existing.price) {
      byMall.set(key, { ...p, productName: productName || p.productName });
    }
  }

  if (byMall.size < minSites) {
    const fallback = buildDemoPrices(productName, seed);
    for (const p of fallback) {
      if (byMall.size >= minSites) break;
      if (!byMall.has(p.mallName)) byMall.set(p.mallName, p);
    }
  }

  return [...byMall.values()]
    .sort((a, b) => a.price - b.price)
    .slice(0, Math.max(minSites, byMall.size))
    .map((p, i) => ({ ...p, rank: i + 1, productName: productName || p.productName }));
}

import { fetchNaverLowestPrices } from '@/lib/naver-shopping';

/** 키워드 기반 데모 + 네이버 쇼핑 최저가(키 있을 때) */
export async function buildMarketResult(
  keyword: string,
  productName: string,
  category?: string,
): Promise<ProductScoutResult> {
  const base = buildDemoScoutResult(keyword, productName, category);
  const seed = hashKeyword(keyword);
  try {
    const naver = await fetchNaverLowestPrices(keyword);
    if (naver.prices.length) {
      return {
        ...base,
        lowestPrices: ensureMinPriceSites(naver.prices, productName, seed),
        competingProducts: naver.totalProducts,
        source: 'naver',
        priceSource: 'naver',
      };
    }
  } catch (e) {
    console.warn('[market] naver', e instanceof Error ? e.message : e);
  }
  return { ...base, priceSource: 'demo' };
}

/** API 키 없을 때 키워드 기반 데모 데이터 */
export function buildDemoScoutResult(
  keyword: string,
  productName: string,
  category?: string,
): ProductScoutResult {
  const seed = hashKeyword(keyword);
  const weeklyViews = seeded(1200, 48000, seed, 3);
  const weeklySales = seeded(15, 420, seed, 5);

  // 네이버: 예시 스펙(상품수 8 · 한 달 검색수 20 · 경쟁강도 0.40)을 기본으로 시드 변형
  const naverProducts = Math.max(1, seeded(5, 24, seed, 4));
  const naverSearches = Math.max(naverProducts, seeded(15, 60, seed, 5));
  const coupangProducts = Math.max(1, seeded(6, 30, seed, 6));
  const coupangSearches = Math.max(coupangProducts, seeded(12, 55, seed, 7));

  const competitionByChannel = [
    buildChannelCompetition('naver', '네이버', naverProducts, naverSearches),
    buildChannelCompetition('coupang', '쿠팡', coupangProducts, coupangSearches),
  ];

  const primary = competitionByChannel[0];
  const competingProducts = primary.productCount;
  const competitionIntensity = primary.intensity;

  return {
    keyword,
    productName,
    category,
    competitionIntensity,
    competitionLabel: primary.intensityLabel,
    weeklyViews,
    competingProducts,
    weeklySales,
    competitionByChannel,
    overviewChart: buildOverviewChart(seed),
    genderClickRatio: buildGenderClickRatio(seed),
    ageClickRatio: buildAgeClickRatio(seed),
    lowestPrices: buildDemoPrices(productName, seed),
    viewTrend: buildWeekTrend(seed, Math.round(weeklyViews / 7)),
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

function normalizePrices(raw: unknown): PriceListing[] {
  if (!Array.isArray(raw)) return [];
  const items: PriceListing[] = [];
  for (let i = 0; i < raw.length && i < 10; i++) {
    const row = raw[i];
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const price = pickNumber(o, ['price', 'lowestPrice', 'salePrice', 'amount', 'minPrice']);
    const name = pickString(o, ['productName', 'name', 'title', 'goodsName']);
    const mall = pickString(o, ['mallName', 'mall', 'shopName', 'storeName', 'seller']);
    if (price == null || !name) continue;
    items.push({
      rank: items.length + 1,
      productName: name,
      price,
      mallName: mall ?? '미상',
      url: pickString(o, ['url', 'link', 'productUrl']),
    });
  }
  return items.sort((a, b) => a.price - b.price).map((p, idx) => ({ ...p, rank: idx + 1 }));
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
  return points.slice(-7);
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
  const competitionIntensity = pickNumber(payload, [
    'competitionIntensity',
    'competition',
    'competitionScore',
    'competitionDegree',
    'competitionLevel',
  ]);

  const lowestPrices = normalizePrices(
    payload.lowestPrices ?? payload.priceList ?? payload.products ?? payload.items ?? payload.goods,
  );
  const viewTrend = normalizeTrend(
    payload.viewTrend ?? payload.searchTrend ?? payload.trend ?? payload.chart ?? payload.clicks,
  );

  if (
    weeklyViews == null &&
    competingProducts == null &&
    weeklySales == null &&
    competitionIntensity == null &&
    !lowestPrices.length &&
    !viewTrend.length
  ) {
    return null;
  }

  const seed = hashKeyword(keyword);
  const name = pickString(payload, ['productName', 'name']) ?? productName;
  const products = competingProducts ?? seeded(5, 24, seed, 4);
  const monthly = Math.max(products, seeded(15, 60, seed, 5));
  const ratio =
    competitionIntensity != null && competitionIntensity <= 2
      ? competitionIntensity
      : competitionIntensity != null
        ? Math.round((competitionIntensity / 100) * 100) / 100
        : Math.round((products / monthly) * 100) / 100;

  const competitionByChannel = [
    buildChannelCompetition('naver', '네이버', products, monthly),
    buildChannelCompetition(
      'coupang',
      '쿠팡',
      Math.max(1, seeded(6, 30, seed, 6)),
      Math.max(1, seeded(12, 55, seed, 7)),
    ),
  ];
  if (competitionIntensity != null) {
    competitionByChannel[0] = {
      ...competitionByChannel[0],
      intensity: ratio,
      intensityLabel: intensityLabel(ratio),
    };
  }

  return {
    keyword: pickString(payload, ['keyword', 'searchKeyword']) ?? keyword,
    productName: name,
    category: pickString(payload, ['category']) ?? category,
    competitionIntensity: competitionByChannel[0].intensity,
    competitionLabel: competitionByChannel[0].intensityLabel,
    weeklyViews: weeklyViews ?? 0,
    competingProducts: products,
    weeklySales: weeklySales ?? 0,
    competitionByChannel,
    overviewChart: buildOverviewChart(seed),
    genderClickRatio: buildGenderClickRatio(seed),
    ageClickRatio: buildAgeClickRatio(seed),
    lowestPrices: ensureMinPriceSites(lowestPrices, name, seed),
    viewTrend: viewTrend.length
      ? viewTrend
      : buildWeekTrend(seed, Math.round((weeklyViews ?? 1000) / 7)),
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
