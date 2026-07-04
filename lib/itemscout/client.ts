import type { ProductScoutResult, ViewTrendPoint, PriceListing } from '@/lib/itemscout/types';

const DEFAULT_BASE = 'https://api.itemscout.io';

function competitionLabel(score: number): string {
  if (score >= 80) return '매우 높음';
  if (score >= 60) return '높음';
  if (score >= 40) return '보통';
  if (score >= 20) return '낮음';
  return '매우 낮음';
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

function buildDemoPrices(keyword: string, seed: number): PriceListing[] {
  const malls = ['네이버쇼핑', '쿠팡', 'G마켓', '11번가', '옥션', '스마트스토어', '위메프'];
  const base = seeded(8000, 45000, seed, 1);
  return malls.slice(0, 5).map((mall, i) => ({
    rank: i + 1,
    productName: `${keyword} ${i === 0 ? '정품' : i === 1 ? '특가' : '인기'}`,
    price: base + seeded(0, 12000, seed, i + 2),
    mallName: mall,
  }));
}

import { fetchNaverLowestPrices } from '@/lib/naver-shopping';

/** 키워드 기반 데모 + 네이버 쇼핑 최저가(키 있을 때) */
export async function buildMarketResult(
  keyword: string,
  productName: string,
  category?: string,
): Promise<ProductScoutResult> {
  const base = buildDemoScoutResult(keyword, productName, category);
  try {
    const naver = await fetchNaverLowestPrices(keyword);
    if (naver.prices.length) {
      return {
        ...base,
        lowestPrices: naver.prices,
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
  const competingProducts = seeded(80, 3200, seed, 4);
  const weeklySales = seeded(15, 420, seed, 5);
  const competitionIntensity = seeded(18, 92, seed, 6);

  return {
    keyword,
    productName,
    category,
    competitionIntensity,
    competitionLabel: competitionLabel(competitionIntensity),
    weeklyViews,
    competingProducts,
    weeklySales,
    lowestPrices: buildDemoPrices(keyword, seed),
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

  const intensity = competitionIntensity ?? 50;
  return {
    keyword: pickString(payload, ['keyword', 'searchKeyword']) ?? keyword,
    productName: pickString(payload, ['productName', 'name']) ?? productName,
    category: pickString(payload, ['category']) ?? category,
    competitionIntensity: intensity,
    competitionLabel: competitionLabel(intensity),
    weeklyViews: weeklyViews ?? 0,
    competingProducts: competingProducts ?? 0,
    weeklySales: weeklySales ?? 0,
    lowestPrices,
    viewTrend: viewTrend.length ? viewTrend : buildWeekTrend(hashKeyword(keyword), Math.round((weeklyViews ?? 1000) / 7)),
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
