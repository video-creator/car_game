#!/bin/bash
# ── 一键构建脚本 ────────────────────────────
# 构建产物在 train-dist/ 目录，双击 index.html 即可运行
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "══════════════════════════════════════════════"
echo "  🚄 火车大冒险 - 一键构建"
echo "══════════════════════════════════════════════"

# Step 1: 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# Step 2: 清理旧构建
echo ""
echo "🧹 清理旧构建..."
rm -rf train-dist
echo "  ✓ 已清理 train-dist/"

# Step 3: Vite 构建
echo ""
echo "🔨 Vite 构建中..."
npx vite build --mode production

# Step 4: 修复 HTML 兼容 file://
echo ""
echo "🔧 修复 HTML 兼容 file:// 协议..."
HTML="train-dist/index.html"

# 去掉 type="module" 和 crossorigin
sed -i '' 's/type="module" //g' "$HTML"
sed -i '' 's/ crossorigin//g' "$HTML"

# 把 script 标签从 head 移到 body 末尾
SCRIPT=$(grep -o '<script src="./assets/train-game.js"></script>' "$HTML" | head -1)
if [ -n "$SCRIPT" ]; then
  # 从当前位置删除
  sed -i '' "\|<script src=\"./assets/train-game.js\"></script>|d" "$HTML"
  # 在 </body> 前插入
  sed -i '' "s|</body>|  ${SCRIPT}\n</body>|" "$HTML"
fi
echo "  ✓ script 移到 body 末尾，移除 type=\"module\""

# Step 5: 完成
echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ 构建完成!"
du -sh train-dist/index.html train-dist/assets/*.js 2>/dev/null
echo "  🖱️  双击 train-dist/index.html 即可运行"
echo "══════════════════════════════════════════════"