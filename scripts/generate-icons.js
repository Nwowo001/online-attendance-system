const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function u32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(combined);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([u32BE(data.length), typeBuf, data, crcBuf]);
}

function makePNG(size) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR: width, height, bit depth=8, color type=2 (RGB), compression=0, filter=0, interlace=0
  const ihdrData = Buffer.concat([
    u32BE(size), u32BE(size),
    Buffer.from([8, 2, 0, 0, 0])
  ]);
  const ihdr = pngChunk('IHDR', ihdrData);

  // Build pixel rows
  const rows = [];
  const r = Math.round(size * 0.18); // corner radius

  for (let y = 0; y < size; y++) {
    const row = [0]; // filter type none
    for (let x = 0; x < size; x++) {
      // Determine if inside rounded rect
      const cx = Math.min(Math.max(x, r), size - 1 - r);
      const cy = Math.min(Math.max(y, r), size - 1 - r);
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));

      if (dist > r) {
        // Outside rounded corner - white background
        row.push(255, 255, 255);
      } else {
        // Blue background #2563eb = rgb(37, 99, 235)
        row.push(37, 99, 235);
      }
    }
    rows.push(...row);
  }

  const rawData = Buffer.from(rows);
  const compressed = zlib.deflateSync(rawData, { level: 6 });
  const idat = pngChunk('IDAT', compressed);
  const iend = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const png192 = makePNG(192);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);
console.log('Created icon-192.png (' + png192.length + ' bytes)');

const png512 = makePNG(512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
console.log('Created icon-512.png (' + png512.length + ' bytes)');

console.log('Done!');
