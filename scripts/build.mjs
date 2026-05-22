// ── 一键构建脚本 ─────────────────────────────
// 用法: node scripts/build.mjs
// 构建产物在 train-dist/ 目录，双击 index.html 即可运行

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

console.log('═'.repeat(50));
console.log('  🚄 火车大冒险 - 一键构建');
console.log('═'.repeat(50));

// Step 1: 安装依赖
console.log('\n📦 安装依赖...');
run('npm install');

// Step 2: 清理旧构建
console.log('\n🧹 清理旧构建...');
if (fs.existsSync(path.join(ROOT, 'train-dist'))) {
  fs.rmSync(path.join(ROOT, 'train-dist'), { recursive: true });
}
console.log('  ✓ 已清理 train-dist/');

// Step 3: Vite 构建
console.log('\n🔨 Vite 构建中...');
run('npx vite build --mode production');

// Step 4: 修复 HTML 兼容 file://
console.log('\n🔧 修复 HTML 兼容 file:// 协议...');
const distDir = path.join(ROOT, 'train-dist');
const htmlPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Remove type="module" and crossorigin
html = html.replace(/type="module"\s*/g, '');
html = html.replace(/ crossorigin/g, '');

// Move script tag from <head> to before </body>
const scriptMatch = html.match(/<script[^>]*src="[^"]*\.js"[^>]*><\/script>/);
if (scriptMatch) {
  html = html.replace(scriptMatch[0], '');
  html = html.replace('</body>', '  ' + scriptMatch[0] + '\n</body>');
}

fs.writeFileSync(htmlPath, html, 'utf-8');
console.log('  ✓ script 移到 body 末尾，移除 type="module"');

// Step 5: 完成
const size = fs.statSync(htmlPath).size;
const jsFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.endsWith('.js'));
const jsSize = fs.statSync(path.join(distDir, 'assets', jsFiles[0])).size;

console.log('\n' + '═'.repeat(50));
console.log('  ✅ 构建完成!');
console.log(`  📁 ${path.join(distDir, 'index.html')} (${(size / 1024).toFixed(1)} KB)`);
console.log(`  📁 ${path.join(distDir, 'assets', jsFiles[0])} (${(jsSize / 1024).toFixed(1)} KB)`);
console.log(`  🖱️  双击 train-dist/index.html 即可运行`);
console.log('═'.repeat(50));