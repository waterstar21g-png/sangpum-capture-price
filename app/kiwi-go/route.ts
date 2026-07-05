import { NextRequest, NextResponse } from 'next/server';
import { isAllowedKiwiGoTarget } from '@/lib/kiwi-go';

/** Kiwi가 연 https 주소 → itemscout로 즉시 302 (앱 가로채기 우회) */
export function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u');
  if (!u || !isAllowedKiwiGoTarget(u)) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  return NextResponse.redirect(u);
}
