const kw = encodeURIComponent('홍삼정');
const r = await fetch('https://itemscout.io/keyword/' + kw, {
  headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
});
const t = await r.text();
const fs = await import('fs');
fs.writeFileSync('itemscout-page.html', t);

const nextMatch = t.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
if (nextMatch) {
  const data = JSON.parse(nextMatch[1]);
  fs.writeFileSync('itemscout-next.json', JSON.stringify(data, null, 2));
  console.log('NEXT_DATA keys', Object.keys(data));
  console.log('page props keys', Object.keys(data.props?.pageProps ?? {}));
} else {
  console.log('no NEXT_DATA');
}

const buildId = t.match(/"buildId":"([^"]+)"/);
console.log('buildId', buildId?.[1]);

// try common internal APIs
const candidates = [
  `https://api.itemscout.io/api/v1/keyword?keyword=${kw}`,
  `https://api.itemscout.io/api/keyword/${kw}`,
  `https://itemscout.io/api/keyword?keyword=${kw}`,
  `https://itemscout.io/api/v2/keyword/stats?keyword=${kw}`,
  `https://api.itemscout.io/keyword/stats?keyword=${kw}`,
];

for (const url of candidates) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
        Referer: 'https://itemscout.io/',
      },
    });
    const body = await res.text();
    console.log(res.status, url, body.slice(0, 200));
  } catch (e) {
    console.log('ERR', url, e.message);
  }
}
