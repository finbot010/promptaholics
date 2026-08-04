// ═══════════════════════════════════════════════════════════
//  PROMPTAHOLICS — Weekly Image Generator v3
//  Auto-submits to Image Vault (Firestore + Cloudinary)
//  Runs every Monday via GitHub Actions
// ═══════════════════════════════════════════════════════════

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OPENAI_API_KEY       = process.env.OPENAI_API_KEY;
const CLOUDINARY_CLOUD      = 'dgqbzarfw';
const CLOUDINARY_API_KEY    = process.env.CLOUDINARY_API_KEY    || '377132723958634';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FIREBASE_PROJECT_ID  = 'promptaholics-534d3';
const FIREBASE_API_KEY     = 'AIzaSyCWuUZjRUKMUEFtUHz6LCeWFSYS-c7qndQ';
const IMAGES_DIR           = path.join(__dirname, 'images');

if (!OPENAI_API_KEY){ console.error('❌ OPENAI_API_KEY not set'); process.exit(1); }
const HAS_CLOUDINARY = !!(CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
if(!HAS_CLOUDINARY) console.log('⚠️ Cloudinary not configured — images saved locally only, skipping vault submission');
else console.log('✅ Cloudinary configured — images will be submitted to Image Vault');

// ── WEEKLY PROMPT SETS ──────────────────────────────────────
const WEEKLY_SETS = [
  {
    week: 1,
    prompts: [
      { file: 'slot-1.jpg', name: 'Monsoon Bride', model: 'chatgpt', tags: ['portrait','cultural','painterly'], prompt: 'A luminous oil-painting portrait of a young Indian bride caught mid-laugh in a sudden monsoon downpour, her red and gold silk dupatta clinging to her shoulders, kohl slightly smudged at the corner of one eye from the rain. Gold jhumka earrings and a delicate nose ring catch a single shaft of amber streetlight. Wet strands of dark hair frame her face, marigolds tucked loosely above one ear. Background dissolves into soft bokeh — string lights, a blurred rickshaw, rain as vertical gold streaks. Hyper-detailed skin texture, painterly brushwork at the edges, joy as the entire subject.' },
      { file: 'slot-2.jpg', name: 'The Last Signal', model: 'chatgpt', tags: ['cyberpunk','portrait','neon'], prompt: 'Hyper-realistic cyberpunk portrait of a weathered radio operator in a rain-slicked rooftop bunker, mismatched analog headphones half-covering silver-streaked hair, a cracked neon visor pushed up onto her forehead. Deep teal and hot magenta light bleeds across her face from a wall of dying holographic signage behind her. Copper wiring runs like tattoos up one forearm, ending in a softly pulsing biometric cuff. Fog and static visible in the air itself. Cinematic rim lighting, ultra-detailed skin-to-metal transitions, the loneliness of the last person still listening.' },
      { file: 'slot-3.jpg', name: 'Ashfall Deity', model: 'chatgpt', tags: ['fantasy','portrait','dramatic'], prompt: 'Ultra-detailed dark fantasy portrait of a volcanic spirit with obsidian-black skin veined in slow-glowing magma cracks, curling ram-like horns dusted in fine grey ash, and eyes like molten copper. Charred fabric drapes one shoulder, held by a bone clasp. Embers drift upward past her face instead of falling. Smoky crimson and charcoal palette, dramatic single-source underlighting like standing over a fissure, hyper-detailed texture on cracked skin and ash, mythic and quietly sorrowful rather than menacing.' },
      { file: 'slot-4.jpg', name: 'Wet Ink', model: 'chatgpt', tags: ['portrait','mixed-media','artistic'], prompt: 'Mixed-media portrait of a young man with close-cropped hair, rendered as if half-finished — one side of his face a crisp hyper-realistic photograph, the other dissolving into loose black ink washes and pencil cross-hatching that drips slightly at the jaw, as though the page itself is still wet. A single koi fish sketched in red ink swims across his collarbone where skin becomes paper. Cream background with visible paper grain. Quiet, introspective expression. The contrast between precision and dissolution is the whole point.' },
    ]
  },
  {
    week: 2,
    prompts: [
      { file: 'slot-1.jpg', name: 'Neon Marketplace, 3AM', model: 'chatgpt', tags: ['cyberpunk','character','street'], prompt: 'Full-body cyberpunk portrait of a street vendor closing her noodle stall at 3AM, steam still rising from the last pot, LED signage in electric cyan and hot pink reflecting off the wet pavement and her transparent rain poncho. A cybernetic prosthetic hand handles the register with the same practiced ease as her real one. Strings of paper lanterns mixed with holographic ads overhead. Warm stall light against cold neon backdrop. Ultra-detailed textures, atmospheric haze, tired and unglamorous in the best way — a real person, not a hero shot.' },
      { file: 'slot-2.jpg', name: 'Gilded Grief', model: 'chatgpt', tags: ['portrait','painterly','emotional'], prompt: 'A stunning ethereal portrait of a woman in profile, tears rendered as fine gold leaf cracking and flaking from her cheek like kintsugi applied to skin instead of pottery. Dark hair swept back, a single dried flower woven in near her temple. Muted sage and dusty rose palette, soft window light from one side, oil-painting texture with visible brushwork at the hairline. Eyes closed, expression somewhere between sorrow and relief — beauty found in the repair, not the wound.' },
      { file: 'slot-3.jpg', name: 'Chrome Oracle', model: 'chatgpt', tags: ['cyberpunk','fantasy','portrait'], prompt: 'Hyper-realistic digital portrait of a fortune teller in a back-alley cyberpunk stall, half her face obscured by a beaded curtain of fiber-optic strands that shift color as she speaks. One human eye, one glowing violet optical implant. Tarot-like holographic cards float mid-air above upturned palms, rendered in soft blue projection light. Rich purples and deep blacks, incense smoke catching the neon glow. Ultra-detailed jewelry — brass rings on every finger, an old world charm against a high-tech backdrop.' },
      { file: 'slot-4.jpg', name: 'The Last Bloom', model: 'chatgpt', tags: ['portrait','nature','fantasy'], prompt: 'Hyper-detailed fantasy portrait of an elderly woman whose white hair has slowly become a cascade of small white flowers, some fresh, some visibly wilting near the ends — a quiet metaphor rendered literally. Deep laugh lines, warm brown eyes, a hand-knitted shawl in faded sage green. Soft golden-hour light, shallow depth of field, background a blur of an overgrown garden she clearly still tends herself. Painterly softness in the flowers, sharp photographic detail in the face. Dignity, not decay.' },
    ]
  },
  {
    week: 3,
    prompts: [
      { file: 'slot-1.jpg', name: 'Static Saint', model: 'chatgpt', tags: ['cyberpunk','portrait','religious-adjacent'], prompt: 'A hyper-realistic cyberpunk reinterpretation of a religious icon painting — a young woman haloed not by gold leaf but by a flickering circular holo-display, glitching between soft static and sacred geometry. Her expression serene, eyes slightly downcast. Ornate chrome jewelry in place of traditional gold filigree, wiring visible beneath translucent sleeve fabric. Deep indigo background with faint circuit-pattern linework, echoing Byzantine icon composition exactly but rebuilt entirely in neon and metal.' },
      { file: 'slot-2.jpg', name: 'Salt and Copper', model: 'chatgpt', tags: ['portrait','cultural','dramatic'], prompt: 'Ultra-detailed portrait of a Moroccan metalworker in his workshop at dusk, face lit entirely by the warm orange glow of hammered copper reflecting lamplight back onto his weathered skin. Deep creases around his eyes from decades of squinting at close work. A fine layer of copper dust catches the light like glitter on his forearms. Traditional patterned skullcap, intricate rings worn from years of labor rather than decoration. Shallow depth of field, background soft blur of hanging lanterns mid-craft. Dignity of craft as the entire subject.' },
    ]
  },
];

// ── HELPERS ──────────────────────────────────────────────────
function getWeekOfYear() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
}

