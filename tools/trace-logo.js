/* Re-derives the 3D badge geometry from logo.png.
 *
 * The hero badge is not a picture of the logo on a card — it is an extruded
 * solid whose silhouette is traced from logo.png's own alpha channel, with the
 * artwork UV-cropped to the opaque pixels so the two line up exactly. That means
 * replacing logo.png with a differently shaped emblem breaks the badge: the
 * extrusion keeps the OLD outline while the texture shows the NEW art.
 *
 * Run this after replacing logo.png:
 *   node tools/trace-logo.js            # report only
 *   node tools/trace-logo.js --write    # also patch index.html
 *
 * It prints (and optionally writes) two things:
 *   SHIELD_OUTLINE  the traced silhouette, in the shape units the extrude uses
 *   U0/U1/V0/V1     the UV crop, from the opaque-pixel bounds
 *
 * Requires logo.png to be RGBA8 with a real transparent background. A logo on an
 * opaque rectangle traces to a rectangle, which is exactly the failure this
 * script exists to catch — so it refuses that case loudly rather than emitting a
 * four-corner "shield".
 */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'logo.png');
const ALPHA_CUT = 102;          // matches the material's alphaTest of 0.4
const TARGET_H = 12.567;        // keep the badge the size the scene is built for
const MAX_POINTS = 26;

/* ---------- PNG decode (RGBA8, non-interlaced) ---------- */
function decode(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let off = 8, idat = [], w, h, bd, ct, interlace;
  while (off < b.length) {
    const len = b.readUInt32BE(off), type = b.toString('ascii', off + 4, off + 8);
    const data = b.slice(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bd = data[8]; ct = data[9]; interlace = data[12];
    }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    off += 12 + len;
  }
  if (bd !== 8 || ct !== 6) throw new Error('need 8-bit RGBA (colour type 6), got bitDepth=' + bd + ' colourType=' + ct);
  if (interlace) throw new Error('interlaced PNG not supported — re-export without interlacing');

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp, img = Buffer.alloc(h * stride);
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++], line = raw.slice(p, p + stride); p += stride;
    const cur = img.slice(y * stride, (y + 1) * stride);
    const prev = y > 0 ? img.slice((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, bb = prev[x], c = x >= bpp ? prev[x - bpp] : 0, v = line[x];
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
        default: throw new Error('bad filter type ' + ft);
      }
      cur[x] = r & 0xff;
    }
  }
  return { w, h, stride, img };
}

/* ---------- opaque mask + bounds ---------- */
function mask({ w, h, stride, img }) {
  const on = new Uint8Array(w * h);
  let minX = w, maxX = -1, minY = h, maxY = -1, count = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (img[y * stride + x * 4 + 3] > ALPHA_CUT) {
      on[y * w + x] = 1; count++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return { on, minX, maxX, minY, maxY, count };
}

/* ---------- outline by radial sampling ----------
   Deliberately not a Moore-neighbour boundary walk. That needs Jacob's stopping
   criterion to terminate correctly, and a naive "stop when you re-enter the
   start pixel" bails after three steps — which is exactly what it did here.

   A crest is star-shaped about its centre, so casting rays outward and keeping
   the last opaque pixel on each gives the same silhouette with no traversal
   state to get wrong, and evenly spaced points for free. The one thing it
   smooths is a deep concave notch, which is reported below so it is visible
   rather than silent. */
function trace(on, w, h, box) {
  const cx = (box.minX + box.maxX + 1) / 2;
  const cy = (box.minY + box.maxY + 1) / 2;
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : on[y * w + x];
  const maxR = Math.hypot(box.maxX - box.minX, box.maxY - box.minY);
  const RAYS = 240;
  const pts = [];
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2 - Math.PI / 2;   // start at 12 o'clock
    const dx = Math.cos(a), dy = Math.sin(a);
    let hitR = -1;
    for (let r = maxR; r >= 0; r -= 0.5) {
      if (at(Math.round(cx + dx * r), Math.round(cy + dy * r))) { hitR = r; break; }
    }
    if (hitR >= 0) pts.push([cx + dx * hitR, cy + dy * hitR]);
  }
  pts.push(pts[0].slice());                             // close the loop
  return pts;
}

/* How much of the silhouette the radial pass cannot see, as a share of opaque
   pixels lying outside the traced polygon. High means a concave shape. */
