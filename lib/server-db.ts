import postgres, { type Sql } from 'postgres';
import type { SearchHistoryEntry } from '@/lib/input-history';
import { productImageKey } from '@/lib/product-image-store';

const MAX_KEYWORDS = 50;

let sqlInstance: Sql | null = null;
let schemaReady = false;

export function isServerDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim());
}

function getSql(): Sql | null {
  if (!isServerDbConfigured()) return null;
  if (!sqlInstance) {
    const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL)!.trim();
    sqlInstance = postgres(url, {
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
      max: 1,
    });
  }
  return sqlInstance;
}

async function ensureSchema(sql: Sql): Promise<void> {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS sc_keywords (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      product_name TEXT NOT NULL,
      hint TEXT,
      searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS sc_keywords_device_time
    ON sc_keywords (device_id, searched_at DESC)
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sc_product_images (
      device_id TEXT NOT NULL,
      product_key TEXT NOT NULL,
      product_name TEXT NOT NULL,
      image_data TEXT NOT NULL,
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (device_id, product_key)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sc_app_sessions (
      device_id TEXT PRIMARY KEY,
      session_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  schemaReady = true;
}

export interface ServerKeywordRow {
  keyword: string;
  product_name: string;
  hint: string | null;
  searched_at: Date;
}

export async function listServerKeywords(deviceId: string): Promise<SearchHistoryEntry[]> {
  const sql = getSql();
  if (!sql || !deviceId) return [];
  await ensureSchema(sql);
  const rows = await sql<ServerKeywordRow[]>`
    SELECT keyword, product_name, hint, searched_at
    FROM sc_keywords
    WHERE device_id = ${deviceId}
    ORDER BY searched_at DESC
    LIMIT ${MAX_KEYWORDS}
  `;
  return rows.map(r => ({
    keyword: r.keyword,
    productName: r.product_name,
    hint: r.hint ?? undefined,
    searchedAt: r.searched_at.toISOString(),
  }));
}

export async function upsertServerKeyword(
  deviceId: string,
  entry: Pick<SearchHistoryEntry, 'keyword' | 'productName' | 'hint' | 'searchedAt'>,
): Promise<void> {
  const sql = getSql();
  if (!sql || !deviceId) return;
  await ensureSchema(sql);

  const productName = entry.productName.trim() || entry.keyword.trim();
  const keyword = entry.keyword.trim() || productName;
  if (!productName) return;

  const key = productImageKey(productName);
  await sql`
    DELETE FROM sc_keywords
    WHERE device_id = ${deviceId}
      AND lower(trim(product_name)) = ${key}
  `;
  await sql`
    INSERT INTO sc_keywords (device_id, keyword, product_name, hint, searched_at)
    VALUES (
      ${deviceId},
      ${keyword},
      ${productName},
      ${entry.hint?.trim() || null},
      ${entry.searchedAt}
    )
  `;
  await sql`
    DELETE FROM sc_keywords
    WHERE device_id = ${deviceId}
      AND id NOT IN (
        SELECT id FROM sc_keywords
        WHERE device_id = ${deviceId}
        ORDER BY searched_at DESC
        LIMIT ${MAX_KEYWORDS}
      )
  `;
}

export async function saveServerProductImage(
  deviceId: string,
  productName: string,
  imageData: string,
): Promise<void> {
  const sql = getSql();
  if (!sql || !deviceId) return;
  const name = productName.trim();
  if (!name || !imageData) return;
  await ensureSchema(sql);

  const key = productImageKey(name);
  await sql`
    INSERT INTO sc_product_images (device_id, product_key, product_name, image_data, saved_at)
    VALUES (${deviceId}, ${key}, ${name}, ${imageData}, NOW())
    ON CONFLICT (device_id, product_key)
    DO UPDATE SET
      product_name = EXCLUDED.product_name,
      image_data = EXCLUDED.image_data,
      saved_at = NOW()
  `;
}

export async function getServerProductImage(
  deviceId: string,
  productName: string,
): Promise<string | null> {
  const sql = getSql();
  if (!sql || !deviceId) return null;
  const name = productName.trim();
  if (!name) return null;
  await ensureSchema(sql);

  const key = productImageKey(name);
  const rows = await sql<{ image_data: string }[]>`
    SELECT image_data
    FROM sc_product_images
    WHERE device_id = ${deviceId} AND product_key = ${key}
    LIMIT 1
  `;
  return rows[0]?.image_data ?? null;
}

export async function saveServerAppSession(
  deviceId: string,
  session: unknown,
): Promise<void> {
  const sql = getSql();
  if (!sql || !deviceId) return;
  await ensureSchema(sql);
  await sql`
    INSERT INTO sc_app_sessions (device_id, session_json, updated_at)
    VALUES (${deviceId}, ${sql.json(session as postgres.JSONValue)}, NOW())
    ON CONFLICT (device_id)
    DO UPDATE SET session_json = EXCLUDED.session_json, updated_at = NOW()
  `;
}

export async function getServerAppSession<T>(deviceId: string): Promise<T | null> {
  const sql = getSql();
  if (!sql || !deviceId) return null;
  await ensureSchema(sql);
  const rows = await sql<{ session_json: T }[]>`
    SELECT session_json
    FROM sc_app_sessions
    WHERE device_id = ${deviceId}
    LIMIT 1
  `;
  return rows[0]?.session_json ?? null;
}

export async function clearServerAppSession(deviceId: string): Promise<void> {
  const sql = getSql();
  if (!sql || !deviceId) return;
  await ensureSchema(sql);
  await sql`DELETE FROM sc_app_sessions WHERE device_id = ${deviceId}`;
}

export { MAX_KEYWORDS as MAX_SERVER_KEYWORDS };
