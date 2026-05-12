// ═══════════════════════════════════════════════════════════
//  PROMPTAHOLICS — Weekly Image Generator v2
//  Uses unique filenames per week so images actually change
//  Runs every Monday via GitHub Actions
// ═══════════════════════════════════════════════════════════

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const IMAGES_DIR     = path.join(__dirname, 'images');
const SIZE           = '1024x1024';
const QUALITY        = 'hd';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not set');
  process.exit(1);
}

// ── WEEKLY PROMPT SETS ──────────────────────────────────────
// Each set has UNIQUE filenames so images actually change each week
// The site flip cards always load slot-1.jpg through slot-4.jpg
// We generate those 4 files with different prompts each week

const WEEKLY_SETS = [
  {
    week: 1,
    prompts: [
      { file: 'slot-1.jpg', name: 'Golden Hour Portrait', prompt: 'Editorial fashion portrait during golden hour. Warm amber and coral light from the side, 85mm lens f/1.4, extremely shallow depth of field, buttery bokeh background, skin tones luminous and warm, atmospheric golden haze, National Geographic meets Vogue aesthetic, cinematic photorealistic 8K quality.' },
      { file: 'slot-2.jpg', name: 'AI Action Figure Box', prompt: 'Photorealistic collectible action figure toy in retail packaging. Stylized character in clear plastic blister pack on vibrant branded cardboard. Bold logo at top, character name in large retro toy typography, accessories listed on side. Professional studio lighting, stark white background, ultra-realistic 8K detail.' },
      { file: 'slot-3.jpg', name: 'Urban Street Photography', prompt: 'Black and white decisive moment street photography. Lone figure in geometric shadows on rain-slicked city street at night. High contrast monochrome, authentic film grain, available light only, Henri Cartier-Bresson documentary style, Leica rangefinder aesthetic, film noir atmosphere, ultra-realistic.' },
      { file: 'slot-4.jpg', name: 'The Character Forge', prompt: 'Professional concept art of original fantasy warrior character. Front-facing portrait with dramatic cinematic lighting. Intricate armor with glowing runes, flowing hair, powerful weapon. Semi-realistic art style between anime and western comic. Deep blues and gold accents. Epic fantasy game concept art quality 8K.' },
    ]
  },
  {
    week: 2,
    prompts: [
      { file: 'slot-1.jpg', name: 'Cyberpunk Neon Noir', prompt: 'Ultra-detailed cyberpunk city at night. Heavy rain with neon reflections pooling on wet streets. Flying cars weaving between massive skyscrapers. Dramatic pink and teal volumetric lighting. Blade Runner 2049 aesthetic. Atmospheric fog and light rays through tall buildings. Cinematic masterpiece photorealistic 8K.' },
      { file: 'slot-2.jpg', name: 'Epic Fantasy Landscape', prompt: 'Epic fantasy landscape with ancient stone ruins on dramatic clifftop overlooking magical valley. Volumetric god rays breaking through storm clouds. Glowing magical elements in environment. Rich warm and cool color contrast. Sweeping cinematic composition. Tolkien meets Studio Ghibli aesthetic. Ultra-detailed painterly realism 8K.' },
      { file: 'slot-3.jpg', name: 'Luxury Product Shot', prompt: 'Hyper-realistic commercial studio product photography of a luxury perfume bottle. Soft dramatic key light with subtle rim lighting. Pure white background. Intricate glass detail catching the light beautifully. High-end magazine advertisement quality. Apple and Chanel level product photography. 4K ultra-sharp professional lighting.' },
      { file: 'slot-4.jpg', name: 'Cinematic Portrait', prompt: 'Ultra-cinematic portrait with dramatic Hollywood-style lighting. ARRI Alexa camera aesthetic, anamorphic lens flares, volumetric light rays. Deep shadow contrast with warm key light. Film grain texture. Teal and orange color grade. Subject looks directly into camera with intense powerful expression. 8K cinematic quality.' },
    ]
  },
  {
    week: 3,
    prompts: [
      { file: 'slot-1.jpg', name: 'Surreal Dreamscape', prompt: 'Breathtaking surreal dreamscape where a vast ocean floats in the sky above an endless desert. Giant clocks melt over impossible architectural structures. Mysterious glowing orbs. Beksinski meets Dali meets Stalenhag. Ethereal impossible light sources. Dreamy mysterious slightly unsettling. Muted palette with vivid purple accents. Ultra-detailed painterly.' },
      { file: 'slot-2.jpg', name: 'Steampunk Workshop', prompt: 'Epic steampunk mechanical workshop filled with ornate brass and copper machinery. Massive turning gears interconnected with leather belts. Steam venting dramatically from polished pipes. Victorian architectural details with intricate mechanical beauty. Dramatic amber and golden lighting. Highly detailed cinematic composition.' },
      { file: 'slot-3.jpg', name: 'Studio Ghibli Anime', prompt: 'Beautiful anime landscape in the style of Studio Ghibli mixed with Makoto Shinkai. Young person on hilltop looking at magical floating castle in the distance. Lush green fields with wildflowers. Soft warm afternoon lighting with dramatic cloud formations. Incredibly detailed background art. Whimsical deeply emotional atmosphere masterpiece quality.' },
      { file: 'slot-4.jpg', name: 'National Geographic Portrait', prompt: 'Hyper-realistic portrait photograph. National Geographic level photography. Subject with incredibly detailed facial features, realistic eyes with natural depth and catchlight. Perfect skin texture. Dramatic Rembrandt lighting from one side. Shot on Hasselblad medium format camera 80mm lens at f/2.8. Natural authentic expression. 8K resolution masterpiece.' },
    ]
  },
  {
    week: 4,
    prompts: [
      { file: 'slot-1.jpg', name: 'Retro Sci-Fi Poster', prompt: 'Vintage 1950s science fiction movie poster illustration. Heroic astronaut in retro spacesuit on alien planet with two moons in purple sky. Sleek rocketship in background. Bold graphic colors red cream and deep blue. Hand-painted poster art texture. Classic pulp fiction aesthetic. Dramatic composition with bold typography space.' },
      { file: 'slot-2.jpg', name: 'Watercolor Botanical', prompt: 'Delicate watercolor botanical illustration of exotic tropical flowers and leaves. Ultra-precise scientific illustration meets fine art watercolor. Soft washes of color with intricate ink line details. White paper texture showing through. Collection of orchids birds of paradise and monstera. Museum quality botanical art. Soft pastel palette.' },
      { file: 'slot-3.jpg', name: 'Dark Fantasy Warrior', prompt: 'Dark fantasy warrior character with battle scars, glowing eyes, ancient armor. Cinematic lighting, hyper-detailed textures, dramatic atmosphere. Realistic fantasy art masterpiece. Deep blacks with crimson and gold accents. Epic scale composition. Weta Digital and Blizzard Entertainment level concept art quality.' },
      { file: 'slot-4.jpg', name: 'Pixar Clay Character', prompt: 'Adorable 3D rendered character in Pixar animation studio style. Small round creature with giant expressive eyes and tiny hands. Soft clay-like material texture with subsurface scattering. Warm studio lighting with soft shadows. Pastel color palette. Curious joyful expression. High quality 3D render cinematic lighting ultra-detailed texture.' },
    ]
  },
  {
    week: 5,
    prompts: [
      { file: 'slot-1.jpg', name: 'Synthwave Neon Retro', prompt: 'Vibrant retro 80s synthwave aesthetic illustration. Electric pink and purple neon colors, chrome and holographic reflections, retrowave grid extending to horizon, stylized sunset with horizontal color bands. Sports car silhouetted against sunset. Miami Vice meets Tron meets Outrun game aesthetic. Cinematic poster quality.' },
      { file: 'slot-2.jpg', name: 'Double Exposure Portrait', prompt: 'Stunning double exposure portrait photography. Human silhouette profile filled with dense misty forest with tall pine trees. Forest textures blend seamlessly into the face. High contrast black and white with subtle blue toning. Trees create dramatic branching pattern within the human form. Fine art photography aesthetic masterpiece.' },
      { file: 'slot-3.jpg', name: 'Hyperrealistic Food', prompt: 'Hyperrealistic food photography of a perfectly crafted gourmet burger. Steam rising from toasted brioche bun. Fresh lettuce tomato and melting cheese visible in cross-section. Sesame seeds glistening. Dark moody restaurant background. Dramatic overhead key lighting. Shot on 100mm macro lens. Michelin-star food styling ultra-detailed 8K.' },
      { file: 'slot-4.jpg', name: 'Floating Island Realm', prompt: 'Majestic floating island realm with ancient temple on lush forest island. Multiple islands at different heights connected by rope bridges. Waterfalls cascading into clouds below. Dramatic sunrise lighting illuminating islands in gold. Birds and airships in the distance. Epic fantasy establishing shot composition. Ultra-detailed cinematic scale.' },
    ]
  },
  {
    week: 6,
    prompts: [
      { file: 'slot-1.jpg', name: 'Ink and Watercolor', prompt: 'Beautiful ink and watercolor illustration of a Japanese street market at night. Detailed ink linework showing lanterns food stalls and crowds. Loose expressive watercolor washes in warm ambers reds and blues. Rain-wet cobblestones reflecting lantern light. Sketchy artistic handmade quality. Travel journal illustration aesthetic. Fine art print quality.' },
      { file: 'slot-2.jpg', name: 'Cozy Fantasy Interior', prompt: 'Incredibly cozy fantasy interior scene. Reading nook with plush armchair by rain-streaked window. Bookshelves overflowing with glowing books, bubbling potions and magical artifacts, climbing vines through windows, intricate handmade details. Studio Ghibli meets photorealistic blend. Warm amber candlelight. Deeply inviting magical atmosphere.' },
      { file: 'slot-3.jpg', name: 'Space Opera Battle', prompt: 'Breathtaking space opera scene of massive space battle. Hundreds of ships firing at each other against vivid nebula clouds. Dramatic lighting from explosions and ship engines. Epic scale. Star Wars meets Dune meets Mass Effect aesthetic. Cinematic widescreen volumetric lighting. Ultra-detailed 8K.' },
      { file: 'slot-4.jpg', name: 'Samurai in Rain', prompt: 'Epic samurai in rain battle scene. Historically accurate armor and weapons with individual detail. Dynamic action-frozen composition with swords drawn, fabric and hair caught in motion. Heavy rain, mist, dramatic natural lighting. Kurosawa film aesthetic meets hyper-realistic concept art. Ultra-detailed cinematic 8K.' },
    ]
  },
  {
    week: 7,
    prompts: [
      { file: 'slot-1.jpg', name: 'Impressionist Oil Painting', prompt: 'Stunning impressionist oil painting of sun-drenched French countryside. Rolling lavender fields stretching to horizon with farmhouse in distance. Thick impasto brushwork visible. Dappled sunlight through poplar trees. Palette of violet gold and emerald. Claude Monet and Van Gogh inspired technique. Museum-quality canvas painting with visible texture.' },
      { file: 'slot-2.jpg', name: 'Crystal Cave', prompt: 'Breathtaking crystal cave interior. Massive amethyst crystalline formations in every direction, some translucent some opaque, glowing from within with magical energy. Bioluminescent organisms adding blue-green light. A lone explorer for scale. Ultra-detailed surface reflections and refractions. Magical and awe-inspiring atmosphere.' },
      { file: 'slot-3.jpg', name: 'Volcanic Dragon Lair', prompt: 'Epic volcanic dragon lair. Massive ancient dragon with intricate scale detail sleeping on gold treasure hoard. Volcanic cave environment with rivers of molten lava casting dramatic orange and red light. Stalactites of cooled magma. Epic fantasy art meets photorealism. Ultra-detailed 8K cinematic.' },
      { file: 'slot-4.jpg', name: 'Gothic Cathedral', prompt: 'Stunning gothic cathedral interior. Soaring pointed arches, intricate flying buttresses, detailed stone gargoyles, ornate rose windows with colored light filtering through. Dark stone weathered by centuries. Dramatic stormy sky visible through windows. Atmospheric fog at the base. Baroque and Gothic aesthetic maximum detail. Overwhelming scale.' },
    ]
  },
  {
    week: 8,
    prompts: [
      { file: 'slot-1.jpg', name: 'Cinematic Car Night', prompt: 'Cinematic nighttime automotive photography of sleek sports car on wet city street. Neon lights reflecting on rain-soaked road. Long exposure light trails from passing traffic. Car gleams under streetlights. Low wide-angle perspective. Car commercial aesthetic. Deep blacks with vivid neon colors. 8K resolution ultra-detailed bodywork.' },
      { file: 'slot-2.jpg', name: 'Celestial Angel', prompt: 'Breathtaking celestial angel portrait. Impossibly intricate white and gold feathered wings. Divine energy radiating from the being. Dramatic backlighting creating golden halo. Ornate divine armor. The being expression conveying ancient power and emotion. Cinematic key art quality. Ultra-detailed 8K. Heavenly atmosphere with god rays.' },
      { file: 'slot-3.jpg', name: 'Jungle Temple', prompt: 'Epic jungle temple adventure. Ancient stone temple being swallowed by roots and vines. Mysterious glyphs and carvings. Shafts of light breaking through jungle canopy illuminating dust particles. An adventurer with torch exploring. Indiana Jones meets Tomb Raider aesthetic. Ultra-detailed cinematic quality.' },
      { file: 'slot-4.jpg', name: 'Dreamy Pastel World', prompt: 'Enchanting dreamy pastel world with floating tea party above clouds. Everything in soft watercolor pastels — blush pink powder blue mint green warm lavender. Soft diffused lighting with no harsh shadows. Whimsical impossible architecture and oversized flora. Fairy tale storybook illustration meets fine art. Gentle and profoundly beautiful.' },
    ]
  },
  {
    week: 9,
    prompts: [
      { file: 'slot-1.jpg', name: 'Fashion Editorial', prompt: 'High fashion editorial photograph. Avant-garde styling telling a story through clothing. Model in dramatic pose showing garment beautifully. Shot in moody abandoned industrial building. Vogue and Harpers Bazaar editorial aesthetic. Dramatic professional lighting. Shot on Hasselblad medium format. Cinematic color grade. Masterpiece fashion photography.' },
      { file: 'slot-2.jpg', name: 'Mechanical Robot Mech', prompt: 'Epic mechanical battle mech concept art. Hyper-detailed panel lines hydraulic systems worn battle damage glowing power cores and sensor arrays. Shown in action pose. Dramatic battlefield lighting on polished and weathered metal surfaces. Transformers meets Evangelion meets real-world military engineering. Ultra-detailed cinematic quality.' },
      { file: 'slot-3.jpg', name: 'Romantic Fantasy', prompt: 'Cinematic romantic fantasy scene of two characters in a deeply emotional quiet moment. Magical environment with glowing fireflies falling cherry blossom petals and moonlight on water. Soft cinematic lighting warm color grade. Visual storytelling conveying deep connection without words. Studio Ghibli meets live action masterpiece quality.' },
      { file: 'slot-4.jpg', name: 'Ancient Ruins Explorer', prompt: 'Epic ancient Mayan civilization ruins at golden hour. Massive crumbling stone architecture with intricate carvings still visible. Jungle reclaiming the structures with vines and trees. Lone explorer silhouette for scale. Dramatic golden hour light. Photorealistic National Geographic meets Indiana Jones adventure aesthetic. Ultra-detailed 8K.' },
    ]
  },
  {
    week: 10,
    prompts: [
      { file: 'slot-1.jpg', name: 'Spaceship Interior', prompt: 'Cinematic sci-fi spaceship bridge interior. Functional futuristic design with holographic displays, dramatic lighting from screens and status lights, infinite stars visible through large viewports. Wear and weathering on surfaces showing years of use. Star Wars meets The Expanse used-future aesthetic. Ultra-detailed cinematic wide angle.' },
      { file: 'slot-2.jpg', name: 'Desert Oasis Fantasy', prompt: 'Magical desert oasis fantasy scene. Lush palm trees and exotic flowers exploding from arid surroundings, crystal blue pools reflecting azure sky, ornate Arabian-inspired pavilions and silk tents, exotic birds. Late afternoon golden light casting long warm shadows. Arabian Nights meets fantasy art. Ultra-detailed masterpiece.' },
      { file: 'slot-3.jpg', name: 'Snowy Mountain Epic', prompt: 'Majestic epic mountain landscape at dawn. Impossibly dramatic snow-capped peaks piercing the clouds, alpenglow painting snow in shades of pink and orange, dramatic volumetric cloud formations, crystal clear air. A lone mountaineer silhouette for scale. Reinhold Messner meets fantasy epic. Large format camera aesthetic 8K.' },
      { file: 'slot-4.jpg', name: 'Horror Atmosphere', prompt: 'Deeply atmospheric horror scene in an abandoned Gothic mansion at night. Eerie moonlight through broken windows. Long shadows creating menacing shapes. Candles flickering. Something feels deeply wrong but nothing is overtly shown. Psychological horror aesthetic. High contrast desaturated. Kubrick and James Wan visual style masterpiece.' },
    ]
  },
  {
    week: 11,
    prompts: [
      { file: 'slot-1.jpg', name: 'Aerial Volcanic Island', prompt: 'Spectacular aerial view of volcanic island chain at golden hour. Molten lava flowing into ocean creating dramatic steam explosions. Islands lush green against dark volcanic rock. Aerial drone perspective at 500 meters. Pacific Ocean stretching to horizon catching golden light. National Geographic level photography. 8K ultra-detail masterpiece.' },
      { file: 'slot-2.jpg', name: 'Masked Vigilante', prompt: 'Highly detailed original character design concept art. Mysterious masked vigilante with elaborate costume combining Japanese oni mask aesthetics with modern tactical gear. Dark navy and crimson color scheme. Flowing tattered cape. Twin blades crossed on back. Standing in dramatic rain with city lights behind. DC Comics meets manga aesthetic.' },
      { file: 'slot-3.jpg', name: 'Future Green City', prompt: 'Vibrant editorial illustration of a futuristic green city. Massive vertical gardens covering skyscrapers, solar panels integrated into every surface, flying electric vehicles, happy diverse citizens in public parks. Bold flat illustration style with clean lines. Optimistic near-future aesthetic. Bold saturated colors. Urban utopia visualization.' },
      { file: 'slot-4.jpg', name: 'Anime Character Portrait', prompt: 'Stunning anime character portrait in premium modern anime style. Young warrior with striking heterochromia eyes one silver one gold, wind-blown white hair with blue tips. Elegant battle uniform with intricate embroidery. Cherry blossom petals swirling. Dramatic backlit sunset. Radiates strength and mystery. Makoto Shinkai lighting quality ultra-detailed.' },
    ]
  },
];

