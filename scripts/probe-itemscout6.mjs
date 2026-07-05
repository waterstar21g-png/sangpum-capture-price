const kw = encodeURIComponent('hongsam');
const urls = [
  'https://itemscout.io/keyword/%ED%99%8D%EC%82%BC%EC%A0%95',
];

for (const url of urls) {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'text/x-component',
    },
  });
  const t = await r.text();
  console.log(url, r.status, r.headers.get('content-type'), t.length);
  console.log(t.slice(0, 800));
}
