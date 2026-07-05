import { NextRequest, NextResponse } from 'next/server';
import {
  isServerDbConfigured,
  listServerKeywords,
  upsertServerKeyword,
} from '@/lib/server-db';

export const dynamic = 'force-dynamic';

function badDb() {
  return NextResponse.json({ ok: false, code: 'db_unconfigured' }, { status: 503 });
}

export async function GET(req: NextRequest) {
  if (!isServerDbConfigured()) return badDb();
  const deviceId = req.nextUrl.searchParams.get('deviceId')?.trim();
  if (!deviceId) {
    return NextResponse.json({ ok: false, code: 'missing_device' }, { status: 400 });
  }
  try {
    const keywords = await listServerKeywords(deviceId);
    return NextResponse.json({ ok: true, keywords });
  } catch (e) {
    console.error('[api/db/keywords] GET', e);
    return NextResponse.json({ ok: false, code: 'db_error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isServerDbConfigured()) return badDb();
  let body: {
    deviceId?: string;
    entry?: {
      keyword?: string;
      productName?: string;
      hint?: string;
      searchedAt?: string;
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json' }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim();
  const entry = body.entry;
  if (!deviceId || !entry?.productName?.trim()) {
    return NextResponse.json({ ok: false, code: 'invalid_body' }, { status: 400 });
  }

  try {
    await upsertServerKeyword(deviceId, {
      keyword: entry.keyword?.trim() || entry.productName!.trim(),
      productName: entry.productName!.trim(),
      hint: entry.hint?.trim() || undefined,
      searchedAt: entry.searchedAt || new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/db/keywords] POST', e);
    return NextResponse.json({ ok: false, code: 'db_error' }, { status: 500 });
  }
}
