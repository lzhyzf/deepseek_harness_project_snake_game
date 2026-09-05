# 🐍 贪吃蛇 Snake Game

经典贪吃蛇游戏，单文件零依赖实现。桌面端与手机端共用同一游戏核心 `index.html`，
提供 **Windows 桌面版**、**安卓 APK 安装包** 与 **安卓 PWA 网页版** 三种形态。

## ✨ 功能

- 🍎 **积分系统**：普通食物 +10 分，限时金色星星 +50 分，最高分本地持久化
- ⚡ **等级系统**：每吃 5 个食物升 1 级，速度逐渐加快
- 📖 **新手指导**：首次进入自动弹出 5 步图文教程（含动画演示），可随时重看
- 🎮 **双端操作**：桌面键盘（方向键 / WASD / 空格 / R），手机滑动或屏幕方向键
- 🔊 合成音效（无需素材）、粒子特效、得分飘字、升级提示

## 🖥 Windows 运行

双击 `启动游戏.bat` —— 自动启动本地服务器并打开浏览器访问 `http://127.0.0.1:8080`；
直接双击 `index.html` 亦可游玩（仅最高分持久化受 file:// 协议限制，推荐用 bat）。

> `启动游戏.bat` 已按简体中文系统代码页（GBK）+ CRLF 保存，双击中文显示正常。

## 📱 安卓运行

### 方式一：安装 APK（推荐）

仓库中的 `贪吃蛇-android-v1.0.apk` 为已签名安装包（minSdk 21，即 Android 5.0+）：

- 将 APK 传到手机（微信 / QQ / 数据线）→ 点击安装 → 允许「安装未知来源应用」
- 或 USB 调试连接后：`adb install 贪吃蛇-android-v1.0.apk`
- 应用为全屏 WebView 壳，内置与 Windows 版一致的 `index.html`

### 方式二：PWA 网页版

手机浏览器打开托管地址后，通过浏览器菜单「添加到主屏幕」，即可像 App 一样全屏运行、离线可用
（依赖 `manifest.webmanifest` 与 `sw.js`）。

## 📁 目录结构

```
index.html                游戏本体（三端共用）
启动游戏.bat / server.js   Windows 一键启动（零依赖 Node 服务器）
manifest.webmanifest        PWA 清单
sw.js                     Service Worker（离线缓存）
icon-192.png / icon-512.png 图标（make-icons.js 可重新生成）
贪吃蛇-android-v1.0.apk   安卓安装包（已签名）
android-app/              安卓壳工程源码
  ├─ java/  AndroidManifest.xml  res/   壳工程
  ├─ assets/              打包进 APK 的网页资源（更新游戏后需同步）
  ├─ rebuild-apk.ps1      一键重打包脚本（需本机 JDK17 + Android build-tools34）
  └─ snake.keystore       签名密钥（本地保留，未随仓库分发）
```

## 🔨 本地重新打包 APK

```powershell
# 1) 更新游戏：把新版 index.html 复制到 android-app\assets\
# 2) 重打包（需已安装 JDK 17 + Android SDK build-tools 34 并配置好 dev-tools）
powershell -ExecutionPolicy Bypass -File android-app\rebuild-apk.ps1
```

> 签名密钥 `snake.keystore`（密码 `snake123456`）请妥善本地保存，
> 后续更新必须使用同一密钥签名才能覆盖安装。密钥未包含在本仓库中。

## 🛠 技术要点

- 网页游戏为单文件实现（Canvas + 原生 JS + WebAudio），无任何外部依赖，离线可玩
- Android 壳 = 原生 Activity + WebView，仅 ~45KB，核心逻辑全部复用网页版本
- 自动化验证脚本曾以无头 Chrome 驱动完成 45/45 项通过（教程/积分/升级/结算/触控/手机视口）