// ── GET THIS WEEK'S SET ──────────────────────────────────────
function getWeekOfYear() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
}

function getThisWeeksPrompts() {
  const week = getWeekOfYear();
  const idx  = (week - 1) % WEEKLY_SETS.length;
  console.log(`📅 Week ${week} of year → Set ${idx + 1} of ${WEEKLY_SETS.length} (${WEEKLY_SETS[idx].week})`);
  return WEEKLY_SETS[idx].prompts;
}

// ── API HELPERS ──────────────────────────────────────────────
function ensureDir() {
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function generateImage(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: SIZE, quality: QUALITY, response_format: 'url' });
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
          else resolve(p.data[0].url);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', err => { fs.unlink(filepath, () => {}); reject(err); });
  });
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  const prompts = getThisWeeksPrompts();
  console.log('🎨 Promptaholics Weekly Image Generator v2');
  console.log(`🖼  Generating ${prompts.length} images:`);
  prompts.forEach((p, i) => console.log(`   ${i+1}. ${p.name} → ${p.file}`));
  console.log(`💰 Estimated cost: $${(prompts.length * 0.08).toFixed(2)}`);
  console.log('─'.repeat(50));

  ensureDir();
  let successes = 0;

  for (let i = 0; i < prompts.length; i++) {
    const p = prompts[i];
    console.log(`\n[${i+1}/${prompts.length}] ${p.name}`);
    try {
      let url = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`  → DALL·E 3 API (attempt ${attempt})...`);
          url = await generateImage(p.prompt);
          break;
        } catch(err) {
          if (attempt < 3) {
            console.log(`  ⚠️ Attempt ${attempt} failed: ${err.message}`);
            console.log(`  ⏳ Retrying in 30s...`);
            await new Promise(r => setTimeout(r, 30000));
          } else throw err;
        }
      }
      const filepath = path.join(IMAGES_DIR, p.file);
      await downloadImage(url, filepath);
      const kb = Math.round(fs.statSync(filepath).size / 1024);
      console.log(`  ✅ Saved → images/${p.file} (${kb}KB)`);
      successes++;
    } catch(err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }
    if (i < prompts.length - 1) {
      console.log(`  ⏳ Waiting 65s (rate limit)...`);
      await new Promise(r => setTimeout(r, 65000));
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Done: ${successes}/${prompts.length} images generated`);
  process.exit(successes === 0 ? 1 : 0);
}

main().catch(err => { console.error('💥', err); process.exit(1); });
