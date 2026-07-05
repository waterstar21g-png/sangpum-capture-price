import type { PriceCompare, PriceCompareItem } from '@/lib/itemscout/types';
import {
  isSameProductTitle,
  normalizeProductText,
  productNameTokens,
} from '@/lib/product-name-match';

interface NaverShopItem {
  title: string;
  link: string;
  lprice: string;
  mallName: string;
  brand?: string;
  maker?: string;
  productType?: string;
  productId?: string;
}

interface NaverShopResponse {
  total?: number;
  items?: NaverShopItem[];
  errorMessage?: string;
}

export interface NaverShopListing {
  title: string;
  price: number;
  mallName: string;
  url: string;
  badge?: string;
  isAd?: boolean;
}

export interface NaverPriceCompareResult {
  priceCompare: PriceCompare;
  totalProducts: number;
  source: 'naver';
}

const OPEN_MALLS = ['쿠팡', 'G마켓', '옥션', '11번가', '위메프', '티몬', 'SSG', '이마트몰', '롯데ON', '롯데온'];

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

function parsePrice(raw: string): number {
  return Number(String(raw).replace(/,/g, '')) || 0;
}

function hasNpay(title: string): boolean {
  const t = title.replace(/\s/g, '');
  return t.includes('네이버플러스') || t.includes('네이버페이') || t.includes('N배송') || /플러스\s*멤버/.test(title);
}

/** 동일 상품군 중 대표 상품명(가장 잘 맞는 타이틀) 선정 */
function pickCanonicalTitle(items: NaverShopItem[], productName: string): string {
  const target = normalizeProductText(productName);
  let best = productName;
  let bestScore = -1;

  for (const it of items) {
    const title = stripHtml(it.title);
    const norm = normalizeProductText(title);
    let score = 0;
    if (norm === target) score += 100;
    if (norm.includes(target) || target.includes(norm)) score += 50;
    const tokens = productNameTokens(productName);
    score += tokens.filter(tok => norm.includes(tok)).length * 10;
    // 짧은 타이틀(옵션만 다른 동일상품) 선호
    score += Math.max(0, 30 - Math.abs(norm.length - target.length));
    if (score > bestScore) {
      bestScore = score;
      best = title;
    }
  }
  return best;
}

/** 대표 상품명과 동일 상품만 (옵션·용량까지 최대한 동일) */
function filterExactProduct(items: NaverShopItem[], canonicalTitle: string, productName: string): NaverShopItem[] {
  const canonTokens = productNameTokens(canonicalTitle);
  const nameTokens = productNameTokens(productName);
  const required = canonTokens.length >= nameTokens.length ? canonTokens : nameTokens;

  return items.filter(raw => {
    const title = stripHtml(raw.title);
    if (!isSameProductTitle(title, productName)) return false;
    const norm = normalizeProductText(title);
    // 대표 상품명의 핵심 토큰이 모두 포함되어야 함
    return required.every(tok => norm.includes(tok));
  });
}

function markLowest(items: PriceCompareItem[]): PriceCompareItem[] {
  if (!items.length) return items;
  const min = Math.min(...items.map(i => i.price));
  return items.map(i => ({ ...i, isLowest: i.price === min }));
}

/** 쇼핑몰별 최저가 — 몰당 1건, 가격 오름차순 */
function buildMallLowest(items: NaverShopItem[]): PriceCompareItem[] {
  const byMall = new Map<string, PriceCompareItem>();
  for (const raw of items) {
    const mall = (raw.mallName || '').trim() || '네이버';
    const price = parsePrice(raw.lprice);
    if (price <= 0) continue;
    const prev = byMall.get(mall);
    if (!prev || price < prev.price) {
      byMall.set(mall, {
        name: mall,
        price,
        npay: hasNpay(stripHtml(raw.title)),
        url: raw.link,
      });
    }
  }
  return markLowest([...byMall.values()].sort((a, b) => a.price - b.price).slice(0, 8));
}

/**
 * 브랜드 카탈로그 — brand/maker·스마트스토어성 판매처
 * (오픈마켓 몰명만 있는 건 쇼핑몰별 최저가에 두고 여기선 제외)
 */
