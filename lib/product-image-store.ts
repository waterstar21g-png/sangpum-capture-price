/** 카메라·갤러리 상품 이미지 — 브라우저 IndexedDB 보관 (상품명 기준 조회) */

const DB_NAME = 'sangpum-capture-product-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';
const MAX_IMAGES = 50;

export interface ProductImageRecord {
  key: string;
  productName: string;
  dataUrl: string;
  savedAt: string;
}

export function productImageKey(productName: string): string {
  return productName.replace(/\s+/g, ' ').trim().toLowerCase();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexeddb_unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error('idb_open_failed'));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('idb_request_failed'));
  });
}

function idbTransactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('idb_tx_failed'));
    tx.onabort = () => reject(tx.error ?? new Error('idb_tx_aborted'));
  });
}

async function trimOldImages(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(STORE_NAME, 'readonly');
  const all = await idbRequest(tx.objectStore(STORE_NAME).getAll() as IDBRequest<ProductImageRecord[]>);
  await idbTransactionDone(tx);
  if (all.length <= MAX_IMAGES) return;

  const sorted = [...all].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const toDelete = sorted.slice(MAX_IMAGES);
  const delTx = db.transaction(STORE_NAME, 'readwrite');
  const store = delTx.objectStore(STORE_NAME);
  for (const rec of toDelete) {
    store.delete(rec.key);
  }
  await idbTransactionDone(delTx);
}

/** 분석 성공 상품명 기준으로 이미지 저장 (동일 상품명은 덮어씀) */
export async function saveProductImage(productName: string, dataUrl: string): Promise<void> {
  const name = productName.trim();
  if (!name || !dataUrl) return;

  try {
    const db = await openDb();
    const record: ProductImageRecord = {
      key: productImageKey(name),
      productName: name,
      dataUrl,
      savedAt: new Date().toISOString(),
    };
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await idbRequest(tx.objectStore(STORE_NAME).put(record));
    await idbTransactionDone(tx);
    await trimOldImages(db);
    db.close();
  } catch {
    /* 저장 실패 시 앱 흐름은 유지 */
  }
}

/** 검색 결과 상품명과 일치하는 저장 이미지 조회 */
export async function findProductImage(productName: string): Promise<string | null> {
  const name = productName.trim();
  if (!name) return null;

  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const record = await idbRequest(
      tx.objectStore(STORE_NAME).get(productImageKey(name)) as IDBRequest<ProductImageRecord | undefined>,
    );
    await idbTransactionDone(tx);
    db.close();
    return record?.dataUrl ?? null;
  } catch {
    return null;
  }
}

export { MAX_IMAGES };
