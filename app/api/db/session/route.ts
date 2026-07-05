import { NextRequest, NextResponse } from 'next/server';
import {
  clearServerAppSession,
  getServerAppSession,
  isServerDbConfigured,
  saveServerAppSession,
} from '@/lib/server-db';
import type { AppSessionSnapshot } from '@/lib/app-session';

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
    const session = await getServerAppSession<AppSessionSnapshot>(deviceId);
    return NextResponse.json({ ok: true, session });
  } catch (e) {
    console.error('[api/db/session] GET', e);
    return NextResponse.json({ ok: false, code: 'db_error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isServerDbConfigured()) return badDb();
  let body: { deviceId?: string; session?: AppSessionSnapshot };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json' }, { status: 400 });
  }

  const deviceId = body.deviceId?.trim();
  const session = body.session;
  if (!deviceId || !session || session.step !== 'result' || !session.result?.productName) {
    return NextResponse.json({ ok: false, code: 'invalid_body' }, { status: 400 });
  }

  try {
    await saveServerAppSession(deviceId, session);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/db/session] PUT', e);
    return NextResponse.json({ ok: false, code: 'db_error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isServerDbConfigured()) return badDb();
  let body: { deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json' }, { status: 400 });
  }
  const deviceId = body.deviceId?.trim();
  if (!deviceId) {
    return NextResponse.json({ ok: false, code: 'missing_device' }, { status: 400 });
  }
  try {
    await clearServerAppSession(deviceId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[api/db/session] DELETE', e);
    return NextResponse.json({ ok: false, code: 'db_error' }, { status: 500 });
  }
}
