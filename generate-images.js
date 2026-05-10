// ═══════════════════════════════════════════════════════════
//  PROMPTAHOLICS — Weekly Image Generator
//  Rotates through ALL 44 image generation prompts
//  4 different prompts each week — never repeats until full cycle
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
const SIZE           = '1024x1024';
const QUALITY        = 'hd';
const MODEL          = 'dall-e-3';

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable not set');
  process.exit(1);
}

// ── ALL 44 IMAGE GENERATION PROMPTS ─────────────────────────
// Grouped into 11 weekly sets of 4
// Each week picks the next group — full rotation every 11 weeks
const ALL_PROMPT_SETS = [

  // WEEK 1 — Golden Hour / Action Figure / Street / Character
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Golden Hour Portrait',
      category: 'Photography',
      dalle_prompt: 'Editorial fashion portrait photograph during golden hour. Warm amber and coral light casting from the side, creating a natural rim light and hair glow. Shot with an 85mm lens at f/1.4, extremely shallow depth of field, buttery smooth bokeh background of an outdoor nature setting. Skin tones luminous and warm. Atmospheric golden haze. National Geographic meets high fashion Vogue aesthetic. Cinematic, photorealistic, 8K quality.',
      library_prompt: 'Editorial portrait of [SUBJECT] during golden hour, warm amber and coral light from the side, Sony A7R V 85mm f/1.4 GM lens, shallow depth of field, Vogue editorial aesthetic --ar 4:5 --v 7 --stylize 750 --style raw'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'AI Action Figure Box',
      category: 'Image Generation',
      dalle_prompt: 'Photorealistic product photography of a collectible action figure toy in retail packaging. A stylized character in a clear plastic blister pack mounted on vibrant branded cardboard backing. The packaging has a bold logo at the top, character name in large retro toy typography. Professional studio lighting, stark white background, sharp product photography. Ultra-realistic, 8K detail.',
      library_prompt: 'Photorealistic collectible toy packaging — [PERSON] as an action figure in clear plastic clamshell blister pack, branded cardboard backing, name [NAME] in bold retro toy font, studio lighting, stark white background --ar 2:3 --v 7 --stylize 500'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'Urban Street Photography',
      category: 'Photography',
      dalle_prompt: 'Black and white decisive moment street photography in a major city. A lone figure walking through dramatic geometric shadows on a rain-slicked urban street at night. High contrast monochrome, authentic film grain, available light only. Documentary photography style reminiscent of Henri Cartier-Bresson. Leica rangefinder aesthetic. Film noir atmosphere. Ultra-realistic.',
      library_prompt: 'Decisive moment street photography in [CITY], shot on Leica M11 35mm Summilux, available light, high contrast black and white, authentic grain, Henri Cartier-Bresson documentary style --ar 3:2 --v 6.1 --style raw --stylize 400'
    },
    {
      filename: 'character-forge.jpg',
      name: 'The Character Forge',
      category: 'Creative & Art',
      dalle_prompt: 'Professional concept art character design of an original fantasy warrior. Front-facing portrait with dramatic cinematic lighting. Intricate detailed armor with glowing runes, flowing hair, and a powerful weapon. Semi-realistic art style between anime and western comic book. Rich color palette with deep blues and gold accents. Epic fantasy aesthetic. Professional game concept art quality.',
      library_prompt: 'Design an original character: [CHARACTER CONCEPT]. Art style: [anime / western comic / semi-realistic / Pixar 3D]. Include facial features, outfit with accessories, signature weapon, color palette. Professional concept art quality, dynamic pose.'
    },
  ],

  // WEEK 2 — Cinematic / Cyberpunk / Fantasy / Product
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Cinematic Portrait',
      category: 'Image Generation',
      dalle_prompt: 'Ultra-cinematic portrait of a person with dramatic Hollywood-style lighting. ARRI Alexa camera aesthetic, anamorphic lens flares, volumetric light rays. Deep shadow contrast with warm key light. Film grain texture. Teal and orange color grade. The subject looks directly into camera with an intense, powerful expression. 8K cinematic quality.',
      library_prompt: 'Cinematic portrait, [SUBJECT], Hollywood dramatic lighting, ARRI Alexa anamorphic, volumetric rays, teal and orange color grade, film grain --ar 2:3 --v 7 --stylize 800 --style raw'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Cyberpunk City Night',
      category: 'Image Generation',
      dalle_prompt: 'Ultra-detailed cyberpunk city at night. Heavy rain with neon reflections pooling on wet streets. Flying cars weaving between massive illuminated skyscrapers. Dense futuristic megacity. Dramatic pink and teal volumetric lighting. Blade Runner 2049 aesthetic. Atmospheric fog and light rays through tall buildings. Cinematic masterpiece, photorealistic.',
      library_prompt: 'Cyberpunk city night, heavy rain, neon reflections on wet streets, flying cars, pink and teal volumetric lighting, Blade Runner aesthetic --ar 16:9 --v 7 --stylize 850 --style raw'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'Fantasy Epic Landscape',
      category: 'Image Generation',
      dalle_prompt: 'Epic fantasy landscape with ancient stone ruins on a dramatic clifftop overlooking a vast magical valley. Volumetric god rays breaking through storm clouds. Glowing magical elements in the environment. Rich warm and cool color contrast. Sweeping cinematic composition. Tolkien meets Studio Ghibli aesthetic. Ultra-detailed, painterly realism, 8K.',
      library_prompt: 'Epic fantasy landscape, ancient ruins on clifftop, volumetric god rays, magical glowing elements, Tolkien meets Studio Ghibli aesthetic --ar 16:9 --v 7 --stylize 850 --chaos 15'
    },
    {
      filename: 'character-forge.jpg',
      name: 'Studio Product Photography',
      category: 'Image Generation',
      dalle_prompt: 'Hyper-realistic commercial studio product photography of a luxury perfume bottle. Soft dramatic key light with subtle rim lighting. Pure white background. The bottle has intricate glass detail catching the light beautifully. High-end magazine advertisement quality. Apple and Chanel level product photography. 4K ultra-sharp detail, professional commercial lighting.',
      library_prompt: 'Hyper-realistic studio product shot, [PRODUCT], soft dramatic key light, rim lighting, pure white background, 85mm f/2.8, magazine ad quality --ar 1:1 --v 7 --stylize 400 --style raw'
    },
  ],

  // WEEK 3 — Surreal / Steampunk / Anime / Portrait
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Surreal Dreamscape',
      category: 'Image Generation',
      dalle_prompt: 'Breathtaking surreal dreamscape where a vast ocean floats in the sky above an endless desert. Giant clocks melt over impossible architectural structures. Mysterious glowing orbs illuminate the scene. Beksiński meets Dalí meets Simon Stålenhag. Ethereal impossible light sources. Dreamy, mysterious, slightly unsettling. Muted desaturated palette with vivid purple accents. Ultra-detailed, painterly.',
      library_prompt: 'Surreal dreamscape, [YOUR IDEA], Beksiński + Dalí + Stålenhag style, dreamy mysterious atmosphere, impossible architecture, ethereal light --ar 16:9 --v 7 --stylize 900 --weird 500'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Steampunk Master',
      category: 'Image Generation',
      dalle_prompt: 'Epic steampunk mechanical workshop filled with ornate brass and copper machinery. Massive turning gears interconnected with leather belts. Steam venting dramatically from polished pipes. Victorian architectural details with intricate mechanical beauty. A lone inventor silhouette in the foreground. Dramatic amber and golden lighting. Highly detailed, cinematic composition.',
      library_prompt: 'Epic steampunk scene: [DESCRIPTION]. Ornate brass copper machinery, turning gears, steam, Victorian details, dramatic lighting, intricate mechanical beauty --ar 16:9 --v 7 --stylize 900'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'Anime Studio Ghibli Style',
      category: 'Image Generation',
      dalle_prompt: 'Beautiful anime landscape in the style of Studio Ghibli mixed with Makoto Shinkai. A young person standing on a hilltop looking at a magical floating castle in the distance. Lush green fields with wildflowers in the foreground. Soft warm afternoon lighting with dramatic cloud formations. Incredibly detailed background art. Whimsical yet deeply emotional atmosphere. Masterpiece quality.',
      library_prompt: 'Beautiful [SUBJECT] in Studio Ghibli mixed with Makoto Shinkai style, whimsical emotional, lush backgrounds, soft lighting, magical atmosphere, masterpiece quality --ar 16:9 --v 7 --stylize 750'
    },
    {
      filename: 'character-forge.jpg',
      name: 'Photorealistic Portrait Master',
      category: 'Photography',
      dalle_prompt: 'Hyper-realistic portrait photograph. National Geographic level photography. Subject with incredibly detailed facial features, realistic eyes with natural depth and catchlight. Perfect skin texture. Dramatic Rembrandt lighting from one side. Shot on Hasselblad medium format camera with 80mm lens at f/2.8. Natural authentic expression. 8K resolution, masterpiece quality.',
      library_prompt: 'Hyper-realistic portrait of [SUBJECT] in [SETTING], National Geographic photography, intricate skin texture, realistic eyes with catchlight, cinematic lighting, 85mm f/1.8 --ar 3:4 --v 7 --style raw --stylize 600'
    },
  ],

  // WEEK 4 — Retro Sci-Fi / Watercolor / Abstract / Clay
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Retro Sci-Fi Poster',
      category: 'Image Generation',
      dalle_prompt: 'Vintage 1950s science fiction movie poster style illustration. A heroic astronaut in a retro spacesuit standing on an alien planet with two moons in the purple sky. A sleek rocketship in the background. Bold graphic colors — red, cream, and deep blue. Hand-painted poster art texture. Classic pulp fiction aesthetic. Dramatic composition with bold typography space at top.',
      library_prompt: 'Vintage 1950s retro sci-fi movie poster, [SCENE], bold graphic colors, hand-painted poster art texture, classic pulp fiction aesthetic --ar 2:3 --v 7 --stylize 700'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Watercolor Botanical Print',
      category: 'Image Generation',
      dalle_prompt: 'Delicate watercolor botanical illustration of exotic tropical flowers and leaves. Ultra-precise scientific illustration style meets fine art watercolor. Soft washes of color with intricate ink line details. White paper texture showing through. A collection of orchids, birds of paradise, and monstera leaves. Museum quality botanical art. Soft pastel palette with rich botanical greens.',
      library_prompt: 'Delicate watercolor botanical illustration of [PLANTS/FLOWERS], scientific illustration meets fine art watercolor, intricate ink details, white paper texture, museum quality --ar 3:4 --v 7 --stylize 600'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'Abstract Bauhaus Poster',
      category: 'Image Generation',
      dalle_prompt: 'Bold abstract Bauhaus-inspired geometric poster design. Strong primary colors — red, yellow, blue, and black on white. Geometric shapes — circles, triangles, rectangles — arranged in dynamic diagonal composition. Clean Swiss graphic design aesthetic. Minimalist yet powerful. Inspired by Herbert Bayer and El Lissitzky. Print-ready flat graphic design quality.',
      library_prompt: 'Bold abstract Bauhaus geometric poster, [CONCEPT], primary colors, geometric shapes, Swiss graphic design aesthetic, Herbert Bayer inspired --ar 2:3 --v 7 --stylize 800'
    },
    {
      filename: 'character-forge.jpg',
      name: '3D Pixar Clay Character',
      category: 'Image Generation',
      dalle_prompt: 'Adorable 3D rendered character in Pixar animation studio style. A small round creature with giant expressive eyes and tiny hands. Soft clay-like material texture with subsurface scattering. Warm studio lighting with soft shadows. Pastel color palette. The character has a curious, joyful expression. High quality 3D render, cinematic lighting, ultra-detailed texture.',
      library_prompt: 'Adorable 3D Pixar style clay character, [CHARACTER DESCRIPTION], giant expressive eyes, soft clay texture, subsurface scattering, warm studio lighting, pastel palette --ar 1:1 --v 7 --stylize 650'
    },
  ],

  // WEEK 5 — Neon Character / Double Exposure / Luxury Brand / Food
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Neon Retro Character',
      category: 'Image Generation',
      dalle_prompt: 'Vibrant neon-lit retro character portrait. A stylized figure in 1980s synthwave aesthetic. Neon pink and electric blue lighting against a dark background. Chrome and holographic reflections. Retro grid perspective floor. Miami Vice meets Tron aesthetic. The character wears a sleek jacket with neon trim. Ultra-detailed, cinematic, poster quality illustration.',
      library_prompt: 'Vibrant neon retro character, [CHARACTER], synthwave aesthetic, pink and blue neon lighting, chrome reflections, retro grid floor, Miami Vice meets Tron --ar 2:3 --v 7 --stylize 800'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Double Exposure Portrait',
      category: 'Image Generation',
      dalle_prompt: 'Stunning double exposure portrait photography. A human silhouette profile filled with a dense misty forest with tall pine trees. The forest textures blend seamlessly into the face. High contrast black and white with subtle blue toning. The trees create a dramatic branching pattern within the human form. Fine art photography aesthetic. Masterpiece composition.',
      library_prompt: 'Double exposure portrait, human silhouette filled with [NATURE SCENE], seamless blend, high contrast black and white, blue toning, fine art photography --ar 3:4 --v 7 --stylize 700 --style raw'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'Luxury Brand Product Ad',
      category: 'Image Generation',
      dalle_prompt: 'Ultra-premium luxury brand advertisement photography. A stunning watch displayed on black marble with dramatic side lighting creating mirror reflections. Deep black background. Single shaft of light illuminating the product details. Swiss watchmaking level of detail visible. Rolex and Cartier advertisement aesthetic. High-end commercial photography, 4K ultra-sharp.',
      library_prompt: 'Ultra-premium luxury product advertisement, [PRODUCT] on [SURFACE], dramatic single light shaft, deep black background, Rolex Cartier aesthetic, ultra-sharp commercial photography --ar 3:4 --v 7 --stylize 500 --style raw'
    },
    {
      filename: 'character-forge.jpg',
      name: 'Hyperrealistic Food Photography',
      category: 'Image Generation',
      dalle_prompt: 'Hyperrealistic food photography of a perfectly crafted gourmet burger. Steam rising from the toasted brioche bun. Fresh lettuce, tomato, and melting cheese visible in cross-section. Sesame seeds glistening. Dark moody restaurant background. Dramatic overhead key lighting. Shot on 100mm macro lens. Michelin-star restaurant quality food styling. Ultra-detailed, 8K.',
      library_prompt: 'Hyperrealistic food photography of [DISH], steam rising, perfect styling, dark moody background, overhead dramatic lighting, 100mm macro, Michelin-star quality --ar 1:1 --v 7 --stylize 500 --style raw'
    },
  ],

  // WEEK 6 — Ink Illustration / Cozy Interior / Children's Book / Vintage Newspaper
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Ink and Watercolor Illustration',
      category: 'Image Generation',
      dalle_prompt: 'Beautiful ink and watercolor illustration of a Japanese street market at night. Detailed ink linework showing lanterns, food stalls, and crowds. Loose expressive watercolor washes in warm ambers, reds, and blues. Rain-wet cobblestones reflecting lantern light. Sketchy, artistic, handmade quality. Travel journal illustration aesthetic. Fine art print quality.',
      library_prompt: 'Ink and watercolor illustration of [SCENE], detailed ink linework, loose expressive watercolor washes, sketchy handmade quality, travel journal aesthetic --ar 4:3 --v 7 --stylize 700'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Cozy Interior Scene',
      category: 'Image Generation',
      dalle_prompt: 'Incredibly cozy and warm interior scene. A reading nook with a plush armchair by a rain-streaked window. Bookshelves filled with colorful books, a warm lamp casting golden light, a steaming mug of coffee on a small table. Autumn leaves visible through the window. Soft knit blanket draped over the chair. Hygge aesthetic. Warm golden tones. Inviting and peaceful atmosphere.',
      library_prompt: 'Cozy interior scene, [SETTING DESCRIPTION], warm golden lighting, hygge aesthetic, inviting peaceful atmosphere --ar 4:3 --v 7 --stylize 600'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: "Children's Book Illustration",
      category: 'Image Generation',
      dalle_prompt: "Whimsical children's book illustration of a small fox wearing a tiny backpack exploring a giant mushroom forest. The mushrooms are taller than houses with glowing caps. Fireflies light the path. Soft rounded shapes, gentle warm colors. Inspired by Beatrix Potter and Quentin Blake illustration styles. Printed children's book page quality, full color, charming and magical.",
      library_prompt: "Whimsical children's book illustration of [CHARACTER] in [MAGICAL SETTING], soft rounded shapes, warm colors, Beatrix Potter Quentin Blake style --ar 4:3 --v 7 --stylize 650"
    },
    {
      filename: 'character-forge.jpg',
      name: 'Vintage Newspaper Portrait',
      category: 'Image Generation',
      dalle_prompt: 'Vintage 1920s newspaper halftone portrait illustration. A distinguished person rendered in classic halftone dot printing technique. Aged yellowed newsprint texture. Art deco decorative border elements. Sepia and warm grey tones. The illustration style mimics hand-engraved newspaper portraits from the Roaring Twenties. Authentic vintage printing artifacts.',
      library_prompt: 'Vintage 1920s newspaper halftone portrait of [SUBJECT], halftone dot printing, aged newsprint texture, art deco border, sepia tones, 1920s illustration style --ar 3:4 --v 7 --stylize 750'
    },
  ],

  // WEEK 7 — Impressionist / Minimalist / Dreamy Architecture / Claymation
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Impressionist Oil Painting',
      category: 'Image Generation',
      dalle_prompt: 'Stunning impressionist oil painting of a sun-drenched French countryside. Rolling lavender fields stretching to the horizon with a farmhouse in the distance. Thick impasto brushwork visible. Dappled sunlight through poplar trees. Palette of violet, gold, and emerald. Claude Monet and Van Gogh inspired technique. Museum-quality canvas painting with visible texture.',
      library_prompt: 'Impressionist oil painting of [LANDSCAPE SCENE], thick impasto brushwork, dappled sunlight, Monet Van Gogh technique, museum quality canvas texture --ar 4:3 --v 7 --stylize 900'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Minimalist Logo Concept',
      category: 'Image Generation',
      dalle_prompt: 'Clean minimalist logo design for a premium tech company. A single geometric abstract mark combining a circle and lightning bolt in deep navy and electric orange. Perfectly balanced negative space. Swiss design principles. Displayed on white background with generous spacing. Professional brand identity quality. Vector-clean lines. Corporate but distinctive.',
      library_prompt: 'Clean minimalist logo design for [COMPANY TYPE], geometric abstract mark, [COLOR PALETTE], Swiss design principles, negative space, professional brand identity --ar 1:1 --v 7 --stylize 400'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'Dreamy Surreal Architecture',
      category: 'Image Generation',
      dalle_prompt: 'Dreamlike surreal architecture where a grand baroque palace floats on clouds in a pastel sunset sky. The building defies gravity with staircases leading to nowhere. Giant flowers grow from the towers. Soft pink and lavender sky. Windows glow with warm golden light. Part fantasy illustration, part architectural render. Whimsical and impossible beauty.',
      library_prompt: 'Dreamy surreal architecture, [BUILDING TYPE] floating in [SURREAL SETTING], impossible staircases, giant flowers, pastel sky, whimsical fantasy architecture --ar 16:9 --v 7 --stylize 850 --weird 300'
    },
    {
      filename: 'character-forge.jpg',
      name: 'Claymation World Diorama',
      category: 'Image Generation',
      dalle_prompt: 'Adorable stop-motion claymation style miniature world diorama. A tiny clay village nestled in rolling green hills under a bright blue sky with puffy white clouds. Each house has a unique color and personality. Clay trees with rounded puffs. Tiny clay people going about their day. Laika Studios and Aardman Animations aesthetic. Professional studio photography, macro lens, sharp focus.',
      library_prompt: 'Claymation world diorama, [SCENE DESCRIPTION], stop-motion clay aesthetic, Laika Aardman style, macro photography, sharp focus professional studio --ar 16:9 --v 7 --stylize 600'
    },
  ],

  // WEEK 8 — Car Night Scene / Split Portrait / Cinematic Scene / Ghibli Real World
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Cinematic Car Night Scene',
      category: 'Image Generation',
      dalle_prompt: 'Cinematic nighttime automotive photography of a sleek sports car on a wet city street. Neon lights reflecting on the rain-soaked road around the vehicle. Long exposure light trails from passing traffic. The car gleams under streetlights. Low wide-angle perspective. Cinematic car commercial aesthetic. Deep blacks with vivid neon colors. 8K resolution, ultra-detailed bodywork.',
      library_prompt: 'Cinematic nighttime automotive photography, [CAR MODEL] on wet city street, neon reflections, light trails, low wide angle, car commercial aesthetic --ar 16:9 --v 7 --stylize 750 --style raw'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Split Transformation Portrait',
      category: 'Image Generation',
      dalle_prompt: 'Dramatic split-face transformation portrait showing two contrasting worlds. The left half shows a realistic human face in natural daylight. The right half transforms into a glowing geometric digital avatar with circuit patterns. A perfect vertical divide down the center of the face. Human meets machine. Photorealistic on one side, digital art on the other. Seamless blend at the center divide.',
      library_prompt: 'Split transformation portrait, left half realistic [SUBJECT], right half transforms to [ALTERNATE STATE], seamless vertical divide, photorealistic meets digital art --ar 3:4 --v 7 --stylize 750'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'Cinematic Scene Builder',
      category: 'Image Generation',
      dalle_prompt: 'Breathtaking cinematic landscape of a lone lighthouse on a dramatic rocky coastline during a violent storm. Massive waves crashing against the rocks sending spray 20 meters high. The lighthouse beam cuts through dark storm clouds. Lightning illuminates the scene. Volumetric god rays through the clouds. Teal and dark grey color grade. Shot on ARRI Alexa, 24mm anamorphic lens. 8K quality.',
      library_prompt: 'Breathtaking cinematic scene: [SCENE DESCRIPTION]. Shot on ARRI Alexa 65, anamorphic lens, dramatic volumetric lighting, [COLOR GRADE] color grade, atmospheric elements, 21:9 widescreen --ar 21:9 --v 7 --stylize 750 --style raw'
    },
    {
      filename: 'character-forge.jpg',
      name: 'Studio Ghibli Real World',
      category: 'Image Generation',
      dalle_prompt: 'A real-world city street rendered in perfect Studio Ghibli animation style. Tokyo back alley with hanging laundry, potted plants, and warm lantern light. Hand-painted background art quality. Incredibly detailed environmental storytelling. The scene feels like a frame from Spirited Away or My Neighbor Totoro. Soft evening light, warm colors, magical mundane beauty.',
      library_prompt: 'Real world [LOCATION] rendered in Studio Ghibli animation style, hand-painted background art, warm lantern light, detailed environmental storytelling, Spirited Away Totoro aesthetic --ar 16:9 --v 7 --stylize 800'
    },
  ],

  // WEEK 9 — Fantasy Cinematic / Character Concept / Product Shot / Midjourney Alchemist
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Fantasy Cinematic Prompt Generator',
      category: 'Image Generation',
      dalle_prompt: 'Legendary fantasy concept art of an ancient dragon perched atop a ruined castle tower at twilight. The dragon has iridescent scales that catch the dying light. Intricate details on every scale. Volumetric god rays breaking through storm clouds behind the creature. Epic scale with tiny silhouetted figures below for scale. Weta Digital and Blizzard Entertainment level concept art. Ultra-detailed, cinematic.',
      library_prompt: 'Epic fantasy scene: [YOUR IDEA]. Weta Digital Blizzard level concept art, volumetric god rays, intricate details, epic scale --ar 16:9 --v 7 --stylize 900 --chaos 10'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Character Concept Artist',
      category: 'Image Generation',
      dalle_prompt: 'Professional character concept art sheet for a female cyberpunk hacker. Front 3/4 view showing intricate costume details. Neon-lit tech armor with holographic displays embedded in the gauntlets. Augmented eye implant glowing blue. Short white hair. Confident powerful stance. Riot Games and CD Projekt Red level character design. Cinematic key art lighting. Ultra-detailed costume design.',
      library_prompt: 'Professional character concept art for [CHARACTER DESCRIPTION], Riot Games CD Projekt Red level design, intricate costume details, cinematic key art lighting, 4 variations --ar 2:3 --v 7 --stylize 700'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'Professional Product Shot Studio',
      category: 'Image Generation',
      dalle_prompt: 'Hyper-realistic studio product shot of a premium sneaker floating in mid-air against a deep black background. Dramatic single studio light from the upper left creating perfect shadow detail. The shoe material texture — leather, mesh, rubber sole — rendered in exquisite detail. Particles of dust caught in the light beam. Nike and Adidas commercial photography level quality. 4K ultra-sharp.',
      library_prompt: 'Hyper-realistic studio product shot for [PRODUCT], dramatic single studio light, deep black background, exquisite material detail, Nike Adidas commercial quality --ar 1:1 --v 7 --stylize 400 --style raw'
    },
    {
      filename: 'character-forge.jpg',
      name: 'Surreal Dreamscape Engineer',
      category: 'Image Generation',
      dalle_prompt: 'Breathtaking surreal dreamscape of a vast library that exists inside a giant glass snowglobe floating in space. The library has infinite floors visible through the curved glass. Stars and nebulae visible in the space beyond. Inside, tiny people browse impossible book collections. Warm golden library light contrasts with the cold blue of space. Magical, impossible, beautiful.',
      library_prompt: 'Breathtaking surreal dreamscape: [YOUR IDEA]. Beksiński + Dalí style, dreamy mysterious emotional, impossible architecture, ethereal light, main prompt + two wild variations.'
    },
  ],

  // WEEK 10 — Ultimate Cinematic / Fantasy World / Dark Cyberpunk / Anime Ghibli v2
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Ultimate Cinematic Master',
      category: 'Image Generation',
      dalle_prompt: 'Hollywood cinematographer level cinematic image. A lone samurai standing at the edge of a misty bamboo forest at dawn. Soft morning fog diffusing the rising sun behind them. Their silhouette perfectly framed by towering bamboo stalks. The scene feels like the opening frame of a Kurosawa film. Anamorphic lens characteristics. Warm amber and cool grey color grade. 8K quality.',
      library_prompt: 'Hollywood cinematic image of [SCENE], dramatic lighting, volumetric god rays, cinematic color grade, specific camera angle and lens, [DIRECTOR] film aesthetic --ar 21:9 --v 7 --stylize 800 --style raw'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Fantasy World Builder',
      category: 'Image Generation',
      dalle_prompt: 'Magnificent fantasy world establishing shot. A vast ancient city built into the side of a towering mountain, with thousands of lights visible across its terraced architecture. Floating islands with waterfalls cascade nearby. Dragons circle distant peaks. A massive magical aurora lights the night sky in greens and purples. Epic scope and scale. Tolkien meets Avatar aesthetic. Ultra-detailed, cinematic.',
      library_prompt: 'Epic fantasy scene: [YOUR WORLD IDEA]. Legendary fantasy art director, ancient architecture, magical effects, dramatic sky, rich atmosphere, main prompt + 3 creative variations.'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'Dark Cyberpunk Neon Noir',
      category: 'Image Generation',
      dalle_prompt: 'Moody neon noir cyberpunk street level scene. Rain soaked alley in a dystopian megacity. A lone figure in a long coat walks away from camera. Holographic advertisements flicker on crumbling walls. Puddles reflect neon kanji signs. Atmospheric steam rising from grates. Heavy film grain. Deep shadows with pink and blue neon accent lights. Syd Mead and Ridley Scott aesthetic.',
      library_prompt: 'Ultra-detailed cyberpunk scene: [DESCRIPTION]. Heavy rain, neon reflections, flying cars, volumetric lighting, pink and teal color grading, Blade Runner aesthetic --ar 16:9 --v 7 --stylize 850 --style raw'
    },
    {
      filename: 'character-forge.jpg',
      name: 'Midjourney Prompt Alchemist',
      category: 'Image Generation',
      dalle_prompt: 'Extraordinary mixed media digital artwork blending photography, illustration, and 3D rendering. A portrait of a person whose face gradually dissolves into an explosion of colorful butterflies, flowers, and geometric crystalline structures. Half realistic, half surreal explosion of color and form. Dynamic composition with the subject centered. Vibrant color palette. Museum quality art print.',
      library_prompt: 'Transform your basic idea into a masterpiece Midjourney prompt: [YOUR RAW IDEA]. Advanced parameters, lighting, mood, artist references, technical boosters. A) Main prompt B) Parameters C) 3 variations.'
    },
  ],

  // WEEK 11 — Steampunk v2 / Abstract v2 / Impressionist v2 / Character v2
  [
    {
      filename: 'golden-hour-portrait.jpg',
      name: 'Ultimate Midjourney Builder',
      category: 'Image Generation',
      dalle_prompt: 'Spectacular aerial view of a volcanic island chain at golden hour. Molten lava flowing into the ocean creating dramatic steam explosions where they meet. The islands are lush green against the dark volcanic rock. Aerial drone perspective at 500 meters. The Pacific Ocean stretches to the horizon catching the golden light. National Geographic level photography. 8K ultra-detail.',
      library_prompt: 'Generate 10 cinematic Midjourney prompts for [TOPIC] with camera angles, lighting, atmosphere, artistic style, texture detail, color palette, and cinematic composition. Hollywood-level quality.'
    },
    {
      filename: 'action-figure-box.jpg',
      name: 'Character Design Expert',
      category: 'Image Generation',
      dalle_prompt: 'Highly detailed original character design concept art. A mysterious masked vigilante with an elaborate costume combining Japanese oni mask aesthetics with modern tactical gear. Dark navy and crimson color scheme. Flowing tattered cape. Twin blades crossed on back. Standing in dramatic rain with city lights behind. Detailed from mask to boots. DC Comics meets manga aesthetic.',
      library_prompt: 'Design a highly detailed original character: [DESCRIPTION]. Include outfit, expression, pose, lighting, color palette, personality, background. Ready-to-use image prompt + 4 variations.'
    },
    {
      filename: 'urban-street-photography.jpg',
      name: 'DALL-E Illustration Style',
      category: 'Image Generation',
      dalle_prompt: 'Vibrant editorial illustration of a futuristic green city. Massive vertical gardens covering skyscrapers, solar panels integrated into every surface, flying electric vehicles, and happy diverse citizens in public parks. Bold flat illustration style with clean lines. Optimistic near-future aesthetic. Bold saturated colors. Urban planning utopia visualization. Graphic novel quality artwork.',
      library_prompt: 'DALL-E 3 illustration: [CONCEPT]. Vibrant editorial style, bold flat illustration, clean lines, optimistic aesthetic, saturated colors, graphic novel quality.'
    },
    {
      filename: 'character-forge.jpg',
      name: 'Anime Character Portrait',
      category: 'Image Generation',
      dalle_prompt: 'Stunning anime character portrait in a premium modern anime style. A young warrior with striking heterochromia eyes — one silver, one gold — wind-blown white hair with blue tips. Elegant battle uniform with intricate embroidery detail. Cherry blossom petals swirling around them. Dramatic backlit sunset. The character radiates strength and mystery. Makoto Shinkai lighting quality. Ultra-detailed.',
      library_prompt: 'Anime character portrait: [CHARACTER DESCRIPTION], modern premium anime style, dramatic lighting, intricate costume details, [SETTING], Makoto Shinkai lighting quality --ar 2:3 --v 7 --stylize 750'
    },
  ],

];

