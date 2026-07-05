const name = '고려홍삼정 골드 240g';
const enc = encodeURIComponent(name);
const urls = [
  `https://itemscout.io/keyword?keyword=${enc}`,
  `https://itemscout.io/keyword?q=${enc}`,
  `https://itemscout.io/keyword?query=${enc}`,
  `https://itemscout.io/keyword?search=${enc}`,
  `https://itemscout.io/keyword?keywordName=${enc}`,
  `https://itemscout.io/?keyword=${enc}`,
];

for (const url of urls) {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
    redirect: 'follow',
  });
  const t = await r.text();
  const hasName = t.includes('고려홍삼정') || t.includes(enc) || t.includes('240g');
  const inputVals = [...t.matchAll(/value="([^"]*)"/g)].map(m => m[1]).filter(Boolean).slice(0, 10);
  const placeholders = [...t.matchAll(/placeholder="([^"]*)"/g)].map(m => m[1]).slice(0, 5);
  console.log('\n', r.status, url);
  console.log(' hasNameInHtml', hasName);
  console.log(' values', inputVals);
  console.log(' placeholders', placeholders);
  // search for query param usage in inline scripts
  const hits = ['keyword=', 'searchParams', 'useSearchParams', 'query=', 'defaultValue']
    .map(k => [k, t.includes(k)]);
  console.log(' markers', hits.filter(([, v]) => v).map(([k]) => k));
}
