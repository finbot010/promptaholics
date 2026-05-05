// ═══════════════════════════════════════════════════════════
//  PROMPTAHOLICS — Weekly Image Generator
//  Calls DALL·E 3 API to generate 4 fresh images every Monday
//  Saves them to /images/ folder for Creation Station gallery
//
//  Run manually:  node scripts/generate-images.js
//  Auto-runs via: .github/workflows/weekly-images.yml
// ═══════════════════════════════════════════════════════════

const https  = require('https');
const fs     = require('fs');
const path   = require('path');

// ── CONFIG ──────────────────────────────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGES_DIR     = path.join(__dirname, '..', 'images');
const SIZE           = '1024x1024';   // Square — works best for gallery cards
const QUALITY        = 'hd';          // 'standard' ($0.04) or 'hd' ($0.08)
const MODEL          = 'dall-e-3';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

// ── PROMPTS ─────────────────────────────────────────────────
// These 4 prompts are from the Promptaholics library
// Optimized for DALL·E 3 (more descriptive, no Midjourney params)
const PROMPTS = [
  {
    filename: 'golden-hour-portrait.jpg',
    name: 'Golden Hour Portrait',
    category: 'Photography',
    tool: 'DALL·E 3',
    // Midjourney-style param stripped — DALL·E uses natural language
    dalle_prompt: `Editorial fashion portrait photograph during golden hour. Warm amber and coral light casting from the side, creating a natural rim light and hair glow. Shot with an 85mm lens at f/1.4, extremely shallow depth of field, buttery smooth bokeh background of an outdoor nature setting. Skin tones luminous and warm. Atmospheric golden haze for depth. The subject has a confident, editorial expression. National Geographic meets high fashion Vogue aesthetic. Cinematic, photorealistic, 8K quality, professional photography.`,
    // This is shown on the flip card — the original library prompt
    library_prompt: `Editorial portrait of [SUBJECT DESCRIPTION] during golden hour, warm amber and coral light from the side, shot on Sony A7R V with 85mm f/1.4 GM lens, shallow depth of field, skin tones luminous, natural outdoor setting [LOCATION], Vogue fashion editorial aesthetic --ar 4:5 --v 7 --stylize 750 --style raw`
  },
  {
    filename: 'action-figure-box.jpg',
    name: 'AI Action Figure Box',
    category: 'Image Generation',
    tool: 'DALL·E 3',
    dalle_prompt: `Photorealistic product photography of a collectible action figure toy in retail packaging. A stylized character in a clear plastic blister pack mounted on vibrant branded cardboard backing. The packaging has a bold logo at the top, character name in large retro toy typography, and lists accessories on the side. The figure is posed dynamically inside the clamshell. Professional studio lighting, stark white background, sharp product photography. The packaging looks like a premium collectible toy from a major toy brand. Ultra-realistic, 8K detail.`,
    library_prompt: `Photorealistic collectible toy packaging — [PERSON] as an action figure in a clear plastic clamshell blister pack, branded cardboard backing, name [NAME] in bold retro toy font, accessories: [LIST 3 ITEMS], shelf-ready retail photography, studio lighting, stark white background --ar 2:3 --v 7 --stylize 500`
  },
  {
    filename: 'urban-street-photography.jpg',
    name: 'Urban Street Photography',
    category: 'Photography',
    tool: 'DALL·E 3',
    dalle_prompt: `Black and white decisive moment street photography in a major city. A lone figure walking through dramatic geometric shadows on a rain-slicked urban street at night. High contrast monochrome, authentic film grain, available light only from neon signs and street lamps casting hard shadows. The composition uses strong geometric lines and leading lines. Documentary photography style reminiscent of Henri Cartier-Bresson. Leica rangefinder aesthetic. Timeless, journalistic, powerful human moment. Film noir atmosphere. Ultra-realistic.`,
    library_prompt: `Decisive moment street photography in [CITY], [SUBJECT/SCENE], shot on Leica M11 with 35mm Summilux, available light only, high contrast black and white, authentic grain, geometric shadows, Henri Cartier-Bresson documentary style --ar 3:2 --v 6.1 --style raw --stylize 400`
  },
  {
    filename: 'character-forge.jpg',
    name: 'The Character Forge',
    category: 'Creative & Art',
    tool: 'DALL·E 3',
    dalle_prompt: `Professional concept art character design sheet of an original fantasy warrior character. Front-facing portrait view with dramatic cinematic lighting. The character has intricate detailed armor with glowing runes, flowing hair, and a powerful weapon. Semi-realistic art style between anime and western comic book. Rich color palette with deep blues and gold accents. The character conveys strength, wisdom, and mystery. Epic fantasy aesthetic. Professional game concept art quality, detailed illustration, dramatic lighting, vibrant colors.`,
    library_prompt: `Design an original character: [CHARACTER CONCEPT]. Full character sheet with front, 3/4, and profile views. Art style: [anime / western comic / semi-realistic / Pixar 3D / concept art]. Include detailed elements: facial features and expression, hairstyle and color, outfit design with accessories, signature weapon or item, color palette swatch. The character should convey [PERSONALITY TRAITS]. Professional concept art quality, clean lines, dynamic pose.`
  }
];

