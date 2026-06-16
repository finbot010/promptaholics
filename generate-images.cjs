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
      { file: 'slot-1.jpg', name: 'Hyper-Realistic Water Droplet', model: 'chatgpt', tags: ['macro','water','photography'], prompt: 'Extreme macro photography of a single perfect water droplet suspended in mid-air over a dark lily pad. Inside the droplet a tiny inverted reflection of a forest. Shot on Canon MP-E 65mm 5x macro. Stroboscopic lighting catching micro-ripples. Dark teal background. Individual water molecules visible. National Geographic macro photography award winner. 8K ultra-sharp.' },
      { file: 'slot-2.jpg', name: 'AI Dreamscape Architecture', model: 'chatgpt', tags: ['architecture','surreal','concept'], prompt: 'Impossible architectural structure that defies gravity — a baroque cathedral that melts into an ultra-modern glass tower, both simultaneously dissolving into crystalline geometric forms. Shot at blue hour, structure self-illuminated with warm amber light from within. Bjarke Ingels meets Antoni Gaudi meets Zaha Hadid. Photorealistic architectural visualization. Cinematic 8K.' },
      { file: 'slot-3.jpg', name: 'Neon Tokyo Back Alley', model: 'chatgpt', tags: ['street','japan','neon'], prompt: 'Ultra-detailed hyper-real Tokyo back alley at 3AM in heavy rain. Every surface reflects neon kanji signs. A single ramen shop glows orange warmth into the cold wet street. Tangled power lines overhead. Vending machines humming. Motion blur on raindrops. Shot on Sony A7R IV at f/1.2 ISO 3200. Tokina 11mm fisheye. Film grain. Like stepping into the scene.' },
      { file: 'slot-4.jpg', name: 'Microscopic Crystal Forest', model: 'chatgpt', tags: ['macro','science','crystal'], prompt: 'Scanning electron microscope image colorized by NASA scientists showing a microscopic crystalline landscape that looks exactly like an alien forest. Salt crystals or bismuth formations growing in impossible spiraling towers. Colors: electric blue, copper, gold, magenta. Scale bar showing 50 micrometers. Feels like standing in a forest but you are looking at chemistry.' },
    ]
  },
  {
    week: 2,
    prompts: [
      { file: 'slot-1.jpg', name: 'Levitating Desert Monument', model: 'chatgpt', tags: ['surreal','desert','levitation'], prompt: 'An entire ancient Egyptian obelisk floating 200 meters above the Sahara desert at sunrise. Sand particles spiraling upward around its base as if being pulled into orbit. The obelisk casts an impossible shadow below it. Hieroglyphs glow faintly amber. Photorealistic with atmospheric haze. Shot from a helicopter at eye level with the floating monument. Causes immediate disorientation.' },
      { file: 'slot-2.jpg', name: 'Hyperrealistic Honey Pour', model: 'chatgpt', tags: ['food','macro','commercial'], prompt: 'Ultra slow motion moment of raw honey pouring from a rustic wooden dipper captured with a Phantom high-speed camera. Individual strands visible where honey separates. Warm amber backlight making the honey glow like molten gold. Beeswax comb and dried wildflowers out of focus in background. Commercial food photography meets fine art. 4K ultra-sharp. Makes you taste it through the screen.' },
      { file: 'slot-3.jpg', name: 'Aurora Storm Chase', model: 'chatgpt', tags: ['aurora','landscape','night'], prompt: 'Photographer standing alone on a frozen lake in Iceland at midnight looking up at the most violent aurora borealis ever seen. The sky is split into curtains of green, purple, electric white and deep crimson. The aurora reflects perfectly in the ice below creating a full 360-degree effect. Stars visible between aurora bands. Milky Way core on the horizon. Shot on 14mm f/1.8. Real, not rendered.' },
      { file: 'slot-4.jpg', name: 'Living Tattoo Study', model: 'chatgpt', tags: ['tattoo','art','portrait'], prompt: 'Full body fine-art portrait of a person whose tattoos appear to be moving — ink that looks like liquid mercury, botanical illustrations that seem to breathe, geometric patterns shifting like kaleidoscopes. Dark studio backdrop, dramatic single light source. The tattoos are the subject. High fashion meets body art. Shot on Hasselblad X2D. The tattoos look three-dimensional. Black and white body, vivid color ink.' },
    ]
  },
  {
    week: 3,
    prompts: [
      { file: 'slot-1.jpg', name: 'Bioluminescent Ocean Night', model: 'chatgpt', tags: ['ocean','bioluminescent','nature'], prompt: 'Night photography of Maldives beach where every wave crashing on shore glows vivid electric blue bioluminescence from dinoflagellates. Long exposure 30 seconds. The glowing waves trail across the black sand. Stars and Milky Way overhead. Coconut palms silhouetted. The horizon glows faintly. No other light source except nature. Like walking on another planet. National Geographic photograph of the year.' },
      { file: 'slot-2.jpg', name: 'Solarpunk Urban Farm', model: 'chatgpt', tags: ['solarpunk','future','city'], prompt: 'Vibrant solarpunk neighborhood in 2075. Every rooftop is a lush food forest. Solar canopies shade market streets where neighbors trade produce. Mosaic murals cover building sides. Children play in clean rivers running through the city. Wind sculptures generate power while spinning beautifully. Diverse community gathering. Feels joyful and real. Painterly illustration meets photorealism. Warm golden afternoon light.' },
      { file: 'slot-3.jpg', name: 'Storm Front Meeting Sunshine', model: 'chatgpt', tags: ['weather','landscape','drama'], prompt: 'The exact moment a violent supercell storm meets the brilliant sunshine on the other side of the weather front. Shot from a storm chaser plane at 30,000 feet. Left half of frame: inky black tornadic rotation, lightning inside the cloud wall. Right half: blinding golden sunset. The boundary between them is a razor-sharp line of chaos and peace. Nikon Z9 aerial photography.' },
      { file: 'slot-4.jpg', name: 'Deep Ocean Creature', model: 'chatgpt', tags: ['ocean','creature','bioluminescent'], prompt: 'Deep sea photography at 3,000 meters using submersible lights revealing an undiscovered species. Translucent gelatinous creature the size of a car with thousands of bioluminescent blue-green dots arranged in perfect geometric patterns across its body. Multiple articulated fins. Scientists have not named it yet. National Oceanic and Atmospheric Administration style documentation photo. Real but alien.' },
    ]
  },
  {
    week: 4,
    prompts: [
      { file: 'slot-1.jpg', name: 'Abandoned Soviet Space Station', model: 'chatgpt', tags: ['abandoned','space','soviet'], prompt: 'Interior of an abandoned 1970s Soviet space station now drifting in deep space. Deteriorating cosmonaut equipment, faded Cyrillic labels, floating dust particles caught in a single beam of sunlight from a cracked porthole showing infinite stars. A chess set mid-game floating in zero gravity. Everything covered in a thin layer of frost. Shot with an anamorphic lens. Haunting and beautiful and lonely.' },
      { file: 'slot-2.jpg', name: 'Silk Fabric Explosion', model: 'chatgpt', tags: ['fashion','fabric','art'], prompt: 'High-speed photography of dozens of silk scarves in every jewel tone simultaneously thrown into the air and photographed at 1/50,000th of a second. The silks form impossible organic shapes — some look like wings, some like flowers, some like ocean waves. Shot against pure white infinity backdrop. Each fabric thread individually visible. Issey Miyake meets physics experiment. The colors are electric.' },
      { file: 'slot-3.jpg', name: 'Redwood Forest Cathedral', model: 'chatgpt', tags: ['forest','nature','atmospheric'], prompt: 'Inside an ancient California redwood grove at dawn. Trees 115 meters tall and 3,000 years old form a natural cathedral. Shafts of golden morning light cut through morning fog between the massive trunks. Ferns and moss carpet the forest floor in vivid emerald. Complete silence implied. A single person standing at the base of one tree for scale — they are the size of a pinecone. Sony A1 16mm. Sacred.' },
      { file: 'slot-4.jpg', name: 'Cybernetic Botanist', model: 'chatgpt', tags: ['character','cyberpunk','botanical'], prompt: 'Character portrait: a botanist in a post-climate-change 2087 who has integrated plants directly into her cybernetic implants. Vines growing through chrome arms, moss on her shoulder plates, a real blooming orchid growing from her temple. Her eyes are biosynthetic and glow amber. She tends to a rooftop garden in rain. Warm amber and deep green palette. Feels like a real person you want to know.' },
    ]
  },
  {
    week: 5,
    prompts: [
      { file: 'slot-1.jpg', name: 'Molten Metal Splash', model: 'chatgpt', tags: ['abstract','metal','macro'], prompt: 'Ultra high-speed macro photography at 1 million frames per second of molten copper being dropped into cold water. The splash creates an impossible crown shape with perfect symmetry. The copper glows orange-white at the tip fading to deep red at the base. Steam wisps. The background is pure black. Individual droplets separating visible. Feels dangerous and beautiful. MIT materials science research photo aesthetic.' },
      { file: 'slot-2.jpg', name: 'Vertical Village Vietnam', model: 'chatgpt', tags: ['architecture','vietnam','urban'], prompt: 'A Vietnamese vertical village built organically over 200 years where families added floors one at a time, each in a different architectural style from their era — French colonial on the 3rd floor, brutalist concrete on the 7th, contemporary glass above. Laundry lines between buildings, rooftop gardens, satellite dishes, a family eating dinner visible through an open window on the 12th floor. Documentary photography. Warm afternoon.' },
      { file: 'slot-3.jpg', name: 'Horse and Lightning', model: 'chatgpt', tags: ['horse','storm','nature'], prompt: 'A lone white horse standing perfectly still in an open field as four simultaneous lightning bolts strike the ground in a semicircle around it. The horse is completely calm, backlit by the electrical storm, mane moving in the electromagnetic wind. Long exposure 8 seconds. Perfectly centered composition. The horse looks like it summoned the storm. One of the most dramatic wildlife photographs ever taken.' },
      { file: 'slot-4.jpg', name: 'Miniature Food World', model: 'chatgpt', tags: ['food','miniature','creative'], prompt: 'Miniature photography where a ramen bowl has become an entire world — tiny figures fishing from chopsticks, a sailboat made of a nori sheet crossing the broth, a tiny mountain range made of pork belly, a village of sesame seed houses at the edge. Shot with extreme macro lens making everything look real at scale. Warm restaurant lighting. The bowl is the universe. Whimsical and technically perfect.' },
    ]
  },
  {
    week: 6,
    prompts: [
      { file: 'slot-1.jpg', name: 'Ice Cave Blue Hour', model: 'chatgpt', tags: ['ice','cave','iceland'], prompt: 'Inside a glacial ice cave in Iceland photographed at the exact moment of blue hour when ambient light turns the entire cave an impossible electric blue. The ice walls are translucent, showing air bubbles trapped inside from 10,000 years ago. A single photographer with a headlamp for scale. The cave ceiling is 40 meters up. Reflections in the perfectly still meltwater pool on the floor. The most beautiful natural blue ever photographed.' },
      { file: 'slot-2.jpg', name: 'Rust Belt Decay Beauty', model: 'chatgpt', tags: ['abandoned','industrial','art'], prompt: 'Fine art documentary photography inside an abandoned Detroit automobile factory. Decades of rust creating abstract paintings on the walls. Pigeons roosting in the collapsed ceiling letting in columns of light. The production line machinery still in place, now colonized by nature — trees growing through the floor, vines covering conveyor belts. Shot by Edward Burtynsky. The decay is as beautiful as any painting ever made.' },
      { file: 'slot-3.jpg', name: 'Underwater Library', model: 'chatgpt', tags: ['surreal','underwater','books'], prompt: 'A perfectly preserved Victorian library completely submerged underwater in crystal-clear Caribbean water. Books on mahogany shelves with pages undulating gently in the current. Reading lamps still lit with bioluminescent fish using them as shelter. A sea turtle drifts between the shelves. Light filtering down from 8 meters above. Photographed by a scuba diver at f/4. The books are perfectly readable.' },
      { file: 'slot-4.jpg', name: 'Future Food Market', model: 'chatgpt', tags: ['future','food','market'], prompt: '2080 open-air food market in Lagos, Nigeria. Vendors selling lab-grown wagyu printed in real-time, algae protein sculptures that are also art pieces, mushroom-based everything, insect flour pastries, vertical-farmed produce in shapes that do not exist in nature. Bright colorful stalls, enormous diversity of customers, flying delivery drones overhead. Photorealistic editorial photography showing a future that is abundant not dystopian.' },
    ]
  },
  {
    week: 7,
    prompts: [
      { file: 'slot-1.jpg', name: 'Diamond Dust Explosion', model: 'chatgpt', tags: ['abstract','luxury','macro'], prompt: 'A diamond being struck with a precision tool and shattering — photographed at 10 million frames per second. Thousands of perfect fragments suspended in air, each refracting light into a full spectrum. Against a pure black background the shards create a galaxy of color. Some fragments the size of dust, some still large and clear. The geometry of each piece visible. Science and luxury and violence in one image.' },
      { file: 'slot-2.jpg', name: 'Monsoon from Inside', model: 'chatgpt', tags: ['rain','india','documentary'], prompt: 'Documentary photograph from inside a traditional Indian tea stall as the monsoon hits. Through the open front of the stall, a wall of rain so dense it looks solid. A chai wallah continuing to pour tea, completely unbothered. Steam from the cups mixing with the cool rain air. Everything outside is grey-blue. Inside is warm amber. Three generations of the same family visible. Monsoon as comfort, not disaster.' },
      { file: 'slot-3.jpg', name: 'Quantum Computer Beautiful', model: 'chatgpt', tags: ['technology','quantum','beautiful'], prompt: 'IBM Quantum computer hanging from a ceiling at absolute zero — photographed at extreme close range. Gold and silver superconducting circuits arranged in perfect concentric circles like a chandelier designed by a watchmaker. Each component reflects in the others. The whole structure glows faintly blue from the cooling system. Shot with a Hasselblad on a custom macro rig. The most beautiful machine ever built.' },
      { file: 'slot-4.jpg', name: 'Desert Mirrorscape', model: 'chatgpt', tags: ['desert','mirror','surreal'], prompt: 'Bolivian salt flat at sunrise after thin layer of water covers it perfectly. The reflection is so precise the horizon disappears — sky and ground identical. A lone flamingo standing in the middle. Above: pink and orange sunrise clouds. Below: identical pink and orange sunrise clouds. The flamingo exists between two skies. Shot on DJI drone 3 meters above the water. The real world looks AI-generated. Causes vertigo.' },
    ]
  },
  {
    week: 8,
    prompts: [
      { file: 'slot-1.jpg', name: 'Coral Reef Recovery', model: 'chatgpt', tags: ['ocean','coral','hopeful'], prompt: 'Underwater photography of a coral reef 10 years into recovery — the colors more vivid than any reef in living memory. Staghorn corals in fluorescent orange, brain corals glowing purple, sea fans electric blue. A school of 10,000 fish moving as one organism through the frame. A marine biologist in the background planting a new coral fragment. Natural light at 12 meters. The ocean healing itself. National Geographic cover quality.' },
      { file: 'slot-2.jpg', name: 'Brutalist Cathedral Light', model: 'chatgpt', tags: ['architecture','brutalist','light'], prompt: 'Interior of Le Corbusier-era brutalist church at noon on a summer day. Concrete walls 30 meters high pierced by precisely calculated narrow slits. The resulting light beams are so defined they look solid. The beams move across the floor at 15mm per minute. A single visitor stands in one beam, completely illuminated, the rest of the space in dramatic shadow. God rays as architecture. Leica M11 available light only.' },
      { file: 'slot-3.jpg', name: 'Market Spice Explosion', model: 'chatgpt', tags: ['market','spice','color'], prompt: 'A Moroccan spice market vendor opening 12 sacks of different spices simultaneously — the colors exploding outward in a perfect composition. Saffron yellow, paprika red, turmeric orange, cumin brown, cardamom green, indigo blue. The vendor laughing at the chaos. Shot at 1/8000th of a second. Every particle of spice dust in sharp focus. The color combinations are painterly. Smells through the screen.' },
      { file: 'slot-4.jpg', name: 'Glacier Calving Portrait', model: 'chatgpt', tags: ['glacier','climate','dramatic'], prompt: 'The exact moment a 400-meter section of Perito Moreno glacier calves into Lago Argentino. The wall of ice mid-fall, the ocean spray not yet settled from the previous chunk. Ice the color of ancient blue — a shade of blue that does not exist anywhere else on Earth. Small tourist boats in the distance for scale showing the true size. Shot with 600mm telephoto from the safety railing. Both beautiful and heartbreaking.' },
    ]
  },
  {
    week: 9,
    prompts: [
      { file: 'slot-1.jpg', name: 'Midnight Bakers', model: 'chatgpt', tags: ['food','documentary','night'], prompt: 'Documentary photography inside a Parisian boulangerie at 3AM. Baker in flour-dusted whites pulling perfect baguettes from a 100-year-old wood-fired oven. The oven light is the only illumination. Every wrinkle on the baker face visible. Steam rising from perfect crust. 40 years of practice in his hands. Shot on Leica Q3 at ISO 6400. Black and white with orange firelight. The smell of bread implied.' },
      { file: 'slot-2.jpg', name: 'Saturn from Titan', model: 'chatgpt', tags: ['space','saturn','concept'], prompt: 'Photorealistic visualization of Saturn viewed from the surface of Titan, its largest moon. Saturn fills 45 degrees of sky — its rings tilted at 26 degrees, individual ring bands visible, the shadow of the planet cutting across the rings. Titan atmosphere tints everything amber. Methane lakes in the foreground reflecting Saturn. No artistic license — NASA JPL scientific visualization standards. More surreal than any fantasy.' },
      { file: 'slot-3.jpg', name: 'Protest As Art', model: 'chatgpt', tags: ['documentary','people','powerful'], prompt: 'Documentary photography of 50,000 people holding candles in a perfect circle in a dark city plaza seen from a helicopter directly above at 200 meters. The formation is so precise it looks designed. Each person a dot of warm light. The geometry they create together is mathematical. Total darkness outside the circle. Shot at 1/4 second, enough motion blur to make the candles glow. Human coordination as fine art.' },
      { file: 'slot-4.jpg', name: 'Iridescent Soap Bubble', model: 'chatgpt', tags: ['macro','science','color'], prompt: 'Extreme macro photography of a single soap bubble 10cm in diameter showing the entire electromagnetic spectrum visible in its surface — Newton rings of color, galaxies of interference patterns, the thin film creating colors that shift as you look at it. Shot against a pure black background. The bubble surface is 100nm thick. Individual water molecules implied. A physics textbook and a painting simultaneously. Ultra sharp.' },
    ]
  },
  {
    week: 10,
    prompts: [
      { file: 'slot-1.jpg', name: 'Mountain Village Winter', model: 'chatgpt', tags: ['village','winter','atmospheric'], prompt: 'A remote mountain village in the Dolomites photographed from directly above by drone at 7PM in December. Every window in every chalet glowing warm amber. Snow on every roof perfectly undisturbed. A single set of footprints crossing the village square. Wood smoke from chimneys visible as blue-grey wisps. The village is a living painting. Complete silence implied. Shot on DJI Mavic 3 Pro. Makes you want to go there immediately.' },
      { file: 'slot-2.jpg', name: 'Glass Blower Portrait', model: 'chatgpt', tags: ['craft','portrait','fire'], prompt: 'Environmental portrait of a 70-year-old Venetian glass master at his furnace on Murano island. He is shaping a piece of molten glass on the end of a 1.5 meter blowpipe. The glass glows orange, illuminating his face from below. 50 years of practice in his body language. His workshop is a museum of his work behind him. Shot on 85mm f/1.4. The tradition and the man and the material in one frame.' },
      { file: 'slot-3.jpg', name: 'Bees Honeycomb Architecture', model: 'chatgpt', tags: ['macro','bees','nature'], prompt: 'Aerial macro photography directly above an active honeycomb showing thousands of bees in motion — some building, some depositing honey, some fanning the comb. The hexagonal geometry perfect. Honey in different stages of processing visible: fresh clear nectar to deep amber cured honey. Beeswax white and pale gold. Shot at 1/2000th of a second freezing bee wing motion. The engineering and the life together in one frame. 8K.' },
      { file: 'slot-4.jpg', name: 'City Rain Reflection', model: 'chatgpt', tags: ['city','rain','reflection'], prompt: 'Looking straight down from 20 stories at a New York City intersection at 11PM in heavy rain. The street is a perfect mirror of Times Square lights. Yellow cabs, crossing pedestrians with umbrellas, steam grates, traffic signals all reflected with dreamlike clarity. Shot from a window on 42nd street. The street looks more vivid than reality. Rain drops visible as circles in the reflection pools. Hiroshi Sugimoto meets street photography.' },
    ]
  },
  {
    week: 11,
    prompts: [
      { file: 'slot-1.jpg', name: 'Hummingbird Suspended', model: 'chatgpt', tags: ['wildlife','macro','motion'], prompt: 'High-speed wildlife photography of a rufous hummingbird suspended perfectly still at a red flower. Shot at 1/8000th of a second freezing 80 wingbeats per second — wings in multiple positions simultaneously visible from motion blur of adjacent beats. The iridescent throat feathers lit by morning sun creating a color that has no name. Every tiny feather visible. Dew on the flower. White background of cloudy sky. The miracle of the bird made visible.' },
      { file: 'slot-2.jpg', name: 'Data Center Beautiful', model: 'chatgpt', tags: ['technology','data','abstract'], prompt: 'Fine art photography inside a hyperscale data center that has been photographed as a cathedral — vast dark space, blue LED status lights on thousands of server racks creating constellations that stretch to the horizon, coolant pipes like flying buttresses overhead, the hum of 100,000 fans like an organ chord. Shot on a 6-minute exposure. The whole frame is geometry and light. The internet made visible and beautiful.' },
      { file: 'slot-3.jpg', name: 'Monsoon Mud Athletes', model: 'chatgpt', tags: ['sport','documentary','india'], prompt: 'Documentary photograph of kabaddi players in a monsoon match in rural Maharashtra. The field is 6 inches of mud. Players in full sprint covered entirely in red clay. The tackle happening mid-frame sprays mud in a perfect arc backlit by a brief sun break through the storm clouds. 20,000 spectators behind. Unposed, un-retouched. Shot by Raghu Rai. Sport as beauty as documentary as culture in one frame.' },
      { file: 'slot-4.jpg', name: 'Comet Tail Portrait', model: 'chatgpt', tags: ['space','comet','astrophotography'], prompt: 'Astrophotography of a naked-eye comet at maximum brightness over a dark sky site in Atacama Chile. The comet nucleus a vivid blue-green from cyanogen gas, the dust tail stretching 30 degrees across the frame in warm yellow-white, the ion tail electric blue perfectly straight pointing directly away from the sun. Milky Way visible through both tails. A single observatory dome silhouetted. 15 second exposure f/2.0 ISO 3200.' },
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
