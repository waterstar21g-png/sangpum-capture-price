import { NextRequest, NextResponse } from 'next/server';
import { fetchNaverShopListings } from '@/lib/naver-shopping';
import { clipItemscoutKeyword, resolveItemscoutKeywordId } from '@/lib/itemscout/resolve-keyword';

export const dynamic = 'force-dynamic';

/** 네이버쇼핑 바로가기 — 아이템스카우트 키워드 + 네이버 상품 목록 */
export async function GET(req: NextRequest) {
  const keyword = (req.nextUrl.searchParams.get('keyword') ?? '').trim();
  const productName = (req.nextUrl.searchParams.get('productName') ?? '').trim();
  const productCount = Number(req.nextUrl.searchParams.get('productCount') ?? '');
  const monthlySearches = Number(req.nextUrl.searchParams.get('monthlySearches') ?? '');
  const intensity = Number(req.nextUrl.searchParams.get('intensity') ?? '');

  const q = keyword || productName;
  if (!q) {
    return NextResponse.json({ ok: false, message: '키워드가 없습니다.' }, { status: 400 });
  }

  try {
    const clip = clipItemscoutKeyword(keyword || productName);
    const itemscoutId = await resolveItemscoutKeywordId(clip);

    const naver = await fetchNaverShopListings(keyword, productName, 8);

    const pc = Number.isFinite(productCount) ? productCount : undefined;
    const ms = Number.isFinite(monthlySearches) ? monthlySearches : undefined;
    const int =
      Number.isFinite(intensity) && intensity >= 0
        ? intensity
        : pc != null && ms != null && ms > 0
          ? Math.round((pc / ms) * 100) / 100
          : undefined;

    return NextResponse.json({
      ok: true,
      itemscout: {
        keyword: clip,
        keywordId: itemscoutId,
        productCount: pc ?? naver.total,
        monthlySearches: ms ?? 0,
        intensity: int ?? 0,
        intensityLabel: intensityLabel(int ?? 0),
        analyzeUrl: itemscoutId
          ? `https://itemscout.io/keyword/${itemscoutId}`
          : 'https://itemscout.io/keyword',
      },
      naver,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch_failed';
    return NextResponse.json({ ok: false, message: msg }, { status: 502 });
  }
}

function intensityLabel(ratio: number): string {
  if (ratio <= 0.1) return '아주좋음';
  if (ratio <= 0.4) return '좋음';
  if (ratio <= 1) return '보통';
  if (ratio <= 2) return '나쁨';
  return '아주나쁨';
}
