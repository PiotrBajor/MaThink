const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const SIZE = 512
const BG = [10, 10, 10]
const ACCENT = [108, 92, 231]
const WHITE = [255, 255, 255]

function makeCanvas(size) {
  const px = new Uint8Array(size * size * 4)
  return { size, px }
}

function setPx(c, x, y, col) {
  if (x < 0 || y < 0 || x >= c.size || y >= c.size) return
  const i = (y * c.size + x) * 4
  c.px[i] = col[0]; c.px[i + 1] = col[1]; c.px[i + 2] = col[2]; c.px[i + 3] = 255
}

function fillRect(c, x0, y0, w, h, col) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(c, x, y, col)
}

function fillRoundRect(c, x0, y0, w, h, r, col) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = Math.max(x0 + r - x, 0, x - (x0 + w - 1 - r))
      const dy = Math.max(y0 + r - y, 0, y - (y0 + h - 1 - r))
      if (dx * dx + dy * dy <= r * r) setPx(c, x, y, col)
    }
  }
}

function line(c, x0, y0, x1, y1, thick, col) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = Math.round(x0 + (x1 - x0) * t)
    const y = Math.round(y0 + (y1 - y0) * t)
    for (let dy = -Math.floor(thick / 2); dy <= Math.ceil(thick / 2); dy++) {
      for (let dx = -Math.floor(thick / 2); dx <= Math.ceil(thick / 2); dx++) {
        setPx(c, x + dx, y + dy, col)
      }
    }
  }
}

function encodePng(c) {
  const { size, px } = c
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size * 4; x++) {
      raw[y * (size * 4 + 1) + 1 + x] = px[y * size * 4 + x]
    }
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const t = Buffer.from(type, 'ascii')
    const crcBuf = Buffer.concat([t, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(crcBuf) >>> 0, 0)
    return Buffer.concat([len, t, data, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function crc32(buf) {
  let c = ~0
  for (let n = 0; n < buf.length; n++) {
    c ^= buf[n]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function drawIcon(size) {
  const c = makeCanvas(size)
  fillRect(c, 0, 0, size, size, BG)
  const s = size / 512
  const r = 64 * s
  fillRoundRect(c, 56 * s, 48 * s, 400 * s, 400 * s, r, ACCENT)
  const t = 46 * s
  const cx0 = 256 * s - 78 * s
  const cx1 = 256 * s + 78 * s
  line(c, cx0, 256 * s, cx1, 256 * s, t, WHITE)
  line(c, 256 * s, cx0, 256 * s, cx1, t, WHITE)
  return c
}

function toIco(png, size) {
  const bmpBytes = png.length
  const header = Buffer.alloc(22)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)
  header[6] = size >= 256 ? 0 : size
  header[7] = size >= 256 ? 0 : size
  header[8] = 0
  header[9] = 0
  header.writeUInt16LE(1, 10)
  header.writeUInt16LE(32, 12)
  header.writeUInt32LE(bmpBytes, 14)
  header.writeUInt32LE(22, 18)
  return Buffer.concat([header, png])
}

const buildDir = path.join(__dirname, '..', 'build')
fs.mkdirSync(buildDir, { recursive: true })

const png512 = drawIcon(512)
const png256 = drawIcon(256)
fs.writeFileSync(path.join(buildDir, 'icon.png'), encodePng(png512))
fs.writeFileSync(path.join(buildDir, 'icon.ico'), toIco(encodePng(png256), 256))
console.log('Icons written to build/icon.png and build/icon.ico')