function getThisWeeksPrompts() {
  const week = getWeekOfYear();
  const idx  = (week - 1) % WEEKLY_SETS.length;
  console.log(`📅 Week ${week} → Set ${idx + 1}`);
  return WEEKLY_SETS[idx].prompts;
}

function ensureDir() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// ── OPENAI IMAGE GENERATION ───────────────────────────────────
function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1536x1024', quality: 'high' });
    const req  = https.request({
      hostname: 'api.openai.com', path: '/v1/images/generations', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const p = JSON.parse(data);
          if (p.error) reject(new Error(p.error.message));
          else resolve(p.data[0].b64_json);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function saveImage(b64data, filepath) {
  const buffer = Buffer.from(b64data, 'base64');
  fs.writeFileSync(filepath, buffer);
}

// ── CLOUDINARY UPLOAD ─────────────────────────────────────────
function cloudinaryUpload(b64data, filename) {
  return new Promise((resolve, reject) => {
    const crypto = require('crypto');
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'vault';
    const public_id = `weekly-${filename.replace('.jpg','')}-${timestamp}`;

    // Generate signature
    const signStr = `folder=${folder}&public_id=${public_id}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(signStr).digest('hex');

    // Build multipart form data
    const boundary = '----CloudinaryBoundary' + Date.now();
    const imageBuffer = Buffer.from(b64data, 'base64');

    const fields = {
      api_key:   CLOUDINARY_API_KEY,
      timestamp: String(timestamp),
      signature: signature,
      folder:    folder,
      public_id: public_id,
    };

    let formParts = Buffer.alloc(0);
    for (const [key, val] of Object.entries(fields)) {
      const part = `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
      formParts = Buffer.concat([formParts, Buffer.from(part)]);
    }

    // File field
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${public_id}.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`;
    const fileFooter = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([formParts, Buffer.from(fileHeader), imageBuffer, Buffer.from(fileFooter)]);

    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) reject(new Error(result.error.message));
          else resolve(result.secure_url);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── FIRESTORE SUBMIT ──────────────────────────────────────────
function submitToVault(imageUrl, prompt) {
  return new Promise((resolve, reject) => {
    const doc = JSON.stringify({
      fields: {
        title:        { stringValue: prompt.name },
        prompt:       { stringValue: prompt.prompt },
        model:        { stringValue: prompt.model || 'chatgpt' },
        tags:         { arrayValue: { values: (prompt.tags||[]).map(t => ({ stringValue: t })) }},
        imageUrl:     { stringValue: imageUrl },
        creatorName:  { stringValue: 'Promptaholics Bot' },
        creatorEmail: { stringValue: 'bot@promptaholics.com' },
        creatorUid:   { stringValue: 'weekly-bot' },
        likes:        { integerValue: '0' },
        status:       { stringValue: 'approved' },
        createdAt:    { timestampValue: new Date().toISOString() },
        isBot:        { booleanValue: true },
      }
    });

    const path = `/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/vault-submissions`;
    const req  = https.request({
      hostname: 'firestore.googleapis.com',
      path: `${path}?key=${FIREBASE_API_KEY}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(doc) }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) reject(new Error(result.error.message));
          else resolve(result.name);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(doc);
    req.end();
  });
}

