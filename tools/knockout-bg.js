/* Makes the solid background of a PNG transparent.
 *
 *   node tools/knockout-bg.js logo-raw.png            -> writes logo.png
 *   node tools/knockout-bg.js in.png out.png
 *   node tools/knockout-bg.js in.png out.png --tol 70
 *
 * Use this when you have the real artwork on a flat backdrop and want it on the
 * site: the 3D hero badge extrudes a silhouette traced from logo.png's alpha
 * channel, so an emblem sitting on an opaque rectangle extrudes a rectangle.
 *
 * It flood-fills inwards from the border rather than keying every pixel of the
 * background colour globally. That distinction matters here — the crest itself
 * contains dark areas, and a global key would punch holes straight through
 * them. Only background connected to the edge is removed.
 *
 * Edge pixels get partial alpha rather than a hard cut, so the result does not
 * come out with a jagged fringe when scaled down to 46px in the nav.
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const args = process.argv.slice(2).filter(a => a !== '--tol' || false);
const tolIdx = process.argv.indexOf('--tol');
/* Number(x) || 60 silently ignores --tol 0, because zero is falsy — and 0 is a
   real setting here: it crops an already-transparent image without touching a
   single edge pixel. Test for a finite number instead. */
const tolRaw = tolIdx > -1 ? Number(process.argv[tolIdx + 1]) : NaN;
const TOL = Number.isFinite(tolRaw) ? tolRaw : 60;
const positional = process.argv.slice(2).filter((a, i, arr) =>
  !a.startsWith('--') && arr[i - 1] !== '--tol');

const ROOT = path.join(__dirname, '..');
const IN = path.resolve(ROOT, positional[0] || 'logo-raw.png');
const OUT = path.resolve(ROOT, positional[1] || 'logo.png');

if (!fs.existsSync(IN)) {
  console.error('not found: ' + IN);
  console.error('\nSave the artwork into the project first, e.g. as logo-raw.png,');
  console.error('then run:  node tools/knockout-bg.js logo-raw.png');
  process.exit(1);
}

/* ---------- decode ---------- */
function decode(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG (JPEG? re-save as PNG)');
  let off = 8, idat = [], w, h, bd, ct, il, pal = null, trns = null;
  while (off < b.length) {
    const len = b.readUInt32BE(off), type = b.toString('ascii', off + 4, off + 8);
    const d = b.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; il = d[12]; }
    if (type === 'PLTE') pal = d;
    if (type === 'tRNS') trns = d;
    if (type === 'IDAT') idat.push(d);
    if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bd !== 8) throw new Error('need an 8-bit-per-channel PNG, got ' + bd);
  if (il) throw new Error('interlaced PNG not supported — re-save without interlacing');
  const ch = ct === 6 ? 4 : ct === 2 ? 3 : ct === 3 ? 1 : ct === 4 ? 2 : ct === 0 ? 1 : 0;
  if (!ch) throw new Error('unsupported colour type ' + ct);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, img = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++], line = raw.slice(p, p + stride); p += stride;
    const cur = img.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? img.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, bb = prev[x], c = x >= ch ? prev[x - ch] : 0, v = line[x];
      let r;
      switch (ft) {
        case 0: r = v; break;
        case 1: r = v + a; break;
        case 2: r = v + bb; break;
        case 3: r = v + ((a + bb) >> 1); break;
        case 4: {
          const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
          r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? bb : c); break;
        }
        default: throw new Error('bad filter ' + ft);
      }
      cur[x] = r & 0xff;
    }
  }

  /* normalise everything to RGBA8 */
  const out = Buffer.alloc(w * h * 4);
  for (let i = 0, n = w * h; i < n; i++) {
    let r, g, bl, al = 255;
    if (ct === 6) { r = img[i * 4]; g = img[i * 4 + 1]; bl = img[i * 4 + 2]; al = img[i * 4 + 3]; }
    else if (ct === 2) { r = img[i * 3]; g = img[i * 3 + 1]; bl = img[i * 3 + 2]; }
    else if (ct === 0) { r = g = bl = img[i]; }
    else if (ct === 4) { r = g = bl = img[i * 2]; al = img[i * 2 + 1]; }
    else { const k = img[i]; r = pal[k * 3]; g = pal[k * 3 + 1]; bl = pal[k * 3 + 2]; if (trns && k < trns.length) al = trns[k]; }
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = bl; out[i * 4 + 3] = al;
  }
  return { w, h, px: out };
}

