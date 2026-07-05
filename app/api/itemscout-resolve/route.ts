import { NextRequest, NextResponse } from 'next/server';
import {
  clipItemscoutKeyword,
  resolveItemscoutKeywordId,
} from '@/lib/itemscout/resolve-keyword';

export const dynamic = 'force-dynamic';

/** 상품명 → { keyword, id } JSON (클라이언트 바로가기용) */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('q') ?? '';
  const keyword = clipItemscoutKeyword(raw);
  if (!keyword) {
    return NextResponse.json({ ok: false, message: '상품명이 없습니다.' }, { status: 400 });
  }

  try {
    const id = await resolveItemscoutKeywordId(keyword);
    if (id == null) {
      return NextResponse.json({
        ok: false,
        keyword,
        message: '아이템스카우트에서 키워드 ID를 찾지 못했습니다.',
      });
    }
    return NextResponse.json({ ok: true, keyword, id });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        keyword,
        message: e instanceof Error ? e.message : 'resolve_failed',
      },
      { status: 502 },
    );
  }
}
