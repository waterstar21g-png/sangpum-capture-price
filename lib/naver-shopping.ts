import type { PriceListing } from '@/lib/itemscout/types';

interface NaverShopItem {
  title: string;
  link: string;
  lprice: string;
  mallName: string;
}

interface NaverShopResponse {
  total?: number;
  items?: NaverShopItem[];
  errorMessage?: string;
}

export interface NaverPriceResult {
  prices: PriceListing[];
  totalProducts: number;
  source: 'naver';
}

/** 네이버 쇼핑 검색 Open API — developers.naver.com 무료 발급 */
export async function fetchNaverLowestPrices(
  keyword: string,
  limit = 10,
): Promise<NaverPriceResult> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('naver_keys_missing');
  }

  const url = new URL('https://openapi.naver.com/v1/search/shop.json');
  url.searchParams.set('query', keyword);
  url.searchParams.set('display', String(Math.min(limit, 100)));
  url.searchParams.set('sort', 'asc');

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

  const items = (data.items ?? [])
    .map(item => ({
      price: Number(item.lprice.replace(/,/g, '')),
      productName: stripHtml(item.title),
      mallName: item.mallName || '네이버쇼핑',
      url: item.link,
    }))
    .filter(item => item.price > 0)
    .sort((a, b) => a.price - b.price)
    .slice(0, limit)
    .map((item, i) => ({
      rank: i + 1,
      productName: item.productName,
      price: item.price,
      mallName: item.mallName,
      url: item.url,
    }));

  return {
    prices: items,
    totalProducts: data.total ?? items.length,
    source: 'naver',
  };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}
