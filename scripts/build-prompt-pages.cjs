#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
//  Builds one static, crawlable page per prompt from prompts.js
//    p/<slug>.html          one page per prompt
//    p/index.html           all categories
//    p/c/<category>.html    every prompt in a category
//    p/slugs.json           id → slug map (library.html uses it for links)
//    sitemap-prompts.xml    every page above, for Google and Bing
//  Run: node scripts/build-prompt-pages.cjs   (no dependencies)
//  Pages are rebuilt from scratch each run, so removed prompts disappear.
// ═══════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://promptaholics.com';
const OUT = path.join(ROOT, 'p');

// ── Load prompts ──────────────────────────────────────────────
const src = fs.readFileSync(path.join(ROOT, 'prompts.js'), 'utf8');
const ALL = new Function(src.replace('const PROMPTS', 'var PROMPTS') + '\nreturn PROMPTS;')()
  .filter(p => p && p.id && p.name && p.text);
if (ALL.length < 100) { console.error('Only ' + ALL.length + ' prompts parsed — refusing to build.'); process.exit(1); }

// ── Helpers ───────────────────────────────────────────────────
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '') || 'prompt';
const clip = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, c.lastIndexOf(' ') > n * 0.6 ? c.lastIndexOf(' ') : c.length).replace(/[\s,;:.\-–—]+$/, '') + '…'; };
const plain = s => String(s).replace(/[#*_`>]+/g, ' ').replace(/\[([^\]]+)\]/g, '$1').replace(/\s+/g, ' ').trim();

const TOOLS = {
  chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini', midjourney: 'Midjourney', runway: 'Runway',
  kling: 'Kling AI', flux: 'Flux', dalle: 'DALL·E', other: 'AI'
};
const toolKey = t => { const k = String(t || '').toLowerCase().replace(/[^a-z0-9]/g, ''); return TOOLS[k] ? k : 'other'; };
const IMAGE_TOOLS = new Set(['midjourney', 'flux', 'dalle', 'runway', 'kling']);

// Messy category names → a clean set of groups for hub pages and related prompts
const CAT_GROUPS = [
  ['AI Agents & Automation', /agent|loop|automation|ai architecture|voice system/i],
  ['Image & Art', /image|art direction|creative & art|photograph|cinematic visual/i],
  ['Video & Film', /video|film/i],
  ['Code & Tech', /code|frontend|full-stack|tech|data collection/i],
  ['Email, Sales & Communication', /email|sales|communication|customer service/i],
  ['Marketing & Branding', /marketing|brand|social media|psycholog|seo/i],
  ['Writing & Content', /writ|content/i],
  ['Personal Finance & Investing', /financ|invest/i],
  ['Business & Strategy', /business|offer|e-commerce|market research|strategy|problem-solution/i],
  ['Education & Learning', /educat|learn/i],
  ['Health & Wellness', /health|wellness|nutrition|fitness/i],
  ['Productivity', /productiv/i],
  ['Career & Resume', /career|resume/i],
  ['Legal & Admin', /legal|admin/i],
  ['Real Estate', /real estate/i],
  ['Travel', /travel/i],
  ['Food & Cooking', /food|cook|recipe/i],
  ['Lifestyle, Fun & Games', /lifestyle|fun|game/i],
];
const catGroup = c => { for (const [g, re] of CAT_GROUPS) if (re.test(c || '')) return g; return 'More Prompts'; };

// ── Slugs: clean name slug, stable; collisions get the id appended ─
const byId = [...ALL].sort((a, b) => Number(a.id) - Number(b.id));
const used = new Set(['index']);
for (const p of byId) {
  let s = slugify(p.name);
  if (used.has(s)) s = s + '-' + p.id;
  used.add(s); p._slug = s; p._tool = toolKey(p.tool); p._group = catGroup(p.cat);
}

const groups = {};
for (const p of byId) (groups[p._group] = groups[p._group] || []).push(p);
const groupSlug = g => slugify(g);

// Related: same group, scored by shared tags and same tool; ties go to nearest id
function related(p, n = 6) {
  const tags = new Set((p.tags || []).map(t => String(t).toLowerCase()));
  return groups[p._group].filter(q => q !== p).map(q => {
    let s = 0;
    (q.tags || []).forEach(t => { if (tags.has(String(t).toLowerCase())) s += 2; });
    if (q._tool === p._tool) s += 1;
    if (q.feat) s += 0.5;
    return { q, s, d: Math.abs(Number(q.id) - Number(p.id)) };
  }).sort((a, b) => b.s - a.s || a.d - b.d).slice(0, n).map(x => x.q);
}

function placeholders(text) {
  const found = [];
  const re = /\[([A-Z0-9][^\[\]\n]{1,48})\]|\{([A-Za-z][^{}\n]{1,40})\}/g;
  let m;
  while ((m = re.exec(text)) && found.length < 8) {
    const v = '[' + (m[1] || m[2]).trim() + ']';
    if (!found.includes(v)) found.push(v);
  }
  return found;
}

function howTo(p) {
  const tool = TOOLS[p._tool];
  const ph = placeholders(p.text);
  const steps = [];
  steps.push('Copy the prompt with the button above.');
  if (ph.length) steps.push('Replace the parts in brackets with your own details: ' + ph.map(esc).join(', ') + (ph.length === 8 ? ' and the rest' : '') + '.');
  if (IMAGE_TOOLS.has(p._tool)) {
    steps.push('Paste it into ' + tool + ' and generate. Run it a few times — image tools give a different result each time.');
    steps.push('Adjust the style, lighting or aspect ratio words to steer the result.');
  } else {
    steps.push('Paste it into ' + (p._tool === 'other' ? 'ChatGPT, Claude or Gemini' : tool) + ' and send it.' + (p._tool !== 'other' ? ' It also works in other AI chat tools.' : ''));
    steps.push('Not quite right? Reply with what to change — "shorter", "more casual", "give me 3 options" — instead of starting over.');
  }
  return steps;
}

// ── Shared page chrome ────────────────────────────────────────
const CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#07070a;--bg2:#0d0d14;--card:#12121b;--ink:#f0f0f8;--ink2:#a6a6c8;--orange:#ff6224;--o2:#ff9f24;--border:rgba(255,255,255,.09);--border2:rgba(255,255,255,.16)}
html{background:var(--bg)}body{background:var(--bg);color:var(--ink);font-family:'Instrument Sans',system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;min-height:100dvh}
a{color:var(--o2)}a:hover{color:#ffc069}
:focus-visible{outline:2px solid var(--o2);outline-offset:2px;border-radius:6px}
.skip{position:absolute;left:-999px;top:8px;background:var(--orange);color:#07070a;padding:8px 14px;border-radius:8px;z-index:10}.skip:focus{left:8px}
.top{border-bottom:1px solid var(--border);background:rgba(7,7,10,.92)}@media (min-width:760px){.top{position:sticky;top:0;z-index:5}}
.top-in{max-width:1000px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.logo{font-family:Syne,sans-serif;font-weight:800;font-size:20px;color:var(--ink);text-decoration:none;letter-spacing:-.02em}.logo span{color:var(--orange)}
.top nav{display:flex;gap:16px;margin-left:auto;flex-wrap:wrap}.top nav a{color:var(--ink2);text-decoration:none;font-size:14px;font-weight:600}.top nav a:hover{color:var(--ink)}
main{max-width:1000px;margin:0 auto;padding:24px 16px 56px}
.crumbs{font-size:13px;color:var(--ink2);margin-bottom:18px}.crumbs ol{list-style:none;display:flex;flex-wrap:wrap;gap:6px}.crumbs li+li::before{content:"›";margin-right:6px;color:var(--ink2)}.crumbs a{color:var(--ink2)}
h1{font-family:Syne,sans-serif;font-weight:800;font-size:clamp(26px,5vw,40px);line-height:1.15;letter-spacing:-.02em;margin-bottom:12px}
h2{font-family:Syne,sans-serif;font-size:20px;margin:36px 0 12px}
.lede{color:var(--ink2);font-size:17px;max-width:70ch;margin-bottom:14px}
.badges{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px}
.badge{font-size:12.5px;font-weight:600;padding:4px 11px;border-radius:999px;border:1px solid var(--border2);color:var(--ink);text-decoration:none;background:rgba(255,255,255,.04)}
.badge.tool{border-color:rgba(255,98,36,.5);color:#ffb08f}
.box{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden}
.box-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);flex-wrap:wrap}
.box-head span{font-size:13px;color:var(--ink2)}
.prompt{font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:14px;line-height:1.7;white-space:pre-wrap;word-wrap:break-word;padding:18px;max-height:none}
.actions{display:flex;flex-wrap:wrap;gap:8px}
.btn{display:inline-flex;align-items:center;gap:6px;font:600 14px 'Instrument Sans',sans-serif;padding:9px 16px;border-radius:10px;border:1px solid var(--border2);background:rgba(255,255,255,.05);color:var(--ink);cursor:pointer;text-decoration:none;min-height:40px}
.btn:hover{background:rgba(255,255,255,.1);color:var(--ink)}
.btn.primary{background:var(--orange);border-color:var(--orange);color:#07070a}.btn.primary:hover{background:#ff7a45;color:#07070a}
.steps{padding-left:22px;max-width:75ch}.steps li{margin:6px 0}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.tags span{font-size:12.5px;color:var(--ink2);border:1px solid var(--border);padding:2px 9px;border-radius:999px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px;list-style:none}
.card{display:block;height:100%;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;text-decoration:none;color:var(--ink)}
.card:hover{border-color:rgba(255,98,36,.55);color:var(--ink)}
.card strong{display:block;font-size:15px;margin-bottom:4px}.card small{display:block;color:var(--ink2);font-size:13px;line-height:1.5}
.card em{font-style:normal;font-size:12px;color:#ffb08f}
.cta{margin-top:40px;padding:22px;border-radius:16px;border:1px solid rgba(255,98,36,.35);background:linear-gradient(135deg,rgba(255,98,36,.12),rgba(255,159,36,.05))}
.cta p{color:var(--ink2);margin:6px 0 14px}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1d1d2a;border:1px solid var(--border2);color:var(--ink);padding:10px 18px;border-radius:10px;font-size:14px;opacity:0;transition:opacity .2s;pointer-events:none}.toast.show{opacity:1}
.catlist{columns:2 260px;list-style:none}.catlist li{margin:0 0 8px;break-inside:avoid}
footer{border-top:1px solid var(--border);color:var(--ink2);font-size:13px}
.foot-in{max-width:1000px;margin:0 auto;padding:22px 16px;display:flex;flex-wrap:wrap;gap:14px 20px}.foot-in a{color:var(--ink2)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}`;

const CSS_V = require('crypto').createHash('md5').update(CSS).digest('hex').slice(0, 8);
function head({ title, desc, canonical, jsonld, ogType = 'article' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${canonical}"/>
<meta property="og:type" content="${ogType}"/>
<meta property="og:site_name" content="Promptaholics"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:image" content="${SITE}/og-image.png"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@promptaholics"/>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/>
<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Sans:wght@400;600&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet"/>
<script src="/cookie-consent.js" defer></script>
<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>
<link rel="stylesheet" href="/p/p.css?v=${CSS_V}"/>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="top-in">
<a class="logo" href="/">Prompt<span>aholics</span></a>
<nav aria-label="Main"><a href="/library.html">Library</a><a href="/p/">Browse by category</a><a href="/prompt-of-the-day.html">Prompt of the Day</a><a href="/vault.html">Vault</a><a href="/creationstation.html">AI Tools</a></nav>
</div></header>
<main id="main">`;
}

const FOOT = `</main>
<footer><div class="foot-in">
<span>© 2026 Promptaholics · Free AI prompts · No signup required</span>
<a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="/sponsor.html">Advertise</a>
</div></footer>
</body>
</html>
`;

const crumbs = items => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items.map((it, i) =>
  i === items.length - 1 ? `<li aria-current="page">${esc(it[0])}</li>` : `<li><a href="${it[1]}">${esc(it[0])}</a></li>`).join('')}</ol></nav>`;
const crumbLd = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: SITE + it[1] })) });

const card = q => `<li><a class="card" href="/p/${q._slug}.html"><strong>${esc(q.name)}</strong><small>${esc(clip(q.desc || plain(q.text), 110))}</small><em>${esc(TOOLS[q._tool])}</em></a></li>`;

// ── Prompt page ───────────────────────────────────────────────
function promptPage(p) {
  const tool = TOOLS[p._tool];
  const toolPhrase = p._tool === 'other' ? 'AI' : tool;
  const url = `${SITE}/p/${p._slug}.html`;
  const gUrl = `/p/c/${groupSlug(p._group)}.html`;
  const intro = p.desc ? p.desc.trim() : clip(plain(p.text), 140);
  const desc = clip((p.desc ? p.desc.trim().replace(/[.!]?$/, '. ') : '') + `Free ${toolPhrase} prompt: ` + plain(p.text), 158);
  const title = `${clip(p.name, 60)} — Free ${toolPhrase} Prompt | Promptaholics`;
  const words = p.text.split(/\s+/).filter(Boolean).length;
  const rel = related(p);
  const steps = howTo(p);
  const bc = [['Home', '/'], ['Prompts', '/p/'], [p._group, gUrl], [p.name, `/p/${p._slug}.html`]];
  const canOpen = !IMAGE_TOOLS.has(p._tool) && p.text.length <= 6000;
  const jsonld = { '@context': 'https://schema.org', '@graph': [crumbLd(bc), {
    '@type': 'CreativeWork', name: p.name, description: desc, url, inLanguage: 'en', isAccessibleForFree: true,
    genre: p._group, keywords: (p.tags || []).join(', '),
    publisher: { '@type': 'Organization', name: 'Promptaholics', url: SITE }
  }] };
  return head({ title, desc, canonical: url, jsonld }) + `
${crumbs(bc)}
<article>
<h1>${esc(p.name)}</h1>
<p class="lede">${esc(intro)}</p>
<div class="badges"><span class="badge tool">${esc(tool)}</span><a class="badge" href="${gUrl}">${esc(p._group)}</a>${p.feat ? '<span class="badge">★ Featured</span>' : ''}</div>
<div class="box">
<div class="box-head"><span>${words.toLocaleString('en-US')} words · free to use</span>
<div class="actions"><button class="btn primary" type="button" id="copyBtn">Copy prompt</button>${canOpen ? `<a class="btn" id="openGpt" href="https://chatgpt.com/" target="_blank" rel="noopener">Open in ChatGPT</a><a class="btn" id="openClaude" href="https://claude.ai/new" target="_blank" rel="noopener">Open in Claude</a>` : ''}</div></div>
<pre class="prompt" id="promptText">${esc(p.text)}</pre>
</div>
${(p.tags || []).length ? `<div class="tags" aria-label="Tags">${p.tags.slice(0, 8).map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
<h2>How to use this prompt</h2>
<ol class="steps">${steps.map(s => `<li>${s}</li>`).join('')}</ol>
</article>
${rel.length ? `<h2>Related ${esc(p._group.toLowerCase())} prompts</h2>
<ul class="grid">${rel.map(card).join('')}</ul>` : ''}
<p style="margin-top:18px"><a href="${gUrl}">See all ${groups[p._group].length} ${esc(p._group)} prompts →</a></p>
<section class="cta"><h2 style="margin:0">Get 10 new prompts every week</h2><p>Join the free Promptaholics newsletter, or search every prompt in the library.</p>
<div class="actions"><a class="btn primary" href="/library.html?prompt=${encodeURIComponent(p.id)}">Open in the library</a><a class="btn" href="/#brevoFooterEmail">Join the newsletter</a></div></section>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script>
(function(){
  var t=document.getElementById('promptText').textContent, toast=document.getElementById('toast');
  function say(m){toast.textContent=m;toast.classList.add('show');setTimeout(function(){toast.classList.remove('show');},1800);}
  function copy(){ if(navigator.clipboard&&window.isSecureContext){return navigator.clipboard.writeText(t);} var a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy');}finally{a.remove();} return Promise.resolve(); }
  function track(n){ try{ if(window.gtag) gtag('event',n,{prompt_id:${JSON.stringify(String(p.id))}}); }catch(e){} }
  document.getElementById('copyBtn').addEventListener('click',function(){ copy().then(function(){say('Copied!');track('copy_prompt');},function(){say('Copy failed — select the text and copy it');}); });
  var g=document.getElementById('openGpt'), c=document.getElementById('openClaude');
  if(g) g.href='https://chatgpt.com/?q='+encodeURIComponent(t);
  if(c) c.href='https://claude.ai/new?q='+encodeURIComponent(t);
  [g,c].forEach(function(a){ if(a) a.addEventListener('click',function(){track('open_in_'+(a===g?'chatgpt':'claude'));}); });
})();
</script>
` + FOOT;
}

// ── Category hub ──────────────────────────────────────────────
function groupPage(g) {
  const list = groups[g];
  const url = `${SITE}/p/c/${groupSlug(g)}.html`;
  const counts = {};
  list.forEach(q => counts[TOOLS[q._tool]] = (counts[TOOLS[q._tool]] || 0) + 1);
  const toolsTxt = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} for ${k}`).join(', ');
  const title = `${list.length} Free ${g} Prompts — ChatGPT, Claude & Gemini | Promptaholics`;
  const desc = clip(`Browse ${list.length} free ${g.toLowerCase()} AI prompts (${toolsTxt}). Copy any prompt in one click — no signup needed.`, 158);
  const bc = [['Home', '/'], ['Prompts', '/p/'], [g, `/p/c/${groupSlug(g)}.html`]];
  const sorted = [...list].sort((a, b) => (b.feat ? 1 : 0) - (a.feat ? 1 : 0) || a.name.localeCompare(b.name));
  const jsonld = { '@context': 'https://schema.org', '@graph': [crumbLd(bc), { '@type': 'CollectionPage', name: `${g} prompts`, url, description: desc,
    mainEntity: { '@type': 'ItemList', numberOfItems: list.length, itemListElement: sorted.slice(0, 100).map((q, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/p/${q._slug}.html`, name: q.name })) } }] };
  return head({ title, desc, canonical: url, jsonld, ogType: 'website' }) + `
${crumbs(bc)}
<h1>${esc(g)} prompts</h1>
<p class="lede">${list.length} free prompts — ${esc(toolsTxt)}. Featured prompts come first, then A to Z.</p>
<ul class="grid">${sorted.map(card).join('')}</ul>
<p style="margin-top:24px"><a href="/p/">← All categories</a></p>
` + FOOT;
}