/* ---------- encode ---------- */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return buf => { let c = -1; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td));
  return Buffer.concat([len, td, crc]);
}
function encode(w, h, px) {
  const stride = w * 4, raw = Buffer.alloc(h * (stride + 1));
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------- knockout ---------- */
const { w, h, px } = decode(IN);
const at = i => [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];

/* background colour: the median of the four corners, so one odd corner pixel
   (a glow, a watermark) cannot throw it off */
const corners = [0, w - 1, (h - 1) * w, h * w - 1].map(at);
const bg = [0, 1, 2].map(c => {
  const v = corners.map(p => p[c]).sort((a, b) => a - b);
  return Math.round((v[1] + v[2]) / 2);
});
const dist = (p) => Math.sqrt((p[0] - bg[0]) ** 2 + (p[1] - bg[1]) ** 2 + (p[2] - bg[2]) ** 2);

/* flood fill inwards from every border pixel */
const seen = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
let removed = 0;
while (stack.length) {
  const i = stack.pop();
  if (seen[i]) continue;
  if (dist(at(i)) > TOL) continue;
  seen[i] = 1; removed++;
  const x = i % w, y = (i / w) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < w - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - w);
  if (y < h - 1) stack.push(i + w);
}
for (let i = 0; i < w * h; i++) if (seen[i]) px[i * 4 + 3] = 0;

/* Feather: a pixel still opaque but close to the background colour AND touching
   a removed pixel is part of the anti-aliased edge. Ramp its alpha instead of
   leaving a hard fringe. */
const FEATHER = TOL * 1.7;
let feathered = 0;
for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
  const i = y * w + x;
  if (seen[i] || px[i * 4 + 3] === 0) continue;
  if (!(seen[i - 1] || seen[i + 1] || seen[i - w] || seen[i + w])) continue;
  const d = dist(at(i));
  if (d < FEATHER) {
    const a = Math.max(0, Math.min(1, (d - TOL) / (FEATHER - TOL)));
    px[i * 4 + 3] = Math.round(px[i * 4 + 3] * a);
    feathered++;
  }
}

/* crop to what is left, with a small margin */
let minX = w, maxX = -1, minY = h, maxY = -1;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  if (px[(y * w + x) * 4 + 3] > 8) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
}
if (maxX < 0) { console.error('everything was removed — the tolerance is too high for this image'); process.exit(1); }
const M = 2;
minX = Math.max(0, minX - M); minY = Math.max(0, minY - M);
maxX = Math.min(w - 1, maxX + M); maxY = Math.min(h - 1, maxY + M);
const cw = maxX - minX + 1, chh = maxY - minY + 1;
const cropped = Buffer.alloc(cw * chh * 4);
for (let y = 0; y < chh; y++)
  px.copy(cropped, y * cw * 4, ((minY + y) * w + minX) * 4, ((minY + y) * w + maxX + 1) * 4);

fs.writeFileSync(OUT, encode(cw, chh, cropped));

const pct = (removed / (w * h) * 100).toFixed(1);
console.log('background sampled: rgb(' + bg.join(',') + ')   tolerance ' + TOL);
console.log('removed ' + pct + '% of the image, feathered ' + feathered + ' edge pixels');
console.log('cropped ' + w + 'x' + h + ' -> ' + cw + 'x' + chh);
console.log('wrote ' + path.relative(ROOT, OUT) + '  (' + (fs.statSync(OUT).size / 1024).toFixed(0) + ' KB)');
if (removed / (w * h) < 0.05)
  console.log('\nNOTE: very little was removed. If the backdrop is a gradient rather than\nflat, raise the tolerance: --tol 90');
console.log('\nnext: node tools/trace-logo.js --write   then   node tools/gen-logo-embed.js');
