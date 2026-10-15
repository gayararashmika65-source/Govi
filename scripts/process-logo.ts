// Process the ORIGINAL GoviSahana logo (icon-only, no text).
// Source: upload/pasted_image_1792070560711.png (actually a JPEG, 1024x996, pale cream background)
// Goal:
//  1. Remove the pale cream/off-white background → transparent
//  2. Tight-crop to the circular logo
//  3. Generate: logo.png (full, transparent), logo-icon.png (64), favicon variants, apple-touch, og-image
import sharp from 'sharp'
import path from 'node:path'
import fs from 'node:fs'

const SRC = '/home/z/my-project/upload/pasted_image_1792070560711.png'
const OUT = '/home/z/my-project/public'

async function main() {
  // 1. Load raw pixels
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  console.log('source:', info.width, 'x', info.height, 'channels:', info.channels)

  // 2. Make near-white / pale-cream pixels transparent.
  //    The background is pale cream (high luminance, slight warmth). Threshold luminance > 0.90.
  //    The dark green ring and green leaves are well below this.
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    // Also catch very light cream (slightly warm) — check max channel is high
    const maxCh = Math.max(r, g, b)
    if (lum > 0.90 && maxCh > 220) {
      data[i + 3] = 0 // transparent
    }
  }

  // 3. Find bounding box of remaining (non-transparent) content
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4
      if (data[i + 3] !== 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  console.log('content bbox:', { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY })

  // 4. Crop tight to content, with a small 4px padding
  const pad = 6
  const cropX = Math.max(0, minX - pad)
  const cropY = Math.max(0, minY - pad)
  const cropW = Math.min(info.width - cropX, (maxX - minX) + pad * 2)
  const cropH = Math.min(info.height - cropY, (maxY - minY) + pad * 2)

  // Build the cropped raw buffer
  const cropped = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .png({ compressionLevel: 9 })
    .toBuffer()

  // 5. Write the full transparent logo
  fs.writeFileSync(path.join(OUT, 'logo-transparent.png'), cropped)
  console.log('✓ logo-transparent.png', cropW, 'x', cropH)

  // 6. logo-icon.png — 64x64 square, contained
  await sharp(cropped)
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(OUT, 'logo-icon.png'))
  console.log('✓ logo-icon.png (64x64)')

  // 7. Favicon variants
  await sharp(cropped).resize(16, 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(OUT, 'favicon-16.png'))
  await sharp(cropped).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(OUT, 'favicon-32.png'))
  await sharp(cropped).resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(OUT, 'favicon.png'))
  await sharp(cropped).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(OUT, 'favicon-96.png'))
  console.log('✓ favicon-16/32/48/96.png')

  // 8. apple-touch-icon.png — 180x180 on white
  await sharp(cropped)
    .resize(150, 150, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .extend({ top: 15, bottom: 15, left: 15, right: 15, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(OUT, 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png (180x180)')

  // 9. og-image.png — 1200x630 with the icon centered on brand green
  await sharp(cropped)
    .resize(440, 440, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 95, bottom: 95, left: 380, right: 380, background: { r: 22, g: 85, b: 45, alpha: 1 } })
    .png()
    .toFile(path.join(OUT, 'og-image.png'))
  console.log('✓ og-image.png (1200x630)')

  // 10. Keep logo.png as the full transparent version too (for any direct refs)
  fs.copyFileSync(path.join(OUT, 'logo-transparent.png'), path.join(OUT, 'logo.png'))
  console.log('✓ logo.png (alias of logo-transparent.png)')

  console.log('\nAll logo assets regenerated from the original icon.')
}

main().catch((e) => { console.error(e); process.exit(1) })
