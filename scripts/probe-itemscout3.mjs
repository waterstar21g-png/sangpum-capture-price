import fs from 'fs';

const t = fs.readFileSync('itemscout-page.html', 'utf8');
const scripts = [...t.matchAll(/src="([^"]+)"/g)]
  .map(x => x[1])
  .filter(s => s.includes('/_next/static/chunks/'));

const pathHits = new Set();
const urlHits = new Set();

for (const src of scripts) {
  const url = src.startsWith('http') ? src : `https://itemscout.io${src}`;
  const r = await fetch(url);
  const js = await r.text();
  for (const m of js.matchAll(/["'`](\/api\/[^"'`]+)["'`]/g)) pathHits.add(m[1]);
  for (const m of js.matchAll(/["'`](https?:\/\/api\.itemscout\.io[^"'`]+)["'`]/g)) urlHits.add(m[1]);
  for (const m of js.matchAll(/keyword[^"'`]{0,40}/gi)) {
    if (m[0].length < 50) pathHits.add('kw:' + m[0]);
  }
  // competition related field names
  for (const key of [
    'competitionIntensity',
    'productCount',
    'searchCount',
    'monthlySearch',
    'competingProducts',
    'totalProducts',
    'prdCnt',
    'srchCnt',
  ]) {
    if (js.includes(key)) pathHits.add('field:' + key);
  }
}

console.log('paths', [...pathHits].filter(p => !p.startsWith('kw:')).slice(0, 80));
console.log('urls', [...urlHits].slice(0, 40));
console.log('kw samples', [...pathHits].filter(p => p.startsWith('kw:')).slice(0, 40));
console.log('fields', [...pathHits].filter(p => p.startsWith('field:')));
