const src = '/_next/static/chunks/453nz5qt_j217.js';
const js = await (await fetch(`https://itemscout.io${src}`)).text();

// Find the search submit function and initial state
const needles = [
  '검색어를 입력해주세요',
  'onSuccess:t=>{if(!t)throw Error("keywordId is not exist")',
  'useState',
  'useSearchParams',
  'useEffect',
  'mutationFn',
];

// dump a large window around the placeholder
const i = js.indexOf('검색어를 입력해주세요');
console.log(js.slice(Math.max(0, i - 2000), i + 800));

console.log('\n\n==== mutation area ====');
const j = js.indexOf('keywordId is not exist');
console.log(js.slice(Math.max(0, j - 1500), j + 500));
