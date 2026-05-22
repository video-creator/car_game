// Fix train-dist/index.html for file:// compatibility
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'train-dist');
const htmlPath = path.join(distDir, 'index.html');

let html = fs.readFileSync(htmlPath, 'utf-8');

// 1. Remove type="module" from script tag
html = html.replace(/type="module"\s*/g, '');

// 2. Move script tag from <head> to before </body>
// Find the script tag
const scriptMatch = html.match(/<script[^>]*src="[^"]*\.js"[^>]*><\/script>/);
if (scriptMatch) {
  const scriptTag = scriptMatch[0];
  // Remove from head
  html = html.replace(scriptTag, '');
  // Add just before </body>
  html = html.replace('</body>', scriptTag + '\n</body>');
}

// 3. Remove crossorigin attribute (not needed for file://)
html = html.replace(/ crossorigin/g, '');

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('✓ train-dist/index.html fixed for file:// protocol');