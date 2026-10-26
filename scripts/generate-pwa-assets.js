const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'client', 'public');
const SOURCE_SVG = path.join(PUBLIC_DIR, 'favicon.svg');

const BACKGROUND = '#667eea';

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const MASKABLE_SIZES = [192, 512];

const SPLASH_TARGETS = [
  { width: 640, height: 1136, name: 'splash-640x1136.png' },
  { width: 750, height: 1334, name: 'splash-750x1334.png' },
  { width: 828, height: 1792, name: 'splash-828x1792.png' },
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' },
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' },
  { width: 1536, height: 2048, name: 'splash-1536x2048.png' },
  { width: 1668, height: 2388, name: 'splash-1668x2388.png' },
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' }
];

function log(msg, color = 'white') {
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    red: '\x1b[31m',
    white: '\x1b[37m'
  };
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generateIcons(svgBuffer) {
  log('\n📱 Generating PWA icons...', 'cyan');

  for (const size of ICON_SIZES) {
    const outPath = path.join(PUBLIC_DIR, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    log(`   ✓ icon-${size}x${size}.png`, 'gray');
  }
}

async function generateMaskable(svgBuffer) {
  log('\n🎭 Generating maskable icons...', 'cyan');

  for (const size of MASKABLE_SIZES) {
    const outPath = path.join(PUBLIC_DIR, `maskable-${size}x${size}.png`);
    const innerSize = Math.round(size * 0.8);

    const inner = await sharp(svgBuffer)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: BACKGROUND
      }
    })
      .composite([{ input: inner, gravity: 'center' }])
      .png()
      .toFile(outPath);

    log(`   ✓ maskable-${size}x${size}.png`, 'gray');
  }
}

async function generateAppleTouch(svgBuffer) {
  log('\n🍎 Generating Apple touch icon...', 'cyan');

  const size = 180;
  const outPath = path.join(PUBLIC_DIR, 'apple-touch-icon.png');

  const innerSize = Math.round(size * 0.8);
  const inner = await sharp(svgBuffer)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND
    }
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(outPath);

  log(`   ✓ apple-touch-icon.png (180×180)`, 'gray');
}

async function generateSplashes(svgBuffer) {
  log('\n💦 Generating splash screens...', 'cyan');

  for (const target of SPLASH_TARGETS) {
    const outPath = path.join(PUBLIC_DIR, target.name);

    const logoSize = Math.round(Math.min(target.width, target.height) * 0.25);
    const inner = await sharp(svgBuffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: target.width,
        height: target.height,
        channels: 4,
        background: BACKGROUND
      }
    })
      .composite([{ input: inner, gravity: 'center' }])
      .png()
      .toFile(outPath);

    log(`   ✓ ${target.name}`, 'gray');
  }
}

async function main() {
  log('\n═══════════════════════════════════════════════', 'cyan');
  log(' PWA Asset Generator', 'cyan');
  log('═══════════════════════════════════════════════', 'cyan');

  if (!fs.existsSync(SOURCE_SVG)) {
    log(`\n❌ Source SVG not found: ${SOURCE_SVG}`, 'red');
    log('   Make sure client/public/favicon.svg exists.', 'yellow');
    process.exit(1);
  }

  await ensureDir(PUBLIC_DIR);

  log(`\n📂 Source: ${SOURCE_SVG}`, 'white');
  log(`📂 Output: ${PUBLIC_DIR}`, 'white');
  log(`🎨 Background: ${BACKGROUND}`, 'white');

  const svgBuffer = fs.readFileSync(SOURCE_SVG);

  const startTime = Date.now();

  try {
    await generateIcons(svgBuffer);
    await generateMaskable(svgBuffer);
    await generateAppleTouch(svgBuffer);
    await generateSplashes(svgBuffer);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    const totalFiles = ICON_SIZES.length + MASKABLE_SIZES.length + 1 + SPLASH_TARGETS.length;

    log('\n═══════════════════════════════════════════════', 'green');
    log(` ✅ Generated ${totalFiles} assets in ${duration}s`, 'green');
    log('═══════════════════════════════════════════════', 'green');

    const readme = [
      '',
      '# Generated PWA Assets',
      '',
      'These files are auto-generated by `scripts/generate-pwa-assets.js`.',
      'Do not edit manually — regenerate from `favicon.svg` instead.',
      '',
      '## Files',
      '',
      '### Icons',
      ...ICON_SIZES.map((s) => `- \`icon-${s}x${s}.png\``),
      '',
      '### Maskable Icons (for Android adaptive icons)',
      ...MASKABLE_SIZES.map((s) => `- \`maskable-${s}x${s}.png\``),
      '',
      '### Apple Touch Icon',
      '- `apple-touch-icon.png` (180×180)',
      '',
      '### iOS Splash Screens',
      ...SPLASH_TARGETS.map((s) => `- \`${s.name}\``),
      '',
      '## Regenerate',
      '',
      '```bash',
      'npm run pwa',
      '```'
    ].join('\n');

    fs.writeFileSync(path.join(PUBLIC_DIR, 'PWA-ASSETS.md'), readme);
    log('\n📝 Wrote PWA-ASSETS.md', 'gray');
  } catch (err) {
    log(`\n❌ Generation failed: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  }
}

main();