// Find useKeywordSearchMutation and getKeywordStat API paths
const html = await (await fetch('https://itemscout.io/keyword', {
  headers: { 'User-Agent': 'Mozilla/5.0' },
})).text();
const scripts = [...html.matchAll(/src="([^"]+)"/g)].map(x => x[1]).filter(s => s.includes('/_next/static/chunks/'));

for (const src of scripts) {
  const js = await (await fetch(`https://itemscout.io${src}`)).text();
  if (js.includes('useKeywordSearchMutation') || js.includes('getKeywordStat') || js.includes('keyword/search')) {
    const hits = [];
    for (const re of [
      /useKeywordSearchMutation[^]{0,400}/g,
      /getKeywordStat[^]{0,300}/g,
      /v2\/keyword[^"'`]{0,80}/g,
      /API\.(get|post)\([^)]{0,120}/g,
      /mutationFn:[^,]{0,200}/g,
    ]) {
      for (const m of js.matchAll(re)) hits.push(m[0].slice(0, 250));
    }
    if (hits.length) {
      console.log('\n==', src);
      console.log([...new Set(hits)].slice(0, 40).join('\n---\n'));
    }
  }
}
