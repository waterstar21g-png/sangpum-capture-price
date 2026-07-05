import fs from 'fs';

const t = fs.readFileSync('itemscout-page.html', 'utf8');
const scripts = [...t.matchAll(/src="([^"]+)"/g)]
  .map(x => x[1])
  .filter(s => s.includes('/_next/static/chunks/'));

for (const src of scripts) {
  const url = `https://itemscout.io${src}`;
  const js = await (await fetch(url)).text();
  const interesting = [];
  for (const re of [
    /api\.itemscout\.io[^"'`\s]*/g,
    /["'`][A-Za-z]*[Kk]eyword[A-Za-z/._-]*["'`]/g,
    /["'`][^"'`]*(competition|productCnt|searchCnt|prd_cnt|srch)[^"'`]*["'`]/g,
    /baseURL[^,]{0,80}/g,
    /graphql[^"'`]{0,40}/g,
  ]) {
    for (const m of js.matchAll(re)) interesting.push(m[0]);
  }
  if (interesting.length) {
    console.log('\n==', src);
    console.log([...new Set(interesting)].slice(0, 40).join('\n'));
  }
}