// ── Index ─────────────────────────────────────────────────────
function indexPage(names) {
  const url = `${SITE}/p/`;
  const title = `Browse ${ALL.length.toLocaleString('en-US')} Free AI Prompts by Category | Promptaholics`;
  const desc = `Every free prompt in the Promptaholics library, sorted into ${names.length} categories — ChatGPT, Claude, Gemini and image prompts you can copy in one click.`;
  const bc = [['Home', '/'], ['Prompts', '/p/']];
  const jsonld = { '@context': 'https://schema.org', '@graph': [crumbLd(bc), { '@type': 'CollectionPage', name: 'All prompts by category', url, description: desc }] };
  const featured = byId.filter(q => q.feat).slice(-12).reverse();
  return head({ title, desc, canonical: url, jsonld, ogType: 'website' }) + `
${crumbs(bc)}
<h1>Browse all prompts by category</h1>
<p class="lede">${ALL.length.toLocaleString('en-US')} free prompts for ChatGPT, Claude, Gemini and image tools. Want search and filters? Use the <a href="/library.html">prompt library</a>.</p>
<ul class="catlist">${names.map(g => `<li><a href="/p/c/${groupSlug(g)}.html">${esc(g)}</a> <span style="color:var(--ink2)">(${groups[g].length})</span></li>`).join('')}</ul>
${featured.length ? `<h2>Featured prompts</h2><ul class="grid">${featured.map(card).join('')}</ul>` : ''}
` + FOOT;
}

