const bases = [
  'https://api.itemscout.io/api/',
  'https://api.itemscout.io/',
];

const paths = [
  'keyword/search?query=홍삼정',
  'keyword/search?keyword=홍삼정',
  'keywords/search?q=홍삼정',
  'v1/keyword/search?keyword=홍삼정',
  'v2/keyword/search?keyword=홍삼정',
  'open/v1/keyword',
  'open/keyword',
  'public/keyword?keyword=홍삼정',
  'keyword?keyword=홍삼정',
  'keywords?keyword=홍삼정',
  'data/keyword?keyword=홍삼정',
];

for (const base of bases) {
  for (const path of paths) {
    const url = base + path;
    try {
      const isPost = path.includes('open/v1/keyword') && !path.includes('?');
      const r = await fetch(url, {
        method: isPost ? 'POST' : 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          Origin: 'https://itemscout.io',
          Referer: 'https://itemscout.io/',
        },
        body: isPost ? JSON.stringify({ keyword: '홍삼정' }) : undefined,
      });
      const t = await r.text();
      if (r.status !== 404) {
        console.log(r.status, url, t.slice(0, 250));
      }
    } catch (e) {
      console.log('ERR', url, e.message);
    }
  }
}

// Also try POST variants
const posts = [
  ['https://api.itemscout.io/api/keyword/search', { keyword: '홍삼정' }],
  ['https://api.itemscout.io/api/keyword/stats', { keyword: '홍삼정' }],
  ['https://api.itemscout.io/api/keywords/stats', { keyword: '홍삼정' }],
  ['https://api.itemscout.io/api/v1/keywords/stats', { keyword: '홍삼정' }],
  ['https://api.itemscout.io/api/v2/keywords/stats', { keyword: '홍삼정' }],
  ['https://api.itemscout.io/api/data/keyword', { keyword: '홍삼정' }],
];

for (const [url, body] of posts) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: 'https://itemscout.io',
        Referer: 'https://itemscout.io/',
      },
      body: JSON.stringify(body),
    });
    const t = await r.text();
    console.log('POST', r.status, url, t.slice(0, 300));
  } catch (e) {
    console.log('POST ERR', url, e.message);
  }
}
