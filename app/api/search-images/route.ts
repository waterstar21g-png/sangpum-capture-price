import { NextRequest, NextResponse } from 'next/server';
import {
  getDevImageFile,
  listSessionSearchImages,
  saveSearchImage,
} from '@/lib/image-db';
import { ensureSessionId } from '@/lib/search-session';

export const dynamic = 'force-dynamic';

/** 세션별 검색 이미지 목록 또는 단건 이미지 바이너리 */
export async function GET(req: NextRequest) {
  const sessionId = await ensureSessionId();
  const id = req.nextUrl.searchParams.get('id')?.trim();

  if (id) {
    const file = await getDevImageFile(sessionId, id);
    if (!file) {
      return NextResponse.json({ ok: false, code: 'not_found' }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  const items = await listSessionSearchImages(sessionId);
  return NextResponse.json({ ok: true, items });
}

/** 이미지 검색 직후 세션 만료 전 서버 DB에 썸네일 저장 */
export async function POST(req: NextRequest) {
  let body: {
    imageDataUrl?: string;
    productName?: string;
    keyword?: string;
    hint?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json' }, { status: 400 });
  }

  const imageDataUrl = body.imageDataUrl?.trim();
  const productName = body.productName?.trim();
  const keyword = body.keyword?.trim();
  if (!imageDataUrl?.startsWith('data:image/') || !productName) {
    return NextResponse.json(
      { ok: false, code: 'invalid_input', message: '이미지와 상품명이 필요합니다.' },
      { status: 400 },
    );
  }

  const sessionId = await ensureSessionId();
  try {
    const stored = await saveSearchImage({
      sessionId,
      imageDataUrl,
      productName,
      keyword: keyword || productName,
      hint: body.hint?.trim() || undefined,
    });
    if (!stored) {
      return NextResponse.json({
        ok: false,
        code: 'storage_unavailable',
        message: '이미지 DB가 설정되지 않았습니다. 로컬 캐시를 사용합니다.',
      });
    }
    return NextResponse.json({
      ok: true,
      imageId: stored.id,
      imageUrl: stored.imageUrl,
      expiresAt: stored.expiresAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'save_failed';
    console.error('[api/search-images] POST', msg);
    return NextResponse.json(
      { ok: false, code: 'save_failed', message: '이미지 저장에 실패했습니다.' },
      { status: 500 },
    );
  }
}
