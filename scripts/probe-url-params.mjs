const html = await (await fetch('https://itemscout.io/keyword', {
  headers: { 'User-Agent': 'Mozilla/5.0' },
})).text();
const scripts = [...html.matchAll(/src="([^"]+)"/g)].map(x => x[1]).filter(s => s.includes('/_next/'));

for (const src of scripts) {
  const js = await (await fetch(`https://itemscout.io${src}`)).text();
  if (/URLSearchParams|searchParams|useSearchParams|location\.search|window\.location/.test(js) && /keyword|searchKeyword/.test(js)) {
    const matches = [];
    for (const re of [
      /useSearchParams\([^)]*\)[^;]{0,200}/g,
      /URLSearchParams\([^)]*\)[^;]{0,200}/g,
      /location\.search[^;]{0,150}/g,
      /searchParams\.get\([^)]+\)/g,
      /\.get\([\"']q[\"']\)/g,
      /\.get\([\"']keyword[\"']\)/g,
    ]) {
      for (const m of js.matchAll(re)) matches.push(m[0]);
    }
    if (matches.length) {
      console.log('\n==', src);
      console.log([...new Set(matches)].join('\n'));
    }
  }
}
