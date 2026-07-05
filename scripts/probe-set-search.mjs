const html = await (await fetch('https://itemscout.io/keyword', {
  headers: { 'User-Agent': 'Mozilla/5.0' },
})).text();
const scripts = [...html.matchAll(/src="([^"]+)"/g)].map(x => x[1]).filter(s => s.includes('/_next/'));

for (const src of scripts) {
  const js = await (await fetch(`https://itemscout.io${src}`)).text();
  if (js.includes('setSearchKeyword') || js.includes('searchKeyword')) {
    let from = 0;
    let n = 0;
    while (n < 8) {
      const i = js.indexOf('setSearchKeyword', from);
      const j = js.indexOf('searchKeyword', from);
      const idx = i >= 0 && (j < 0 || i <= j) ? i : j;
      if (idx < 0) break;
      console.log('\n', src, js.slice(Math.max(0, idx - 60), idx + 100).replace(/\n/g, ' '));
      from = idx + 10;
      n++;
    }
  }
}
