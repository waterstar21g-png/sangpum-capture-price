import type { SearchHistoryEntry } from '@/lib/input-history';
import { getDeviceId } from '@/lib/device-id';

export async function fetchServerKeywords(): Promise<SearchHistoryEntry[] | null> {
  const deviceId = getDeviceId();
  if (!deviceId) return null;
  try {
    const res = await fetch(`/api/db/keywords?deviceId=${encodeURIComponent(deviceId)}`);
    const data = (await res.json()) as {
      ok: boolean;
      code?: string;
      keywords?: SearchHistoryEntry[];
    };
    if (!res.ok || !data.ok) return data.code === 'db_unconfigured' ? null : [];
    return data.keywords ?? [];
  } catch {
    return null;
  }
}

export async function pushServerKeyword(entry: SearchHistoryEntry): Promise<void> {
  const deviceId = getDeviceId();
  if (!deviceId) return;
  try {
    await fetch('/api/db/keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, entry }),
    });
  } catch {
    /* ignore */
  }
}

export async function saveServerProductImageClient(
  productName: string,
  imageDataUrl: string,
): Promise<boolean> {
  const deviceId = getDeviceId();
  if (!deviceId) return false;
  try {
    const res = await fetch('/api/db/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, productName, imageDataUrl }),
    });
    const data = (await res.json()) as { ok: boolean };
    return res.ok && data.ok;
  } catch {
    return false;
  }
}

export async function fetchServerProductImage(productName: string): Promise<string | null> {
  const deviceId = getDeviceId();
  if (!deviceId) return null;
  try {
    const params = new URLSearchParams({
      deviceId,
      productName: productName.trim(),
    });
    const res = await fetch(`/api/db/images?${params}`);
    const data = (await res.json()) as { ok: boolean; imageDataUrl?: string | null };
    if (!res.ok || !data.ok || !data.imageDataUrl) return null;
    return data.imageDataUrl;
  } catch {
    return null;
  }
}