// ── WEEK SELECTION ───────────────────────────────────────────
function getWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
}

function getThisWeeksPrompts() {
  const weekNum = getWeekNumber();
  const setIndex = (weekNum - 1) % ALL_PROMPT_SETS.length;
  console.log(`📅 Week ${weekNum} of year → Prompt Set ${setIndex + 1} of ${ALL_PROMPT_SETS.length}`);
  return ALL_PROMPT_SETS[setIndex];
}

// ── HELPERS ──────────────────────────────────────────────────
function ensureImagesDir() {
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log(`📁 Created images directory`);
  }
}

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
          if (parsed.error) reject(new Error(`OpenAI API Error: ${parsed.error.message}`));
          else resolve(parsed.data[0].url);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
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
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(filepath); });
    }).on('error', (err) => { fs.unlink(filepath, () => {}); reject(err); });
  });
}

function saveMetadata(prompts) {
  const meta = {
    generated_at: new Date().toISOString(),
    week: getWeekNumber(),
    set_index: (getWeekNumber() - 1) % ALL_PROMPT_SETS.length + 1,
    total_sets: ALL_PROMPT_SETS.length,
    images: prompts.map(p => ({
      filename: p.filename,
      name: p.name,
      category: p.category,
      library_prompt: p.library_prompt
    }))
  };
  fs.writeFileSync(path.join(IMAGES_DIR, 'metadata.json'), JSON.stringify(meta, null, 2));
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  const PROMPTS = getThisWeeksPrompts();

  console.log('🎨 Promptaholics Weekly Image Generator');
  console.log(`📅 ${new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}`);
  console.log(`🔄 Rotating through ${ALL_PROMPT_SETS.length} weekly sets — never repeats for ${ALL_PROMPT_SETS.length} weeks`);
  console.log(`🖼  This week's prompts:`);
  PROMPTS.forEach((p, i) => console.log(`   ${i+1}. ${p.name}`));
  console.log(`💰 Estimated cost: $${(PROMPTS.length * 0.08).toFixed(2)}`);
  console.log('─'.repeat(60));

  ensureImagesDir();
  const results = [];

  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i];
    console.log(`\n[${i+1}/${PROMPTS.length}] Generating: ${p.name}`);
    try {
      let imageUrl = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`  → Calling DALL·E 3 API (attempt ${attempt})...`);
          imageUrl = await generateImage(p.dalle_prompt);
          break;
        } catch (err) {
          if (attempt < 3) {
            console.log(`  ⚠️ Attempt ${attempt} failed: ${err.message}`);
            console.log(`  ⏳ Retrying in 30 seconds...`);
            await new Promise(r => setTimeout(r, 30000));
          } else throw err;
        }
      }
      console.log(`  ✅ Image generated`);
      const filepath = path.join(IMAGES_DIR, p.filename);
      await downloadImage(imageUrl, filepath);
      const stats = fs.statSync(filepath);
      console.log(`  ✅ Saved (${(stats.size/1024).toFixed(0)}KB) → /images/${p.filename}`);
      results.push({ ...p, success: true });
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      results.push({ ...p, success: false, error: err.message });
    }
    if (i < PROMPTS.length - 1) {
      console.log(`  ⏳ Waiting 65 seconds (rate limit)...`);
      await new Promise(r => setTimeout(r, 65000));
    }
  }

  saveMetadata(results.filter(r => r.success));

  console.log('\n' + '─'.repeat(60));
  const successes = results.filter(r => r.success).length;
  console.log(`✅ Generated: ${successes}/${PROMPTS.length} images`);
  results.filter(r => !r.success).forEach(r => console.log(`❌ Failed: ${r.name} — ${r.error}`));
  process.exit(successes === 0 ? 1 : 0);
}

main().catch(err => { console.error('💥 Fatal:', err); process.exit(1); });
