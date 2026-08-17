/* Renders images/logo-source.svg to a transparent logo.png.
 *
 * The site could reference the SVG directly for the nav, footer and favicon —
 * but the 3D hero badge cannot. Its texture loader needs a raster, and it
 * extrudes a silhouette traced from that raster's alpha channel. So the SVG is
 * the source and logo.png is the build artefact.
 *
 * Transparency is the whole point of this script. Chrome's --screenshot flag
 * composites onto an opaque white page, which would give logo.png a white
 * rectangle for a background — the badge would then extrude a rectangle. Going
 * through the DevTools protocol lets us clear the default background first, so
 * the alpha channel really is the crest outline.
 *
 *   node tools/render-logo.js            # writes logo.png at 2x
 *   node tools/render-logo.js --size 4   # 4x, for print
 *
 * Needs Chrome. Set CHROME to override the path.
 */
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'images', 'logo-source.svg');
const OUT = path.join(ROOT, 'logo.png');
const BASE_W = 375, BASE_H = 395;

const scaleArg = process.argv.indexOf('--size');
const SCALE = scaleArg > -1 ? Number(process.argv[scaleArg + 1]) || 2 : 2;
const PORT = 9411 + Math.floor(Number(process.env.RENDER_PORT_OFFSET) || 0);

const CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  (process.env.LOCALAPPDATA || '') + '/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);
const CHROME = CANDIDATES.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
if (!CHROME) { console.error('Chrome not found. Set CHROME=/path/to/chrome'); process.exit(1); }
if (!fs.existsSync(SRC)) { console.error('missing ' + SRC); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* The SVG uses Plus Jakarta Sans for the ECU wordmark. Inline the file and load
   the webfont in the page, then wait for it — otherwise the render can land on a
   fallback face and the wordmark comes out the wrong shape. */
const svg = fs.readFileSync(SRC, 'utf8');
const page = `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;background:transparent}
svg{display:block;width:${BASE_W * SCALE}px;height:${BASE_H * SCALE}px}</style>
${svg}`;
const tmp = path.join(ROOT, '.logo-render.html');
fs.writeFileSync(tmp, page);

const profile = path.join(require('os').tmpdir(), 'ecu-logo-render-' + process.pid);

(async () => {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=' + (BASE_W * SCALE) + ',' + (BASE_H * SCALE),
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: 'ignore' });

  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) {
    try { targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); }
    catch (e) { await sleep(400); }
  }
  if (!targets) { chrome.kill(); console.error('Chrome did not expose a debug port'); process.exit(1); }

  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl.replace('localhost', '127.0.0.1'));
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
  const send = (mm, p = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: mm, params: p })); });
  await new Promise(r => ws.onopen = r);

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',
    { width: BASE_W * SCALE, height: BASE_H * SCALE, deviceScaleFactor: 1, mobile: false });
  /* the bit that actually buys transparency */
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await send('Page.navigate', { url: 'file:///' + tmp.replace(/\\/g, '/') });
  await sleep(1200);
  await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
  await sleep(400);

  const shot = await send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: BASE_W * SCALE, height: BASE_H * SCALE, scale: 1 }
  });
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'));

  ws.close(); chrome.kill();
  try { fs.unlinkSync(tmp); } catch (e) {}
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}

  const st = fs.statSync(OUT);
  console.log('logo.png written: ' + (BASE_W * SCALE) + 'x' + (BASE_H * SCALE) + ', ' + (st.size / 1024).toFixed(0) + ' KB');
  console.log('next: node tools/trace-logo.js --write   then   node tools/gen-logo-embed.js');
  process.exit(0);
})();
