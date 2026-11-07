// Tells Bing (and other IndexNow engines: Yandex, Seznam, Naver) which pages changed.
// Usage: node scripts/indexnow.cjs <url-or-path> [...]   or   node scripts/indexnow.cjs --sitemap
const fs = require('fs');
const HOST = 'promptaholics.com';
const KEY = '04f36d572cca67d8ae8a48d3be6ba9e1';
let args = process.argv.slice(2);
if (args.includes('--sitemap')) {
  const xml = fs.readFileSync('sitemap.xml', 'utf8');
  args = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
}
const urls = [...new Set(args.map(a => a.startsWith('http') ? a : 'https://' + HOST + '/' + a.replace(/^\.?\//, '')))]
  .filter(u => !/(admin|login|google[0-9a-f]+|BingSiteAuth|order-success)/i.test(u))
  .slice(0, 10000);
if (!urls.length) { console.log('IndexNow: nothing to submit'); process.exit(0); }
(async () => {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: 'https://' + HOST + '/' + KEY + '.txt', urlList: urls })
  });
  console.log('IndexNow HTTP ' + res.status + ' for ' + urls.length + ' URL(s)');
  urls.forEach(u => console.log('  ' + u));
  // 200/202 = accepted. 403 = key file not live yet. 422 = URL/host mismatch. 429 = too many requests.
  if (![200, 202].includes(res.status)) { console.log(await res.text()); process.exitCode = 1; }
})();
