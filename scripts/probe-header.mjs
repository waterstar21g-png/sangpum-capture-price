const js = await (await fetch('https://itemscout.io/_next/static/chunks/453nz5qt_j217.js')).text();
const i = js.indexOf('KeywordHeader');
console.log(js.slice(i, i + 2500));
