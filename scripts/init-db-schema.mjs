#!/usr/bin/env node
/** PostgreSQL 스키마 초기화 — DATABASE_URL 또는 POSTGRES_URL 필요 */

import postgres from 'postgres';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

loadEnvLocal();

const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
if (!url) {
  console.error('DATABASE_URL 또는 POSTGRES_URL이 필요합니다. npm run db:provision 을 먼저 실행하세요.');
  process.exit(1);
}

const sql = postgres(url, {
  ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : 'require',
  max: 1,
});

try {
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
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'sc_%'
    ORDER BY table_name
  `;
  console.log('DB 스키마 준비 완료:', tables.map(t => t.table_name).join(', '));
} catch (e) {
  console.error('DB 초기화 실패:', e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