// ── SAVE METADATA ─────────────────────────────────────────────
function saveMetadata(prompts) {
  const meta = { generated_at: new Date().toISOString(), week: getWeekOfYear() };
  prompts.forEach(p => {
    meta[p.file.replace('.jpg','')] = { name: p.name, prompt: p.prompt };
  });
  fs.writeFileSync(path.join(IMAGES_DIR, 'metadata.json'), JSON.stringify(meta, null, 2));
  console.log('✅ metadata.json saved');
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  ensureDir();

  const prompts = getThisWeeksPrompts();
  console.log('🎨 Promptaholics Weekly Image Generator v3');
  console.log(`🖼  Generating ${prompts.length} images + auto-submitting to Image Vault`);
  console.log(`💰 Estimated cost: ~$${(prompts.length * 0.08).toFixed(2)}`);
  console.log('─'.repeat(50));

  let successes = 0;

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    console.log(`\n[${i+1}/${prompts.length}] ${p.name}`);

    try {
      // Step 1 — Generate image with OpenAI
      let b64 = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`  → OpenAI gpt-image-1 (attempt ${attempt})...`);
          b64 = await generateImage(p.prompt);
          console.log(`  ✅ Image generated`);
          break;
        } catch(err) {
          if (attempt < 3) {
            console.log(`  ⚠️ Attempt ${attempt} failed: ${err.message} — retrying in 30s...`);
            await new Promise(r => setTimeout(r, 30000));
          } else throw err;
        }
      }

      // Step 2 — Save locally to /images folder (for site use)
      const filepath = path.join(IMAGES_DIR, p.file);
      saveImage(b64, filepath);
      const kb = Math.round(fs.statSync(filepath).size / 1024);
      console.log(`  ✅ Saved locally → images/${p.file} (${kb}KB)`);

      // Step 3 — Upload to Cloudinary + submit to vault (if configured)
      if(HAS_CLOUDINARY){
        console.log(`  → Uploading to Cloudinary...`);
        const cloudUrl = await cloudinaryUpload(b64, p.file);
        console.log(`  ✅ Cloudinary: ${cloudUrl}`);
        console.log(`  → Submitting to Image Vault...`);
        const docId = await submitToVault(cloudUrl, p);
        console.log(`  ✅ Image Vault: ${docId.split('/').pop()}`);
      } else {
        console.log(`  ⚠️ Skipping vault submission (Cloudinary not configured)`);
      }

      successes++;

    } catch(err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }

    // Rate limit pause between images
    if (i < prompts.length - 1) {
      console.log(`  ⏳ Waiting 65s (rate limit)...`);
      await new Promise(r => setTimeout(r, 65000));
    }
  }

  saveMetadata(prompts);

  // Fallback: ensure no missing slots
  for (let i = 1; i <= 4; i++) {
    const slotPath = path.join(IMAGES_DIR, `slot-${i}.jpg`);
    if (!fs.existsSync(slotPath)) {
      const fallback = path.join(IMAGES_DIR, 'slot-1.jpg');
      if (fs.existsSync(fallback)) {
        fs.copyFileSync(fallback, slotPath);
        console.log(`⚠️ slot-${i}.jpg missing — copied slot-1 as fallback`);
      }
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Done: ${successes}/${prompts.length} images generated + submitted to Image Vault`);
  console.log(`🎉 Check promptaholics.com/vault.html to see new images!`);

  process.exit(successes === 0 ? 1 : 0);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
