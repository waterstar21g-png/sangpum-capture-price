import fs from 'fs';

const t = fs.readFileSync('itemscout-page.html', 'utf8');
const scripts = [...t.matchAll(/src="([^"]+)"/g)]
  .map(x => x[1])
  .filter(s => s.includes('/_next/static/chunks/'));

const patterns = [
  /searchParams\.get\(["'`]([^"'`]+)["'`]/g,
  /get\(["'`](keyword|q|query|search|keywordName|name)["'`]\)/g,
  /["'`](keyword|q|query|search)["'`]\s*[,)]/g,
  /redirectUrl[^"'`]{0,40}/g,
  /keyword\/\$\{/g,
  /\/keyword\//g,
];

for (const src of scripts) {
  const url = `https://itemscout.io${src}`;
  const js = await (await fetch(url)).text();
  const found = [];
  for (const re of patterns) {
    for (const m of js.matchAll(re)) found.push(m[0]);
  }
  // also look near "검색어를 입력"
  if (js.includes('검색어를 입력') || js.includes('placeholder')) {
    const idx = js.indexOf('검색어');
    if (idx >= 0) found.push('CTX:' + js.slice(Math.max(0, idx - 80), idx + 120));
  }
  if (found.length) {
    console.log('\n==', src);
    console.log([...new Set(found)].slice(0, 30).join('\n'));
  }
}
