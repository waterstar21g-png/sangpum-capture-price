const html = await (await fetch('https://itemscout.io/keyword', {
  headers: { 'User-Agent': 'Mozilla/5.0' },
})).text();
const scripts = [...html.matchAll(/src="([^"]+)"/g)].map(x => x[1]).filter(s => s.includes('/_next/'));

for (const src of scripts) {
  const js = await (await fetch(`https://itemscout.io${src}`)).text();
  // find setSearchKeyword calls with context
  let from = 0;
  while (true) {
    const i = js.indexOf('setSearchKeyword', from);
    if (i < 0) break;
    const ctx = js.slice(Math.max(0, i - 200), i + 200);
    if (/kid|pathname|params|keyword\/str|getKeyword/.test(ctx)) {
      console.log('\n==', src);
      console.log(ctx.replace(/\n/g, ' '));
    }
    from = i + 10;
  }
}
