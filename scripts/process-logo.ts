// Process the uploaded GoviSahana logo:
// 1. Make the light-gray/off-white background transparent
// 2. Create a favicon (icon-only crop — top portion)
// 3. Create OG + apple-touch icons
import sharp from 'sharp'
import path from 'node:path'

const SRC = path.join(process.cwd(), 'public', 'logo.png')
const OUT_DIR = path.join(process.cwd(), 'public')

async function main() {
  const meta = await sharp(SRC).metadata()
  console.log('source:', meta.width, 'x', meta.height)

  // Get raw pixels with alpha
  const { data, info } = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // 1. Make near-white background transparent
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    if (lum > 0.93) {
      data[i + 3] = 0 // transparent
    }
  }

  const rawLogo = { data, raw: { width: info.width, height: info.height, channels: 4 } }

  // Full logo, transparent background
  await sharp(data, { raw: rawLogo.raw })
    .png()
    .toFile(path.join(OUT_DIR, 'logo-transparent.png'))
  console.log('✓ logo-transparent.png')

  // 2. Icon-only crop (top ~46% of the stacked logo = the circle)
  const iconHeight = Math.round(info.height * 0.46)
  await sharp(data, { raw: rawLogo.raw })
    .extract({ left: 0, top: 0, width: info.width, height: iconHeight })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT_DIR, 'logo-icon.png'))
  console.log('✓ logo-icon.png (64x64)')

  // 3. Favicon variants
  await sharp(path.join(OUT_DIR, 'logo-icon.png')).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(OUT_DIR, 'favicon-32.png'))
  await sharp(path.join(OUT_DIR, 'logo-icon.png')).resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(OUT_DIR, 'favicon-16.png'))
  await sharp(path.join(OUT_DIR, 'logo-icon.png')).resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(OUT_DIR, 'favicon.png'))
  console.log('✓ favicon.png / favicon-32.png / favicon-16.png')

  // 4. Apple touch icon 180x180 on white
  await sharp(path.join(OUT_DIR, 'logo-icon.png'))
    .resize(140, 140, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({ top: 20, bottom: 20, left: 20, right: 20, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(OUT_DIR, 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png (180x180)')

  // 5. OG image 1200x630 with the full logo centered on brand green
  await sharp(path.join(OUT_DIR, 'logo-transparent.png'))
    .resize(600, 286, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 172, bottom: 172, left: 300, right: 300, background: { r: 22, g: 85, b: 45, alpha: 1 } })
    .png()
    .toFile(path.join(OUT_DIR, 'og-image.png'))
  console.log('✓ og-image.png (1200x630)')

  console.log('\nAll logo assets generated in /public')
}

main().catch((e) => { console.error(e); process.exit(1) })
