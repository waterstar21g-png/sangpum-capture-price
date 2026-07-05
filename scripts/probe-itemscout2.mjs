import fs from 'fs';

const t = fs.readFileSync('itemscout-page.html', 'utf8');
console.log('len', t.length);
console.log('sample', t.slice(0, 500));

const scripts = [...t.matchAll(/src="([^"]+)"/g)].map(x => x[1]);
console.log('scripts\n', scripts.join('\n'));

// Try data-api patterns in JS chunks
const chunkUrls = scripts.filter(s => s.includes('/_next/') || s.includes('.js'));
for (const src of chunkUrls.slice(0, 5)) {
  const url = src.startsWith('http') ? src : `https://itemscout.io${src}`;
  try {
    const r = await fetch(url);
    const js = await r.text();
    const hits = [...js.matchAll(/https?:\/\/[^"'`\s]+/g)]
      .map(m => m[0])
      .filter(u => /api|itemscout|keyword|stats/i.test(u));
    if (hits.length) console.log('from', src, [...new Set(hits)].slice(0, 20));
    const pathHits = [...js.matchAll(/["'`](\/api\/[^"'`]+)["'`]/g)].map(m => m[1]);
    if (pathHits.length) console.log('paths', src, [...new Set(pathHits)].slice(0, 30));
  } catch (e) {
    console.log('chunk err', src, e.message);
  }
}
