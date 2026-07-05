#!/usr/bin/env node
/**
 * Neon Claimable Postgres 프로비저닝 + .env.local 작성 + 스키마 초기화
 * Vercel 배포 시 VERCEL_TOKEN 환경변수가 있으면 DATABASE_URL을 프로덕션에 등록
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ENV_PATH = resolve(process.cwd(), '.env.local');
const REF = 'sangpum-capture-price';

async function provisionNeon() {
  const res = await fetch('https://neon.new/api/v1/database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: REF }),
  });
  if (!res.ok) {
    throw new Error(`Neon provision failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const connectionString = data.connection_string || data.databaseUrl;
  if (!connectionString) throw new Error('Neon 응답에 connection_string 없음');
  return {
    connectionString,
    claimUrl: data.claim_url,
    expiresAt: data.expires_at,
    projectId: data.neon_project_id,
  };
}

function mergeEnvLocal(connectionString) {
  const lines = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8').split('\n') : [];
  const map = new Map();
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) map.set(m[1], m[2]);
  }
  map.set('DATABASE_URL', connectionString);
  map.set('POSTGRES_URL', connectionString);
  const out = [...map.entries()].map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  writeFileSync(ENV_PATH, out, 'utf8');
}

function pushVercelEnv(connectionString) {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.log('VERCEL_TOKEN 없음 — Vercel 대시보드에서 DATABASE_URL을 수동 등록하세요.');
    return false;
  }
  const scope = process.env.VERCEL_SCOPE || 'nutrifarmer-front';
  const project = process.env.VERCEL_PROJECT || 'sangpum-capture-price';
  for (const target of ['production', 'preview', 'development']) {
    spawnSync(
      'npx',
      ['vercel', 'env', 'rm', 'DATABASE_URL', target, '--yes', '--token', token, '--scope', scope],
      { stdio: 'ignore' },
    );
    const add = spawnSync(
      'npx',
      [
        'vercel', 'env', 'add', 'DATABASE_URL', target,
        '--token', token, '--scope', scope, '--force',
      ],
      { input: connectionString, encoding: 'utf8' },
    );
    if (add.status !== 0) {
      console.warn(`Vercel env add (${target}) 실패:`, add.stderr || add.stdout);
      return false;
    }
  }
  console.log(`Vercel 프로젝트 ${scope}/${project} 에 DATABASE_URL 등록 완료`);
  return true;
}

const existing = (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').trim();
let connectionString = existing;
let claimUrl;
let expiresAt;

if (!connectionString) {
  console.log('Neon PostgreSQL 프로비저닝 중...');
  const neon = await provisionNeon();
  connectionString = neon.connectionString;
  claimUrl = neon.claimUrl;
  expiresAt = neon.expiresAt;
  console.log('Neon DB 생성:', neon.projectId);
} else {
  console.log('기존 DATABASE_URL 사용');
}

mergeEnvLocal(connectionString);
console.log('.env.local 업데이트:', ENV_PATH);

const init = spawnSync('node', ['scripts/init-db-schema.mjs'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: connectionString, POSTGRES_URL: connectionString },
});
if (init.status !== 0) process.exit(init.status ?? 1);

pushVercelEnv(connectionString);

if (claimUrl) {
  console.log('\n※ Neon DB를 영구 보관하려면 72시간 내 계정에 연결(claim)하세요:');
  console.log(claimUrl);
  if (expiresAt) console.log('만료:', expiresAt);
}

console.log('\n완료 — npm run dev 로 서버 DB 연동 개발 서버를 실행할 수 있습니다.');