function buildBrandCatalog(items: NaverShopItem[]): PriceCompareItem[] {
  const bySeller = new Map<string, PriceCompareItem>();
  for (const raw of items) {
    const brand = (raw.brand || raw.maker || '').trim();
    const mall = (raw.mallName || '').trim();
    const seller = brand || mall;
    if (!seller) continue;
    if (!brand && OPEN_MALLS.some(m => mall.includes(m))) continue;

    const price = parsePrice(raw.lprice);
    if (price <= 0) continue;
    const prev = bySeller.get(seller);
    if (!prev || price < prev.price) {
      bySeller.set(seller, {
        name: seller,
        price,
        npay: hasNpay(stripHtml(raw.title)),
        url: raw.link,
      });
    }
  }
  return markLowest([...bySeller.values()].sort((a, b) => a.price - b.price).slice(0, 8));
}

async function searchNaverShop(
  query: string,
  clientId: string,
  clientSecret: string,
  limit: number,
  sort: 'asc' | 'sim' = 'sim',
): Promise<{ items: NaverShopItem[]; total: number }> {
  const url = new URL('https://openapi.naver.com/v1/search/shop.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(Math.min(limit, 100)));
  url.searchParams.set('sort', sort);

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`naver_api:${res.status}:${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as NaverShopResponse;
  if (data.errorMessage) throw new Error(`naver_api:${data.errorMessage}`);

  return { items: data.items ?? [], total: data.total ?? 0 };
}

function listingBadge(title: string, mall: string, isFirstMatch: boolean): string | undefined {
  if (isFirstMatch) return '바로 이 제품!';
  const m = mall.toLowerCase();
  if (m.includes('쿠팡')) return '쿠팡 특가 바로가기';
  return undefined;
}

/** 네이버쇼핑 검색 결과 목록 (관련도순) */
export async function fetchNaverShopListings(
  keyword: string,
  productName: string,
  limit = 10,
): Promise<{ listings: NaverShopListing[]; total: number; compareUrl: string }> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  const query = (keyword || productName).trim();
  const targetName = (productName || keyword).trim();

  if (!clientId || !clientSecret) {
    throw new Error('naver_keys_missing');
  }

  const { items, total } = await searchNaverShop(query, clientId, clientSecret, limit, 'sim');
  const compareUrl = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;

  const listings: NaverShopListing[] = items.slice(0, limit).map((raw, idx) => {
    const title = stripHtml(raw.title);
    const mall = (raw.mallName || '').trim() || '네이버쇼핑';
    const matches = isSameProductTitle(title, targetName, keyword);
    return {
      title,
      price: parsePrice(raw.lprice),
      mallName: mall,
      url: raw.link,
      badge: listingBadge(title, mall, idx === 0 && matches),
      isAd: idx < 2,
    };
  });

  return { listings, total, compareUrl };
}

/**
 * 네이버쇼핑 가격비교 정보
 * — 동일 상품명만 모아 쇼핑몰별 최저가 / 브랜드 카탈로그로 표출
 */
export async function fetchNaverPriceCompare(
  keyword: string,
  productName: string,
  limit = 100,
): Promise<NaverPriceCompareResult> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('naver_keys_missing');
  }

  const targetName = (productName || keyword).trim();

  // 관련도순 + 가격순 결과를 합쳐 동일상품 매칭 풀 확보
  const [bySim, byPrice] = await Promise.all([
    searchNaverShop(targetName, clientId, clientSecret, limit, 'sim'),
    searchNaverShop(targetName, clientId, clientSecret, limit, 'asc'),
  ]);

  const seen = new Set<string>();
  const items: NaverShopItem[] = [];
  for (const it of [...bySim.items, ...byPrice.items]) {
    const key = it.productId || it.link;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(it);
  }

  const sameName = items.filter(it =>
    isSameProductTitle(stripHtml(it.title), targetName, keyword),
  );

  if (!sameName.length) {
    return {
      priceCompare: {
        productName: targetName,
        mallLowest: [],
        brandCatalog: [],
        compareUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(targetName)}`,
      },
      totalProducts: 0,
      source: 'naver',
    };
  }

  const canonical = pickCanonicalTitle(sameName, targetName);
  const exact = filterExactProduct(sameName, canonical, targetName);
  const pool = exact.length ? exact : sameName;

  const mallLowest = buildMallLowest(pool);
  const brandCatalog = buildBrandCatalog(pool);
  const allPrices = [...mallLowest, ...brandCatalog].map(i => i.price);
  const lowestPrice = allPrices.length ? Math.min(...allPrices) : undefined;

  return {
    priceCompare: {
      productName: canonical,
      lowestPrice,
      mallLowest,
      brandCatalog,
      compareUrl: `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(canonical)}`,
    },
    totalProducts: pool.length,
    source: 'naver',
  };
}
