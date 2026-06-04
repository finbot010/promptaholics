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
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'vmK17Y-sr-UWxEKek7_dZxkMC10';
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
      { file: 'slot-1.jpg', name: 'Golden Hour Portrait', model: 'chatgpt', tags: ['portrait','golden hour','editorial'], prompt: 'Editorial fashion portrait during golden hour. Warm amber and coral light from the side, 85mm lens f/1.4, extremely shallow depth of field, buttery bokeh background, skin tones luminous and warm, atmospheric golden haze, National Geographic meets Vogue aesthetic, cinematic photorealistic 8K quality.' },
      { file: 'slot-2.jpg', name: 'Neon Cyberpunk Street', model: 'chatgpt', tags: ['cyberpunk','neon','street'], prompt: 'Hyper-detailed cyberpunk alley at night. Glowing neon signs in Japanese and English reflecting on wet cobblestones. Steam rising from grates. Food stall with warm light. No people, atmospheric and cinematic. Blade Runner aesthetic. Pink purple and teal color palette. Ultra detailed 8K photorealistic.' },
      { file: 'slot-3.jpg', name: 'Urban Street Photography', model: 'chatgpt', tags: ['street','black and white','cinematic'], prompt: 'Black and white decisive moment street photography. Lone figure in geometric shadows on rain-slicked city street at night. High contrast monochrome, authentic film grain, available light only, Henri Cartier-Bresson documentary style, Leica rangefinder aesthetic, film noir atmosphere, ultra-realistic.' },
      { file: 'slot-4.jpg', name: 'Fantasy Hero Character', model: 'chatgpt', tags: ['fantasy','character','concept art'], prompt: 'Professional fantasy hero character concept art. Front-facing portrait with dramatic cinematic lighting. Intricate ornate armor with magical runes, flowing cape, heroic staff or shield. Semi-realistic art style between anime and western comic. Deep blues and gold accents. Epic fantasy game concept art quality 8K.' },
    ]
  },
  {
    week: 2,
    prompts: [
      { file: 'slot-1.jpg', name: 'Cyberpunk Neon Noir', model: 'chatgpt', tags: ['cyberpunk','neon','cityscape'], prompt: 'Ultra-detailed cyberpunk city at night. Heavy rain with neon reflections pooling on wet streets. Flying cars weaving between massive skyscrapers. Dramatic pink and teal volumetric lighting. Blade Runner 2049 aesthetic. Atmospheric fog and light rays through tall buildings. Cinematic masterpiece photorealistic 8K.' },
      { file: 'slot-2.jpg', name: 'Epic Fantasy Landscape', model: 'chatgpt', tags: ['fantasy','landscape','epic'], prompt: 'Epic fantasy landscape with ancient stone ruins on dramatic clifftop overlooking magical valley. Volumetric god rays breaking through storm clouds. Glowing magical elements in environment. Rich warm and cool color contrast. Sweeping cinematic composition. Tolkien meets Studio Ghibli aesthetic. Ultra-detailed painterly realism 8K.' },
      { file: 'slot-3.jpg', name: 'Luxury Perfume Shot', model: 'chatgpt', tags: ['product','luxury','photography'], prompt: 'Hyper-realistic commercial studio product photography of a luxury perfume bottle. Soft dramatic key light with subtle rim lighting. Pure white background. Intricate glass detail catching the light beautifully. High-end magazine advertisement quality. Apple and Chanel level product photography. 4K ultra-sharp professional lighting.' },
      { file: 'slot-4.jpg', name: 'Cinematic Portrait', model: 'chatgpt', tags: ['portrait','cinematic','Hollywood'], prompt: 'Ultra-cinematic portrait with dramatic Hollywood-style lighting. ARRI Alexa camera aesthetic, anamorphic lens flares, volumetric light rays. Deep shadow contrast with warm key light. Film grain texture. Teal and orange color grade. Subject looks directly into camera with intense powerful expression. 8K cinematic quality.' },
    ]
  },
  {
    week: 3,
    prompts: [
      { file: 'slot-1.jpg', name: 'Surreal Dreamscape', model: 'chatgpt', tags: ['surreal','dreamscape','art'], prompt: 'Breathtaking surreal dreamscape where a vast ocean floats in the sky above an endless desert. Giant clocks melt over impossible architectural structures. Mysterious glowing orbs. Beksinski meets Dali meets Stalenhag. Ethereal impossible light sources. Dreamy mysterious slightly unsettling. Muted palette with vivid purple accents. Ultra-detailed painterly.' },
      { file: 'slot-2.jpg', name: 'Steampunk Workshop', model: 'chatgpt', tags: ['steampunk','mechanical','victorian'], prompt: 'Epic steampunk mechanical workshop filled with ornate brass and copper machinery. Massive turning gears interconnected with leather belts. Steam venting dramatically from polished pipes. Victorian architectural details with intricate mechanical beauty. Dramatic amber and golden lighting. Highly detailed cinematic composition.' },
      { file: 'slot-3.jpg', name: 'Studio Ghibli Landscape', model: 'chatgpt', tags: ['anime','ghibli','landscape'], prompt: 'Beautiful anime landscape in the style of Studio Ghibli mixed with Makoto Shinkai. Young person on hilltop looking at magical floating castle in the distance. Lush green fields with wildflowers. Soft warm afternoon lighting with dramatic cloud formations. Incredibly detailed background art. Whimsical deeply emotional atmosphere masterpiece quality.' },
      { file: 'slot-4.jpg', name: 'National Geographic Portrait', model: 'chatgpt', tags: ['portrait','photography','realistic'], prompt: 'Hyper-realistic portrait photograph. National Geographic level photography. Subject with incredibly detailed facial features, realistic eyes with natural depth and catchlight. Perfect skin texture. Dramatic Rembrandt lighting from one side. Shot on Hasselblad medium format camera 80mm lens at f/2.8. Natural authentic expression. 8K resolution masterpiece.' },
    ]
  },
  {
    week: 4,
    prompts: [
      { file: 'slot-1.jpg', name: 'Retro Sci-Fi Poster', model: 'chatgpt', tags: ['retro','sci-fi','poster'], prompt: 'Vintage 1950s science fiction movie poster illustration. Heroic astronaut in retro spacesuit on alien planet with two moons in purple sky. Sleek rocketship in background. Bold graphic colors red cream and deep blue. Hand-painted poster art texture. Classic pulp fiction aesthetic. Dramatic composition.' },
      { file: 'slot-2.jpg', name: 'Watercolor Botanical', model: 'chatgpt', tags: ['watercolor','botanical','illustration'], prompt: 'Delicate watercolor botanical illustration of exotic tropical flowers and leaves. Ultra-precise scientific illustration meets fine art watercolor. Soft washes of color with intricate ink line details. White paper texture showing through. Collection of orchids birds of paradise and monstera. Museum quality botanical art. Soft pastel palette.' },
      { file: 'slot-3.jpg', name: 'Dark Fantasy Warrior', model: 'chatgpt', tags: ['fantasy','warrior','concept art'], prompt: 'Heroic fantasy paladin character with ornate ancient armor, glowing magical gauntlets. Cinematic lighting, hyper-detailed textures, dramatic atmosphere. Realistic fantasy art masterpiece. Deep blues and gold accents. Epic scale composition. Weta Digital and Blizzard Entertainment level concept art quality.' },
      { file: 'slot-4.jpg', name: 'Pixar Clay Character', model: 'chatgpt', tags: ['3d','pixar','character'], prompt: 'Adorable 3D rendered character in Pixar animation studio style. Small round creature with giant expressive eyes and tiny hands. Soft clay-like material texture with subsurface scattering. Warm studio lighting with soft shadows. Pastel color palette. Curious joyful expression. High quality 3D render cinematic lighting ultra-detailed texture.' },
    ]
  },
  {
    week: 5,
    prompts: [
      { file: 'slot-1.jpg', name: 'Synthwave Retro', model: 'chatgpt', tags: ['synthwave','retro','80s'], prompt: 'Vibrant retro 80s synthwave aesthetic illustration. Electric pink and purple neon colors, chrome and holographic reflections, retrowave grid extending to horizon, stylized sunset with horizontal color bands. Sports car silhouetted against sunset. Miami Vice meets Tron meets Outrun game aesthetic. Cinematic poster quality.' },
      { file: 'slot-2.jpg', name: 'Double Exposure Portrait', model: 'chatgpt', tags: ['portrait','double exposure','fine art'], prompt: 'Stunning double exposure portrait photography. Human silhouette profile filled with dense misty forest with tall pine trees. Forest textures blend seamlessly into the face. High contrast black and white with subtle blue toning. Trees create dramatic branching pattern within the human form. Fine art photography aesthetic masterpiece.' },
      { file: 'slot-3.jpg', name: 'Gourmet Burger Photography', model: 'chatgpt', tags: ['food','photography','commercial'], prompt: 'Hyperrealistic food photography of a perfectly crafted gourmet burger. Steam rising from toasted brioche bun. Fresh lettuce tomato and melting cheese visible in cross-section. Sesame seeds glistening. Dark moody restaurant background. Dramatic overhead key lighting. Shot on 100mm macro lens. Michelin-star food styling ultra-detailed 8K.' },
      { file: 'slot-4.jpg', name: 'Floating Island Realm', model: 'chatgpt', tags: ['fantasy','floating island','epic'], prompt: 'Majestic floating island realm with ancient temple on lush forest island. Multiple islands at different heights connected by rope bridges. Waterfalls cascading into clouds below. Dramatic sunrise lighting illuminating islands in gold. Birds and airships in the distance. Epic fantasy establishing shot composition. Ultra-detailed cinematic scale.' },
    ]
  },
  {
    week: 6,
    prompts: [
      { file: 'slot-1.jpg', name: 'Japanese Street Market', model: 'chatgpt', tags: ['japan','illustration','watercolor'], prompt: 'Beautiful ink and watercolor illustration of a Japanese street market at night. Detailed ink linework showing lanterns food stalls and crowds. Loose expressive watercolor washes in warm ambers reds and blues. Rain-wet cobblestones reflecting lantern light. Sketchy artistic handmade quality. Travel journal illustration aesthetic. Fine art print quality.' },
      { file: 'slot-2.jpg', name: 'Cozy Fantasy Interior', model: 'chatgpt', tags: ['fantasy','cozy','interior'], prompt: 'Incredibly cozy fantasy interior scene. Reading nook with plush armchair by rain-streaked window. Bookshelves overflowing with glowing books, bubbling potions and magical artifacts, climbing vines through windows, intricate handmade details. Studio Ghibli meets photorealistic blend. Warm amber candlelight. Deeply inviting magical atmosphere.' },
      { file: 'slot-3.jpg', name: 'Space Opera Battle', model: 'chatgpt', tags: ['space','sci-fi','epic'], prompt: 'Breathtaking space opera scene of massive space battle. Hundreds of ships firing at each other against vivid nebula clouds. Dramatic lighting from explosions and ship engines. Epic scale. Star Wars meets Dune meets Mass Effect aesthetic. Cinematic widescreen volumetric lighting. Ultra-detailed 8K.' },
      { file: 'slot-4.jpg', name: 'Samurai in Rain', model: 'chatgpt', tags: ['samurai','japan','cinematic'], prompt: 'Epic samurai warrior in heavy rain. Historically accurate ornate armor with individual detail. Dynamic powerful stance, fabric and hair caught in motion. Heavy rain, mist, dramatic natural lighting. Kurosawa film aesthetic meets hyper-realistic concept art. Ultra-detailed cinematic 8K.' },
    ]
  },
  {
    week: 7,
    prompts: [
      { file: 'slot-1.jpg', name: 'Impressionist Oil Painting', model: 'chatgpt', tags: ['impressionist','painting','art'], prompt: 'Stunning impressionist oil painting of sun-drenched French countryside. Rolling lavender fields stretching to horizon with farmhouse in distance. Thick impasto brushwork visible. Dappled sunlight through poplar trees. Palette of violet gold and emerald. Claude Monet and Van Gogh inspired technique. Museum-quality canvas painting with visible texture.' },
      { file: 'slot-2.jpg', name: 'Crystal Cave', model: 'chatgpt', tags: ['fantasy','cave','crystal'], prompt: 'Breathtaking crystal cave interior. Massive amethyst crystalline formations in every direction, some translucent some opaque, glowing from within with magical energy. Bioluminescent organisms adding blue-green light. A lone explorer for scale. Ultra-detailed surface reflections and refractions. Magical and awe-inspiring atmosphere.' },
      { file: 'slot-3.jpg', name: 'Volcanic Dragon Lair', model: 'chatgpt', tags: ['dragon','fantasy','epic'], prompt: 'Majestic ancient dragon with intricate iridescent scale detail resting in a volcanic mountain cave. Glowing magma rivers casting warm orange light. Vast treasure surrounding the creature. Epic fantasy art meets photorealism. Ultra-detailed 8K cinematic.' },
      { file: 'slot-4.jpg', name: 'Gothic Cathedral Interior', model: 'chatgpt', tags: ['gothic','architecture','atmospheric'], prompt: 'Stunning gothic cathedral interior. Soaring pointed arches, intricate flying buttresses, detailed stone gargoyles, ornate rose windows with colored light filtering through. Dark stone weathered by centuries. Dramatic stormy sky visible through windows. Atmospheric fog at the base. Baroque and Gothic aesthetic maximum detail. Overwhelming scale.' },
    ]
  },
  {
    week: 8,
    prompts: [
      { file: 'slot-1.jpg', name: 'Cinematic Car Night', model: 'chatgpt', tags: ['car','cinematic','night'], prompt: 'Cinematic nighttime automotive photography of sleek sports car on wet city street. Neon lights reflecting on rain-soaked road. Long exposure light trails from passing traffic. Car gleams under streetlights. Low wide-angle perspective. Car commercial aesthetic. Deep blacks with vivid neon colors. 8K resolution ultra-detailed bodywork.' },
      { file: 'slot-2.jpg', name: 'Celestial Angel', model: 'chatgpt', tags: ['angel','celestial','epic'], prompt: 'Breathtaking celestial angel portrait. Impossibly intricate white and gold feathered wings. Divine energy radiating from the being. Dramatic backlighting creating golden halo. Ornate divine armor. The being expression conveying ancient power and emotion. Cinematic key art quality. Ultra-detailed 8K. Heavenly atmosphere with god rays.' },
      { file: 'slot-3.jpg', name: 'Jungle Temple Explorer', model: 'chatgpt', tags: ['jungle','temple','adventure'], prompt: 'Epic jungle temple adventure. Ancient stone temple being swallowed by roots and vines. Mysterious glyphs and carvings. Shafts of light breaking through jungle canopy illuminating dust particles. An adventurer with torch exploring. Indiana Jones meets Tomb Raider aesthetic. Ultra-detailed cinematic quality.' },
      { file: 'slot-4.jpg', name: 'Dreamy Pastel World', model: 'chatgpt', tags: ['pastel','dreamy','whimsical'], prompt: 'Enchanting dreamy pastel world with floating tea party above clouds. Everything in soft watercolor pastels. Soft diffused lighting with no harsh shadows. Whimsical impossible architecture and oversized flora. Fairy tale storybook illustration meets fine art. Gentle and profoundly beautiful.' },
    ]
  },
  {
    week: 9,
    prompts: [
      { file: 'slot-1.jpg', name: 'Fashion Editorial', model: 'chatgpt', tags: ['fashion','editorial','photography'], prompt: 'High fashion editorial photograph. Avant-garde styling telling a story through clothing. Model in dramatic pose showing garment beautifully. Shot in moody abandoned industrial building. Vogue and Harpers Bazaar editorial aesthetic. Dramatic professional lighting. Shot on Hasselblad medium format. Cinematic color grade. Masterpiece fashion photography.' },
      { file: 'slot-2.jpg', name: 'Mechanical Robot Mech', model: 'chatgpt', tags: ['robot','mech','concept art'], prompt: 'Epic mechanical robot mech concept art. Hyper-detailed panel lines hydraulic systems worn weathered surfaces glowing power cores and sensor arrays. Shown in heroic pose. Dramatic studio lighting on polished metal surfaces. Transformers meets Evangelion aesthetic. Ultra-detailed cinematic quality.' },
      { file: 'slot-3.jpg', name: 'Romantic Fantasy Scene', model: 'chatgpt', tags: ['romance','fantasy','cinematic'], prompt: 'Cinematic romantic fantasy scene of two characters in a deeply emotional quiet moment. Magical environment with glowing fireflies falling cherry blossom petals and moonlight on water. Soft cinematic lighting warm color grade. Visual storytelling conveying deep connection without words. Studio Ghibli meets live action masterpiece quality.' },
      { file: 'slot-4.jpg', name: 'Ancient Ruins Explorer', model: 'chatgpt', tags: ['ruins','adventure','archaeology'], prompt: 'Epic ancient Mayan civilization ruins at golden hour. Massive crumbling stone architecture with intricate carvings still visible. Jungle reclaiming the structures with vines and trees. Lone explorer silhouette for scale. Dramatic golden hour light. Photorealistic National Geographic meets Indiana Jones adventure aesthetic. Ultra-detailed 8K.' },
    ]
  },
  {
    week: 10,
    prompts: [
      { file: 'slot-1.jpg', name: 'Spaceship Bridge', model: 'chatgpt', tags: ['sci-fi','spaceship','futuristic'], prompt: 'Cinematic sci-fi spaceship bridge interior. Functional futuristic design with holographic displays, dramatic lighting from screens and status lights, infinite stars visible through large viewports. Wear and weathering on surfaces showing years of use. Star Wars meets The Expanse used-future aesthetic. Ultra-detailed cinematic wide angle.' },
      { file: 'slot-2.jpg', name: 'Desert Oasis Fantasy', model: 'chatgpt', tags: ['desert','oasis','fantasy'], prompt: 'Magical desert oasis fantasy scene. Lush palm trees and exotic flowers exploding from arid surroundings, crystal blue pools reflecting azure sky, ornate Arabian-inspired pavilions and silk tents, exotic birds. Late afternoon golden light casting long warm shadows. Arabian Nights meets fantasy art. Ultra-detailed masterpiece.' },
      { file: 'slot-3.jpg', name: 'Epic Mountain Dawn', model: 'chatgpt', tags: ['mountain','landscape','epic'], prompt: 'Majestic epic mountain landscape at dawn. Impossibly dramatic snow-capped peaks piercing the clouds, alpenglow painting snow in shades of pink and orange, dramatic volumetric cloud formations, crystal clear air. A lone mountaineer silhouette for scale. Large format camera aesthetic 8K.' },
      { file: 'slot-4.jpg', name: 'Gothic Mansion Interior', model: 'chatgpt', tags: ['gothic','atmospheric','horror'], prompt: 'Mysterious atmospheric Gothic mansion interior at night. Moonlight through tall arched windows casting long shadows. Candelabras flickering. Grand staircase with ornate railings. Dusty paintings on the walls. High contrast desaturated. Dark academia aesthetic. Kubrick visual style masterpiece.' },
    ]
  },
  {
    week: 11,
    prompts: [
      { file: 'slot-1.jpg', name: 'Aerial Volcanic Island', model: 'chatgpt', tags: ['aerial','volcano','landscape'], prompt: 'Spectacular aerial view of volcanic island chain at golden hour. Molten lava flowing into ocean creating dramatic steam explosions. Islands lush green against dark volcanic rock. Aerial drone perspective at 500 meters. Pacific Ocean stretching to horizon catching golden light. National Geographic level photography. 8K ultra-detail masterpiece.' },
      { file: 'slot-2.jpg', name: 'Masked Vigilante', model: 'chatgpt', tags: ['character','superhero','concept art'], prompt: 'Highly detailed original character design concept art. Heroic guardian with elaborate costume combining Japanese samurai mask aesthetics with futuristic armor. Deep navy and gold color scheme. Flowing cape. Ornate shield on back. Standing in dramatic rain with city lights behind. DC Comics meets manga aesthetic.' },
      { file: 'slot-3.jpg', name: 'Futuristic Green City', model: 'chatgpt', tags: ['future','city','utopia'], prompt: 'Vibrant editorial illustration of a futuristic green city. Massive vertical gardens covering skyscrapers, solar panels integrated into every surface, flying electric vehicles, happy diverse citizens in public parks. Bold flat illustration style with clean lines. Optimistic near-future aesthetic. Bold saturated colors. Urban utopia visualization.' },
      { file: 'slot-4.jpg', name: 'Anime Warrior Portrait', model: 'chatgpt', tags: ['anime','character','portrait'], prompt: 'Stunning anime character portrait in premium modern anime style. Young warrior with striking heterochromia eyes one silver one gold, wind-blown white hair with blue tips. Elegant battle uniform with intricate embroidery. Cherry blossom petals swirling. Dramatic backlit sunset. Radiates strength and mystery. Makoto Shinkai lighting quality ultra-detailed.' },
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
    const body = JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024', quality: 'medium' });
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