// ── HELPERS ─────────────────────────────────────────────────

// Ensure images directory exists
function ensureImagesDir() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log(`📁 Created images directory: ${IMAGES_DIR}`);
  }
}

// Call OpenAI DALL·E 3 API
function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: MODEL,
      prompt: prompt,
      n: 1,
      size: SIZE,
      quality: QUALITY,
      response_format: 'url'
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/images/generations',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(`OpenAI API Error: ${parsed.error.message}`));
          } else {
            resolve(parsed.data[0].url);
          }
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Download image from URL and save to disk
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // delete partial file
      reject(err);
    });
  });
}

// Save metadata JSON so the site knows which prompt goes with which image
function saveMetadata(prompts) {
  const metaPath = path.join(IMAGES_DIR, 'metadata.json');
  const meta = {
    generated_at: new Date().toISOString(),
    week: getWeekNumber(),
    images: prompts.map(p => ({
      filename: p.filename,
      name: p.name,
      category: p.category,
      tool: p.tool,
      library_prompt: p.library_prompt
    }))
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`📋 Metadata saved to ${metaPath}`);
}

function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 604800000;
  return Math.ceil(diff / oneWeek);
}

// ── MAIN ────────────────────────────────────────────────────
async function main() {
  console.log('🎨 Promptaholics Weekly Image Generator');
  console.log(`📅 ${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}`);
  console.log(`🖼  Generating ${PROMPTS.length} images via DALL·E 3 (${QUALITY} quality)`);
  console.log(`💰 Estimated cost: $${(PROMPTS.length * (QUALITY === 'hd' ? 0.08 : 0.04)).toFixed(2)}`);
  console.log('─'.repeat(60));

  ensureImagesDir();

  const results = [];

  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i];
    console.log(`\n[${i + 1}/${PROMPTS.length}] Generating: ${p.name}`);

    try {
      // Generate via DALL·E 3 — retry up to 3 times on failure
      console.log(`  → Calling DALL·E 3 API...`);
      let imageUrl = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          imageUrl = await generateImage(p.dalle_prompt);
          break;
        } catch (retryErr) {
          if (attempt < 3) {
            console.log(`  ⚠️ Attempt ${attempt} failed: ${retryErr.message}`);
            console.log(`  ⏳ Retrying in 30 seconds...`);
            await new Promise(r => setTimeout(r, 30000));
          } else {
            throw retryErr;
          }
        }
      }
      console.log(`  ✅ Image generated`);

      // Download and save
      const filepath = path.join(IMAGES_DIR, p.filename);
      console.log(`  → Downloading to /images/${p.filename}...`);
      await downloadImage(imageUrl, filepath);

      const stats = fs.statSync(filepath);
      console.log(`  ✅ Saved (${(stats.size / 1024).toFixed(0)}KB)`);

      results.push({ ...p, success: true });

    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      results.push({ ...p, success: false, error: err.message });
    }

    // Wait 65 seconds between calls to respect OpenAI's rate limit
    // (1 image per minute for DALL·E 3 HD)
    if (i < PROMPTS.length - 1) {
      console.log(`  ⏳ Waiting 65 seconds before next image (rate limit)...`);
      await new Promise(r => setTimeout(r, 65000));
    }
  }

  // Save metadata
  saveMetadata(results.filter(r => r.success));

  // Summary
  console.log('\n' + '─'.repeat(60));
  const successes = results.filter(r => r.success).length;
  const failures  = results.filter(r => !r.success).length;
  console.log(`✅ Generated: ${successes}/${PROMPTS.length} images`);
  if (failures > 0) {
    console.log(`❌ Failed:    ${failures} images`);
    results.filter(r => !r.success).forEach(r => console.log(`   - ${r.name}: ${r.error}`));
  }
  console.log(`📁 Images saved to: ${IMAGES_DIR}`);
  console.log('🚀 Netlify will auto-deploy on next push');

  // Only fail if ALL images failed — partial success is OK
  process.exit(failures === PROMPTS.length ? 1 : 0);
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
