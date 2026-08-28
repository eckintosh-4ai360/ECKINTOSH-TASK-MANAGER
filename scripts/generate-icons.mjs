/**
 * Generates the PWA / favicon asset set into public/ with no image
 * dependencies — a minimal RGBA PNG encoder (zlib + CRC32) plus signed-distance
 * field drawing for the rounded tile and the checkmark.
 *
 * Run with: node scripts/generate-icons.mjs
 * Re-run only when the mark or the brand colours change; the output is committed.
 */
import { deflateSync } from "node:zlib"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public")

// ---------------------------------------------------------------- PNG encoder

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

/** `pixels` is a size*size*4 RGBA byte array. */
function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  // One filter byte (0 = None) per scanline, then the raw row.
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

// ------------------------------------------------------------------- drawing

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const mix = (a, b, t) => a + (b - a) * t
const mixRgb = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]

/** Smooth 0→1 ramp used to antialias every edge over roughly one pixel. */
function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Signed distance to a rounded box centred at the origin (negative = inside). */
function sdRoundedBox(px, py, halfW, halfH, radius) {
  const qx = Math.abs(px) - halfW + radius
  const qy = Math.abs(py) - halfH + radius
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  return outside + Math.min(Math.max(qx, qy), 0) - radius
}

/** Signed distance to the segment a→b. */
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax
  const pay = py - ay
  const bax = bx - ax
  const bay = by - ay
  const h = clamp01((pax * bax + pay * bay) / (bax * bax + bay * bay))
  return Math.hypot(pax - bax * h, pay - bay * h)
}

const NAVY_TOP = [16, 34, 66]
const NAVY_BOTTOM = [4, 17, 31]
const CYAN = [0, 212, 255]
const CYAN_DEEP = [0, 138, 190]

// The checkmark, in unit coordinates, sits inside the maskable safe zone
// (the inner 80% of the tile) so Android can crop to a circle without clipping.
const CHECK = { ax: 0.29, ay: 0.53, bx: 0.44, by: 0.67, cx: 0.73, cy: 0.35 }

/**
 * @param {number} size      output edge length in pixels
 * @param {object} [options]
 * @param {boolean} [options.fullBleed]  square tile (for maskable + apple-icon)
 * @param {boolean} [options.light]      lighter tile for light-scheme favicons
 */
function drawIcon(size, { fullBleed = false, light = false } = {}) {
  const pixels = new Uint8Array(size * size * 4)
  const px = 1 / size // one pixel, in unit coordinates
  const radius = fullBleed ? 0 : 0.22
  const strokeHalfWidth = 0.045
  const top = light ? [30, 58, 104] : NAVY_TOP
  const bottom = light ? [8, 26, 48] : NAVY_BOTTOM

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Sample at the pixel centre, in a 0..1 unit square.
      const ux = (x + 0.5) / size
      const uy = (y + 0.5) / size

      // Tile coverage: 1 inside, 0 outside, antialiased across the edge.
      const tile = fullBleed
        ? 1
        : 1 - smoothstep(-px, px, sdRoundedBox(ux - 0.5, uy - 0.5, 0.5, 0.5, radius))

      // Vertical gradient, warmed toward the top-left by a soft cyan glow.
      let rgb = mixRgb(top, bottom, uy)
      const glow = Math.max(0, 1 - Math.hypot(ux - 0.26, uy - 0.2) / 0.85)
      rgb = mixRgb(rgb, CYAN, glow * glow * 0.22)

      // Checkmark: two segments, drawn as one union so the elbow stays solid.
      const d = Math.min(
        sdSegment(ux, uy, CHECK.ax, CHECK.ay, CHECK.bx, CHECK.by),
        sdSegment(ux, uy, CHECK.bx, CHECK.by, CHECK.cx, CHECK.cy),
      )
      const stroke = 1 - smoothstep(strokeHalfWidth - px, strokeHalfWidth + px, d)
      // Shade the stroke along its length so it reads as lit from the top-right.
      rgb = mixRgb(rgb, mixRgb(CYAN_DEEP, CYAN, clamp01((ux - 0.25) / 0.5)), stroke)

      const offset = (y * size + x) * 4
      pixels[offset] = Math.round(rgb[0])
      pixels[offset + 1] = Math.round(rgb[1])
      pixels[offset + 2] = Math.round(rgb[2])
      pixels[offset + 3] = Math.round(tile * 255)
    }
  }

  return encodePng(size, pixels)
}

const outputs = [
  ["icon-192.png", drawIcon(192)],
  ["icon-512.png", drawIcon(512)],
  ["icon-maskable-512.png", drawIcon(512, { fullBleed: true })],
  // iOS ignores transparency and applies its own corner radius, so ship it square.
  ["apple-icon.png", drawIcon(180, { fullBleed: true })],
  ["icon-dark-32x32.png", drawIcon(32)],
  ["icon-light-32x32.png", drawIcon(32, { light: true })],
]

for (const [name, buffer] of outputs) {
  writeFileSync(join(publicDir, name), buffer)
  console.log(`wrote public/${name} (${buffer.length} bytes)`)
}

// Vector favicon — same mark, hand-written so it stays crisp at any size.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Spagad">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#102242"/>
      <stop offset="1" stop-color="#04111f"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#tile)"/>
  <path d="M29 53 L44 67 L73 35" fill="none" stroke="#00d4ff" stroke-width="9"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
writeFileSync(join(publicDir, "icon.svg"), svg)
console.log("wrote public/icon.svg")
