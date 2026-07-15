// netlify/edge-functions/prompt-share.js
// Renders OG tags for shared PA Agent prompts, then redirects to prompt-share.html
// Firebase data is fetched client-side on prompt-share.html for the actual render

export default async (request, context) => {
  const url = new URL(request.url);
  const id  = url.searchParams.get('id') || '';

  var title = 'AI Prompt — Promptaholics';
  var desc  = 'A free AI prompt generated with PA Agent. Copy it or make your own at Promptaholics!';

  if(id) {
    try {
      const fbUrl = `https://firestore.googleapis.com/v1/projects/promptaholics-534d3/databases/(default)/documents/prompt-shares/${id}`;
      const res   = await fetch(fbUrl);
      if(res.ok) {
        const data = await res.json();
        if(data.fields) {
          const name     = data.fields.name?.stringValue     || 'AI Prompt';
          const tool     = data.fields.tool?.stringValue     || '';
          const category = data.fields.category?.stringValue || '';
          const text     = data.fields.text?.stringValue     || '';

          title = `${name} — Promptaholics`;
          const meta = [category, tool].filter(Boolean).join(' · ');
          desc = (meta ? meta + ' — ' : '') + text;
          desc = desc.slice(0, 160);
        }
      }
    } catch(e) {
      // Use defaults — don't crash
    }
  }

  // Prompts don't have a per-item image — use the branded default OG card
  const ogImg = 'https://promptaholics.com/og-default.png';

  const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Promptaholics"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(ogImg)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${esc(url.href)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(ogImg)}"/>
<style>
body{margin:0;background:#07070a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:rgba(240,240,248,.5);font-size:13px;}
</style>
</head>
<body>
<div>Loading...</div>
<script>
window.location.replace('/prompt-share.html?id=' + encodeURIComponent('${id}'));
</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    }
  });
};

export const config = { path: '/share/prompt' };
