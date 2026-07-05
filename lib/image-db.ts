import { put, list } from '@vercel/blob';
import { promises as fs } from 'fs';
import path from 'path';
import { IMAGE_RETENTION_SEC } from '@/lib/search-session';

export interface StoredSearchImage {
  id: string;
  sessionId: string;
  imageUrl: string;
  productName: string;
  keyword: string;
  hint?: string;
  searchedAt: string;
  expiresAt: string;
}

const DEV_DATA_ROOT = path.join(process.cwd(), '.data', 'search-images');

function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const m = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!m) throw new Error('invalid_image_data_url');
  return Buffer.from(m[1], 'base64');
}

function metaPath(sessionId: string, id: string): string {
  return `search-images/${sessionId}/${id}.json`;
}

function imagePath(sessionId: string, id: string): string {
  return `search-images/${sessionId}/${id}.jpg`;
}

async function saveDevRecord(
  sessionId: string,
  id: string,
  imageBuffer: Buffer,
  meta: StoredSearchImage,
): Promise<StoredSearchImage> {
  const dir = path.join(DEV_DATA_ROOT, sessionId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${id}.jpg`), imageBuffer);
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify(meta));
  return { ...meta, imageUrl: `/api/search-images?id=${id}` };
}

async function listDevRecords(sessionId: string): Promise<StoredSearchImage[]> {
  const dir = path.join(DEV_DATA_ROOT, sessionId);
  try {
    const files = await fs.readdir(dir);
    const records: StoredSearchImage[] = [];
    const now = Date.now();
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const raw = await fs.readFile(path.join(dir, file), 'utf8');
      const meta = JSON.parse(raw) as StoredSearchImage;
      if (new Date(meta.expiresAt).getTime() <= now) continue;
      records.push({ ...meta, imageUrl: `/api/search-images?id=${meta.id}` });
    }
    return records.sort((a, b) => b.searchedAt.localeCompare(a.searchedAt));
  } catch {
    return [];
  }
}

export async function getDevImageFile(
  sessionId: string,
  id: string,
): Promise<{ buffer: Buffer; meta: StoredSearchImage } | null> {
  const metaPathFs = path.join(DEV_DATA_ROOT, sessionId, `${id}.json`);
  const imgPathFs = path.join(DEV_DATA_ROOT, sessionId, `${id}.jpg`);
  try {
    const [metaRaw, buffer] = await Promise.all([
      fs.readFile(metaPathFs, 'utf8'),
      fs.readFile(imgPathFs),
    ]);
    const meta = JSON.parse(metaRaw) as StoredSearchImage;
    if (new Date(meta.expiresAt).getTime() <= Date.now()) return null;
    return { buffer, meta };
  } catch {
    return null;
  }
}

export async function saveSearchImage(params: {
  sessionId: string;
  imageDataUrl: string;
  productName: string;
  keyword: string;
  hint?: string;
}): Promise<StoredSearchImage | null> {
  const id = crypto.randomUUID();
  const searchedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + IMAGE_RETENTION_SEC * 1000).toISOString();
  const imageBuffer = dataUrlToBuffer(params.imageDataUrl);

  const baseMeta: StoredSearchImage = {
    id,
    sessionId: params.sessionId,
    imageUrl: '',
    productName: params.productName.trim(),
    keyword: params.keyword.trim() || params.productName.trim(),
    hint: params.hint?.trim() || undefined,
    searchedAt,
    expiresAt,
  };

  if (blobEnabled()) {
    const [imageBlob] = await Promise.all([
      put(imagePath(params.sessionId, id), imageBuffer, {
        access: 'public',
        contentType: 'image/jpeg',
        addRandomSuffix: false,
      }),
      put(metaPath(params.sessionId, id), JSON.stringify(baseMeta), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      }),
    ]);
    return { ...baseMeta, imageUrl: imageBlob.url };
  }

  if (process.env.NODE_ENV === 'development') {
    return saveDevRecord(params.sessionId, id, imageBuffer, baseMeta);
  }

  return null;
}

export async function listSessionSearchImages(sessionId: string): Promise<StoredSearchImage[]> {
  const now = Date.now();

  if (blobEnabled()) {
    const prefix = `search-images/${sessionId}/`;
    const { blobs } = await list({ prefix });
    const records: StoredSearchImage[] = [];
    for (const blob of blobs) {
      if (!blob.pathname.endsWith('.json')) continue;
      try {
        const res = await fetch(blob.url, { cache: 'no-store' });
        if (!res.ok) continue;
        const meta = (await res.json()) as StoredSearchImage;
        if (new Date(meta.expiresAt).getTime() <= now) continue;
        const imageBlob = blobs.find(b => b.pathname === imagePath(sessionId, meta.id));
        records.push({ ...meta, imageUrl: imageBlob?.url ?? meta.imageUrl });
      } catch {
        /* skip */
      }
    }
    return records.sort((a, b) => b.searchedAt.localeCompare(a.searchedAt));
  }

  if (process.env.NODE_ENV === 'development') {
    return listDevRecords(sessionId);
  }

  return [];
}