// ── Write everything ──────────────────────────────────────────
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'c'), { recursive: true });
let bytes = 0;
const write = (rel, html) => { fs.writeFileSync(path.join(OUT, rel), html); bytes += Buffer.byteLength(html); };

fs.writeFileSync(path.join(OUT, 'p.css'), CSS);
for (const p of byId) write(p._slug + '.html', promptPage(p));
const names = Object.keys(groups).sort((a, b) => a === 'More Prompts' ? 1 : b === 'More Prompts' ? -1 : groups[b].length - groups[a].length);
for (const g of names) write('c/' + groupSlug(g) + '.html', groupPage(g));
write('index.html', indexPage(names));
fs.writeFileSync(path.join(OUT, 'slugs.json'), JSON.stringify(Object.fromEntries(byId.map(p => [String(p.id), p._slug]))));

const urls = [`${SITE}/p/`, ...names.map(g => `${SITE}/p/c/${groupSlug(g)}.html`), ...byId.map(p => `${SITE}/p/${p._slug}.html`)];
fs.writeFileSync(path.join(ROOT, 'sitemap-prompts.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n') + `\n</urlset>\n`);

console.log(`Built ${byId.length} prompt pages, ${names.length} category pages and the index — ${(bytes / 1048576).toFixed(1)} MB, avg ${(bytes / (byId.length + names.length + 1) / 1024).toFixed(1)} KB/page.`);
