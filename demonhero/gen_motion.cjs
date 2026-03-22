const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');

const API_KEY = 'AIzaSyD_oZDh32pGoiRnvvNeuo0J6ulPCV6Yaww';
const MODEL = 'imagen-4.0-generate-001';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${API_KEY}`;
const SPRITE_DIR = path.join(__dirname, 'src/assets/sprites');

// ===== STEP 1: Generate animation frames =====
const frames = [
  // Hero frames
  { name: 'hero_run1', prompt: 'Pixel art medieval knight character sprite, side view facing right, running pose with LEFT leg forward and right leg back, silver plate armor, glowing cyan visor, crimson cape flowing behind, holding longsword, kite shield on left arm, Hollow Knight and Shovel Knight style, clean pixel art on solid black background, 2D side-scroller, high contrast' },
  { name: 'hero_run2', prompt: 'Pixel art medieval knight character sprite, side view facing right, running pose with RIGHT leg forward and left leg back, silver plate armor, glowing cyan visor, crimson cape flowing behind, holding longsword, kite shield on left arm, Hollow Knight and Shovel Knight style, clean pixel art on solid black background, 2D side-scroller, high contrast' },
  { name: 'hero_atk', prompt: 'Pixel art medieval knight character sprite, side view facing right, ATTACKING pose with sword slashing forward horizontally, silver plate armor, glowing cyan visor, crimson cape flowing, kite shield on left arm, dynamic slash motion, Hollow Knight and Shovel Knight style, clean pixel art on solid black background, 2D side-scroller, high contrast' },

  // Patrol frames
  { name: 'patrol_walk', prompt: 'Pixel art skeleton warrior sprite, side view, WALKING pose with opposite leg forward compared to idle, tattered dark hooded cloak, exposed bones, holding rusty notched sword, glowing yellow-green eyes, Hollow Knight enemy style, clean pixel art on solid black background, 2D side-scroller game sprite' },

  // Stationary mage frame
  { name: 'stationary_cast', prompt: 'Pixel art dark wraith mage sprite, front-facing, CASTING pose with arms raised, glowing purple magical orb larger and brighter above head, hooded floating phantom in tattered purple-black robes, energy tendrils, Hollow Knight soul warrior style, clean pixel art on solid black background, 2D side-scroller game sprite' },

  // Boss frames
  { name: 'boss_alt', prompt: 'Pixel art demon king boss sprite, front-facing, AGGRESSIVE pose with arms slightly raised, massive curved ram horns, golden crown, heavy dark obsidian armor with crimson glowing runes brighter, burning red eyes more intense, spiked pauldrons, dark cape spread wide, Hollow Knight boss and Hades style, clean pixel art on solid black background, 2D game sprite, epic' },
];

function generateImage(sprite) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      instances: [{ prompt: sprite.prompt }],
      parameters: { sampleCount: 1 }
    });

    const url = new (require('url').URL)(URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.predictions && json.predictions[0]) {
            const b64 = json.predictions[0].bytesBase64Encoded;
            const outPath = path.join(SPRITE_DIR, `${sprite.name}.png`);
            fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
            console.log(`  ✓ ${sprite.name}.png generated`);
            resolve();
          } else {
            console.error(`  ✗ ${sprite.name}: ${JSON.stringify(json).slice(0, 200)}`);
            reject(new Error(`Failed: ${sprite.name}`));
          }
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ===== STEP 2: Remove black background =====
async function makeTransparent(filePath) {
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Remove near-black pixels (threshold 35)
    if (r < 35 && g < 35 && b < 35) {
      data[i + 3] = 0;
    }
    // Soften edges near black for anti-aliasing
    else if (r < 60 && g < 60 && b < 60) {
      const brightness = Math.max(r, g, b);
      data[i + 3] = Math.min(255, Math.floor((brightness - 35) * (255 / 25)));
    }
  }

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(filePath + '.tmp');
  fs.renameSync(filePath + '.tmp', filePath);
}

async function resizeSprite(filePath, size) {
  await sharp(filePath)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(filePath + '.tmp');
  fs.renameSync(filePath + '.tmp', filePath);
}

async function main() {
  // Step 1: Generate animation frames
  console.log('=== Generating animation frames with Imagen 4 ===\n');
  for (const frame of frames) {
    console.log(`Generating: ${frame.name}...`);
    try {
      await generateImage(frame);
    } catch (e) {
      console.log(`  Retrying ${frame.name}...`);
      await new Promise(r => setTimeout(r, 2000));
      try { await generateImage(frame); } catch (e2) {
        console.error(`  Skipped ${frame.name}: ${e2.message}`);
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Step 2: Resize new frames
  console.log('\n=== Resizing new frames ===\n');
  const newFrames = fs.readdirSync(SPRITE_DIR).filter(f =>
    f.endsWith('.png') && (f.includes('_run') || f.includes('_atk') || f.includes('_walk') || f.includes('_cast') || f.includes('_alt'))
  );
  for (const file of newFrames) {
    const filePath = path.join(SPRITE_DIR, file);
    const size = file.startsWith('boss') ? 384 : 256;
    await resizeSprite(filePath, size);
    console.log(`  Resized: ${file}`);
  }

  // Step 3: Make ALL sprites transparent
  console.log('\n=== Removing black backgrounds ===\n');
  const allFiles = fs.readdirSync(SPRITE_DIR).filter(f => f.endsWith('.png'));
  for (const file of allFiles) {
    const filePath = path.join(SPRITE_DIR, file);
    await makeTransparent(filePath);
    const size = fs.statSync(filePath).size;
    console.log(`  ✓ ${file} → transparent (${Math.round(size / 1024)}KB)`);
  }

  console.log('\nDone! All sprites are transparent and animation frames are ready.');
}

main().catch(console.error);
