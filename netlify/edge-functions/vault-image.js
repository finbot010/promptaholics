// netlify/edge-functions/vault-image.js
// Serves vault-image.html with server-rendered OG meta tags
// so WhatsApp, Twitter, LinkedIn crawlers see the real image preview

export default async (request, context) => {
  const url    = new URL(request.url);
  const img    = url.searchParams.get('img')    || '';
  const title  = url.searchParams.get('title')  || 'AI Art';
  const prompt = url.searchParams.get('prompt') || '';
  const tool   = url.searchParams.get('tool')   || 'AI Generated';

  const WORKER = 'https://dawn-thunder-a558.promptaholics1.workers.dev';

  // OG image — Worker generates a branded preview card
  const ogImg = img
    ? `${WORKER}/api/og?img=${encodeURIComponent(img)}&title=${encodeURIComponent(title)}`
    : 'https://promptaholics.com/og-default.png';

  const safeTitle  = title.replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeDesc   = (prompt || 'AI-generated artwork. Create your own free at Promptaholics.')
                       .slice(0, 160)
                       .replace(/"/g, '&quot;')
                       .replace(/</g, '&lt;');
  const safeOgImg  = ogImg.replace(/"/g, '&quot;');
  const safeImgUrl = img.replace(/"/g, '&quot;');
  const pageUrl    = url.href.replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${safeTitle} — Promptaholics</title>
<meta name="description" content="${safeDesc}"/>

<!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Promptaholics"/>
<meta property="og:title" content="${safeTitle} — Promptaholics"/>
<meta property="og:description" content="${safeDesc}"/>
<meta property="og:image" content="${safeOgImg}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="${safeTitle} — AI Art on Promptaholics"/>
<meta property="og:url" content="${pageUrl}"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:site" content="@promptaholics"/>
<meta name="twitter:title" content="${safeTitle} — Promptaholics"/>
<meta name="twitter:description" content="${safeDesc}"/>
<meta name="twitter:image" content="${safeOgImg}"/>
<meta name="twitter:image:alt" content="${safeTitle}"/>

<!-- Pass params to the real page via meta refresh -->
<meta http-equiv="refresh" content="0;url=/vault-image.html${url.search}"/>

<style>
  body{margin:0;background:#07070a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:rgba(240,240,248,.6);font-size:14px;}
</style>
</head>
<body>
  <div>Loading...</div>
  <script>
    // Instant redirect for browsers (meta refresh is a fallback)
    window.location.replace('/vault-image.html' + window.location.search);
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

export const config = { path: '/share/vault' };
