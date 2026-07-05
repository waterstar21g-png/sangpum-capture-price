import { NextRequest, NextResponse } from 'next/server';
import {
  getServerProductImage,
  isServerDbConfigured,
  saveServerProductImage,
} from '@/lib/server-db';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function parseDataUrlSize(dataUrl: string): number | null {
  const m = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!m) return null;
  return Math.ceil((m[1].length * 3) / 4);
}

function badDb() {
  return NextResponse.json({ ok: false, code: 'db_unconfigured' }, { status: 503 });
}

export async function GET(req: NextRequest) {
  if (!isServerDbConfigured()) return badDb();
  const deviceId = req.nextUrl.searchParams.get('deviceId')?.trim();
  const productName = req.nextUrl.searchParams.get('productName')?.trim();
  if (!deviceId || !productName) {
    return NextResponse.json({ ok: false, code: 'invalid_query' }, { status: 400 });
  }
  try {
    const imageDataUrl = await getServerProductImage(deviceId, productName);
    return NextResponse.json({ ok: true, imageDataUrl });
  } catch (e) {
    console.error('[api/db/images] GET', e);
    return NextResponse.json({ ok: false, code: 'db_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isServerDbConfigured()) return badDb();
  let body: { deviceId?: string; productName?: string; imageDataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json' }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim();
  const productName = body.productName?.trim();
  const imageDataUrl = body.imageDataUrl?.trim();
  if (!deviceId || !productName || !imageDataUrl) {
    return NextResponse.json({ ok: false, code: 'invalid_body' }, { status: 400 });
  }

  const bytes = parseDataUrlSize(imageDataUrl);
  if (bytes == null) {
    return NextResponse.json({ ok: false, code: 'invalid_image' }, { status: 400 });
  }
  if (bytes > MAX_IMAGE_BYTES) {
    return NextResponse.json({ ok: false, code: 'image_too_large' }, { status: 413 });
  }

  try {
    await saveServerProductImage(deviceId, productName, imageDataUrl);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/db/images] POST', e);
    return NextResponse.json({ ok: false, code: 'db_error' }, { status: 500 });
  }
}
