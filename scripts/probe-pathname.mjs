const js = await (await fetch('https://itemscout.io/_next/static/chunks/453nz5qt_j217.js')).text();
const i = js.indexOf('usePathname)().split("/")[2]');
console.log(js.slice(i - 100, i + 1200));
