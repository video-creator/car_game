# 城市碰撞模拟器 启动指南

## 项目概述
这是一个基于 Three.js 的纯静态3D交通模拟游戏，包含城市汽车模式（index.html）和火车网络模式（train.html），无需安装依赖或启动服务器，直接用浏览器打开即可运行。

## . - 城市碰撞模拟器（汽车模式）

### 快速启动

```bash
open index.html
```

或在 VS Code 终端执行：

```bash
open /Users/wangyaqiang/Downloads/car_game/index.html
```

**启动后访问**：本地文件直接在浏览器打开，建议使用 Chrome 或 Safari

```yaml
subProjectPath: .
command: open index.html
cwd: .
port: null
previewUrl: file:///Users/wangyaqiang/Downloads/car_game/index.html
description: 城市汽车驾驶碰撞模拟器，基于 Three.js + Bloom 后处理，支持第一/第三人称视角
```

## . - 火车网络模拟器

### 快速启动

```bash
open train.html
```

**启动后访问**：本地文件直接在浏览器打开

```yaml
subProjectPath: .
command: open train.html
cwd: .
port: null
previewUrl: file:///Users/wangyaqiang/Downloads/car_game/train.html
description: 火车网络模拟器，火车轨道与碰撞效果
```

## . - 游戏大厅入口

### 快速启动

```bash
open menu.html
```

**启动后访问**：游戏大厅菜单，可选择进入汽车模式或火车模式

```yaml
subProjectPath: .
command: open menu.html
cwd: .
port: null
previewUrl: file:///Users/wangyaqiang/Downloads/car_game/menu.html
description: 游戏大厅入口页面，提供模式选择
```

## ⚠️ 注意事项
- 所有 JS 文件（three.min.js、js/ 目录下模块等）需在同一目录，直接双击打开即可
- 若浏览器安全策略阻止本地文件加载，可使用 `python3 -m http.server 8080` 启动本地服务器后访问 http://localhost:8080/menu.html
- 推荐使用 Chrome 浏览器以获得最佳 WebGL 性能
