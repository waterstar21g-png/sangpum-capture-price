#!/usr/bin/env node
/** .env.local DATABASE_URL 로 Vercel 프로덕션 배포 (VERCEL_TOKEN 필요) */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ENV_PATH = resolve(process.cwd(), '.env.local');
if (!existsSync(ENV_PATH)) {
  console.error('.env.local 없음 — npm run db:provision 먼저 실행');
  process.exit(1);
}

let databaseUrl = '';
for (const line of readFileSync(ENV_PATH, 'utf8').split('\n')) {
  const m = line.match(/^DATABASE_URL=(.*)$/);
  if (m) databaseUrl = m[1].replace(/^["']|["']$/g, '');
}
if (!databaseUrl) {
  console.error('.env.local 에 DATABASE_URL 없음');
  process.exit(1);
}

const token = process.env.VERCEL_TOKEN?.trim();
if (!token) {
  console.error('VERCEL_TOKEN 환경변수가 필요합니다.');
  process.exit(1);
}

const scope = process.env.VERCEL_SCOPE || 'nutrifarmer-front';

spawnSync('node', ['scripts/setup-server-db.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: databaseUrl, POSTGRES_URL: databaseUrl },
});

const deploy = spawnSync(
  'npx',
  ['vercel', '--prod', '--yes', '--scope', scope, '--token', token],
  { stdio: 'inherit', cwd: process.cwd() },
);
process.exit(deploy.status ?? 1);
