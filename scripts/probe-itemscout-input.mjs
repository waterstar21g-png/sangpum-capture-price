const r = await fetch('https://itemscout.io/keyword', {
  headers: { 'User-Agent': 'Mozilla/5.0' },
});
const html = await r.text();
const scripts = [...html.matchAll(/src="([^"]+)"/g)]
  .map(x => x[1])
  .filter(s => s.includes('/_next/static/chunks/'));

for (const src of scripts) {
  const js = await (await fetch(`https://itemscout.io${src}`)).text();
  if (
    js.includes('검색어를 입력') ||
    js.includes('키워드 분석') ||
    js.includes('/keyword/') ||
    js.includes('keywordId')
  ) {
    console.log('\n==', src, 'len', js.length);
    // extract snippets
    for (const needle of ['검색어를 입력', 'keywordId', '/keyword/', 'searchParams', 'useParams', 'router.push']) {
      let from = 0;
      let n = 0;
      while (n < 3) {
        const i = js.indexOf(needle, from);
        if (i < 0) break;
        console.log('---', needle, '---');
        console.log(js.slice(Math.max(0, i - 100), i + 150).replace(/\n/g, ' '));
        from = i + needle.length;
        n++;
      }
    }
  }
}
