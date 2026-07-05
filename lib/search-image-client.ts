import type { SearchHistoryEntry } from '@/lib/input-history';

export interface PersistedSearchImage {
  imageId: string;
  imageUrl: string;
  expiresAt?: string;
}

/** 세션 만료 전 이미지를 서버 DB에 저장 */
export async function persistSearchImageToDb(params: {
  imageDataUrl: string;
  productName: string;
  keyword: string;
  hint?: string;
}): Promise<PersistedSearchImage | null> {
  try {
    const res = await fetch('/api/search-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.ok || !data.imageId || !data.imageUrl) return null;
    return {
      imageId: data.imageId as string,
      imageUrl: data.imageUrl as string,
      expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : undefined,
    };
  } catch {
    return null;
  }
}

/** 세션 DB에서 이미지 목록 조회 — localStorage 이력과 병합 */
export async function fetchSessionSearchImages(): Promise<SearchHistoryEntry[]> {
  try {
    const res = await fetch('/api/search-images', { cache: 'no-store' });
    const data = await res.json();
    if (!data.ok || !Array.isArray(data.items)) return [];
    return data.items.map((item: Record<string, unknown>) => ({
      keyword: String(item.keyword ?? item.productName ?? ''),
      productName: String(item.productName ?? item.keyword ?? ''),
      hint: typeof item.hint === 'string' ? item.hint : undefined,
      imageId: typeof item.id === 'string' ? item.id : undefined,
      imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
      searchedAt: typeof item.searchedAt === 'string' ? item.searchedAt : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export function entryImageSrc(entry: Pick<SearchHistoryEntry, 'imageUrl' | 'imageThumb'>): string | undefined {
  return entry.imageUrl || entry.imageThumb;
}
