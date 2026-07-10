// netlify/edge-functions/vault-image.js
// Reads vault-shares from Firebase, renders OG tags server-side

export default async (request, context) => {
  const url    = new URL(request.url);
  const id     = url.searchParams.get('id') || '';
  const WORKER = 'https://dawn-thunder-a558.promptaholics1.workers.dev';

  // Default values
  var title   = 'AI Art — Promptaholics';
  var desc    = 'AI-generated artwork. Create your own free at Promptaholics!';
  var imgUrl  = '';

  if(id){
    try{
      // Fetch share data from Firebase via REST API
      const FB_PROJECT = 'promptaholics-534d3';
      const FB_URL = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents/vault-shares/${id}`;
      const res  = await fetch(FB_URL);
      const data = await res.json();

      if(data.fields){
        title  = data.fields.title?.stringValue  || title;
        desc   = data.fields.prompt?.stringValue || desc;
        imgUrl = data.fields.imageUrl?.stringValue || '';
      }
    }catch(e){
      // Use defaults
    }
  }

  // OG image via Worker
  const ogImg = imgUrl
    ? `${WORKER}/api/og?img=${encodeURIComponent(imgUrl)}&title=${encodeURIComponent(title)}`
    : 'https://promptaholics.com/og-default.png';

  const safeTitle = (title).replace(/"/g,'&quot;').replace(/</g,'&lt;').slice(0,80);
  const safeDesc  = (desc).replace(/"/g,'&quot;').replace(/</g,'&lt;').slice(0,160);
  const pageUrl   = url.href.replace(/"/g,'&quot;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="Promptaholics"/>
<meta property="og:title" content="${safeTitle}"/>
<meta property="og:description" content="${safeDesc}"/>
<meta property="og:image" content="${ogImg}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="${pageUrl}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${safeTitle}"/>
<meta name="twitter:description" content="${safeDesc}"/>
<meta name="twitter:image" content="${ogImg}"/>
<style>body{margin:0;background:#07070a;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;color:rgba(240,240,248,.5);font-size:13px;}</style>
</head>
<body>
<div>Loading...</div>
<script>
  // Pass the Firebase ID to vault-image.html
  var id = new URLSearchParams(window.location.search).get('id');
  window.location.replace('/vault-image.html?id=' + encodeURIComponent(id || ''));
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
