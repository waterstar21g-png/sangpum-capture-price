import type { ProductScoutResult } from '@/lib/itemscout/types';
import { getDeviceId } from '@/lib/device-id';

const SESSION_KEY = 'sangpum-capture:app-session';

export interface AppSessionSnapshot {
  step: 'result';
  result: ProductScoutResult;
  visionInfo?: {
    confidence: number;
    keyword: string;
    productName: string;
    category?: string;
  } | null;
  manualKeyword: string;
  hint: string;
  savedAt: string;
}

function readLocalSession(): AppSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppSessionSnapshot;
    if (parsed?.step !== 'result' || !parsed.result?.productName) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocalSession(snapshot: AppSessionSnapshot | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!snapshot) {
      sessionStorage.removeItem(SESSION_KEY);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

async function fetchServerSession(): Promise<AppSessionSnapshot | null> {
  const deviceId = getDeviceId();
  if (!deviceId) return null;
  try {
    const res = await fetch(`/api/db/session?deviceId=${encodeURIComponent(deviceId)}`);
    const data = (await res.json()) as { ok: boolean; session?: AppSessionSnapshot | null };
    if (!res.ok || !data.ok || !data.session || data.session.step !== 'result') return null;
    return data.session;
  } catch {
    return null;
  }
}

async function pushServerSession(snapshot: AppSessionSnapshot): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await fetch('/api/db/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, session: snapshot }),
    });
  } catch {
    /* ignore */
  }
}

async function deleteServerSession(): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await fetch('/api/db/session', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    });
  } catch {
    /* ignore */
  }
}

/** 결과 화면 스냅샷 저장 (sessionStorage + 서버 DB) */
export async function saveAppSession(snapshot: AppSessionSnapshot): Promise<void> {
  writeLocalSession(snapshot);
  await pushServerSession(snapshot);
}

/** 로컬·서버에서 결과 화면 복원 */
export async function loadAppSession(): Promise<AppSessionSnapshot | null> {
  const local = readLocalSession();
  if (local) return local;
  const remote = await fetchServerSession();
  if (remote) writeLocalSession(remote);
  return remote;
}

export function clearAppSession(): void {
  writeLocalSession(null);
  void deleteServerSession();
}

export function buildAppSessionSnapshot(params: {
  result: ProductScoutResult;
  visionInfo?: AppSessionSnapshot['visionInfo'];
  manualKeyword: string;
  hint: string;
}): AppSessionSnapshot {
  return {
    step: 'result',
    result: params.result,
    visionInfo: params.visionInfo ?? null,
    manualKeyword: params.manualKeyword,
    hint: params.hint,
    savedAt: new Date().toISOString(),
  };
}