function concavity(on, w, h, poly) {
  const inside = (px, py) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  let total = 0, out = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (on[y * w + x]) { total++; if (!inside(x, y)) out++; }
  }
  return total ? out / total : 0;
}

/* ---------- Douglas-Peucker ---------- */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const d2 = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = dx * dx + dy * dy;
    if (!len) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len;
    t = Math.max(0, Math.min(1, t));
    return (p[0] - (a[0] + t * dx)) ** 2 + (p[1] - (a[1] + t * dy)) ** 2;
  };
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let far = -1, best = tol * tol;
    for (let i = s + 1; i < e; i++) {
      const dd = d2(pts[i], pts[s], pts[e]);
      if (dd > best) { best = dd; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([s, far], [far, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/* ---------- main ---------- */
const png = decode(SRC);
const m = mask(png);
const bw = m.maxX - m.minX + 1, bh = m.maxY - m.minY + 1;
const coverage = m.count / (bw * bh);

console.log('logo.png: ' + png.w + 'x' + png.h);
console.log('opaque bounds: x ' + m.minX + '-' + m.maxX + '  y ' + m.minY + '-' + m.maxY + '   (' + bw + 'x' + bh + ')');
console.log('fill of that box: ' + (coverage * 100).toFixed(1) + '%');

if (coverage > 0.97) {
  console.error('\nREFUSING: the opaque area fills its bounding box, i.e. the image has no');
  console.error('transparent background. Tracing it would produce a rectangle, and the 3D');
  console.error('badge would extrude a rectangular slab. Export the emblem alone on a');
  console.error('transparent background and run this again.');
  process.exit(1);
}

let contour = trace(m.on, png.w, png.h, m);
const missed = concavity(m.on, png.w, png.h, contour);
console.log('outside the traced outline: ' + (missed * 100).toFixed(1) + '% of opaque pixels'
  + (missed > 0.04 ? '  <-- concave; check the shape below against the art' : ''));

let tol = 1.2, simplified = simplify(contour, tol);
while (simplified.length > MAX_POINTS && tol < 60) { tol *= 1.35; simplified = simplify(contour, tol); }

/* pixel space -> the shape units the extrude works in: centred on the opaque
   box, y flipped, scaled so the silhouette keeps its current height */
const scale = TARGET_H / bh;
const cxp = (m.minX + m.maxX + 1) / 2, cyp = (m.minY + m.maxY + 1) / 2;
const outline = simplified.map(([x, y]) => [
  +(((x + 0.5) - cxp) * scale).toFixed(3),
  +((cyp - (y + 0.5)) * scale).toFixed(3)
]);
/* drop the duplicated closing point — the shape closes itself */
if (outline.length > 1) {
  const a = outline[0], b = outline[outline.length - 1];
  if (Math.abs(a[0] - b[0]) < 0.02 && Math.abs(a[1] - b[1]) < 0.02) outline.pop();
}

const U0 = m.minX / png.w, U1 = (m.maxX + 1) / png.w;
const V0 = 1 - (m.maxY + 1) / png.h, V1 = 1 - m.minY / png.h;

const outlineLine = '  const SHIELD_OUTLINE = ' + JSON.stringify(outline) + ';';
const uvLine = '  const U0 = ' + m.minX + '/' + png.w + ', U1 = ' + (m.maxX + 1) + '/' + png.w +
               ', V0 = 1 - ' + (m.maxY + 1) + '/' + png.h + ', V1 = 1 - ' + m.minY + '/' + png.h + ';';

console.log('\ncontour ' + contour.length + ' px -> ' + outline.length + ' points (tolerance ' + tol.toFixed(2) + ')');
console.log('UV crop: u ' + U0.toFixed(4) + '-' + U1.toFixed(4) + '  v ' + V0.toFixed(4) + '-' + V1.toFixed(4));
console.log('\n' + outlineLine + '\n' + uvLine);

if (process.argv.includes('--write')) {
  const file = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(/^ {2}const SHIELD_OUTLINE = \[.*?\];$/m, outlineLine);
  html = html.replace(/^ {2}const U0 = .*?, U1 = .*?, V0 = .*?, V1 = .*?;$/m, uvLine);
  if (html === before) { console.error('\nNothing patched — the declarations in index.html did not match.'); process.exit(1); }
  fs.writeFileSync(file, html);
  console.log('\nindex.html patched. Now run: node tools/gen-logo-embed.js');
}
