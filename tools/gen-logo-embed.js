/* Regenerates logo-embed.js from logo.png.
 *
 * The hero badge normally textures itself from logo.png. That fails when
 * index.html is opened straight off disk: a file:// page may not upload a
 * local-origin image as a WebGL texture, and because the badge material uses
 * alphaTest, a missing texture discards every fragment and the artwork vanishes
 * entirely. logo-embed.js carries the same image as a data: URI, which has no
 * origin restriction, and the hero loads it only on that failure path.
 *
 * Run after changing logo.png:
 *   node tools/gen-logo-embed.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'logo.png');
const dest = path.join(root, 'logo-embed.js');

const b64 = fs.readFileSync(src).toString('base64');

const header = [
  '/* Generated from logo.png by tools/gen-logo-embed.js - do not edit by hand.',
  ' *',
  ' * Loaded only when logo.png cannot be uploaded as a WebGL texture, which',
  ' * happens when index.html is opened directly from file://. A site served',
  ' * over http:// never fetches this file.',
  ' */',
  ''
].join('\n');

fs.writeFileSync(dest, header + "window.__LOGO_URI='data:image/png;base64," + b64 + "';\n");

console.log('logo-embed.js: ' + (fs.statSync(dest).size / 1024).toFixed(0) + 'KB'
  + ' (from ' + (fs.statSync(src).size / 1024).toFixed(0) + 'KB logo.png)');
