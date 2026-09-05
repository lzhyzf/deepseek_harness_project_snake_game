// 生成 PWA 图标 icon-192.png / icon-512.png（纯 Node 实现，无第三方依赖）
// 用法: node make-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ---------- PNG 编码 ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  const src = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    src.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------- 光栅绘制（4x 超采样后盒式降采样，边缘平滑） ----------
function renderIcon(size) {
  const S = size * 4, img = new Uint8ClampedArray(S * S * 4);
  const set = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = (y * S + x) * 4;
    const na = a / 255;
    img[i] = Math.round(r * na + img[i] * (1 - na));
    img[i + 1] = Math.round(g * na + img[i + 1] * (1 - na));
    img[i + 2] = Math.round(b * na + img[i + 2] * (1 - na));
    img[i + 3] = Math.max(img[i + 3], a);
  };
  const fillCircle = (cx, cy, rad, r, g, b, a) => {
    const x0 = Math.floor(cx - rad), x1 = Math.ceil(cx + rad), y0 = Math.floor(cy - rad), y1 = Math.ceil(cy + rad);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d <= rad) set(x, y, r, g, b, a);
    }
  };
  const fillRR = (x0, y0, x1, y1, rad, r, g, b, a) => {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const cx = Math.max(x0 + rad, Math.min(x, x1 - rad)), cy = Math.max(y0 + rad, Math.min(y, y1 - rad));
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && d <= rad) set(x, y, r, g, b, a);
    }
  };
  const fillRect = (x0, y0, x1, y1, r, g, b, a) => { for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) set(x, y, r, g, b, a); };

  // 背景：深蓝渐变圆角方块
  const R = S * 0.22;
  for (let y = 0; y < S; y++) {
    const f = y / S;
    const r = Math.round(11 + (16 - 11) * f), g = Math.round(18 + (28 - 18) * f), b = Math.round(32 + (51 - 32) * f);
    fillRect(0, y, S - 1, y, r, g, b, 255);
  }
  fillRR(R * 0.0, 0, S - 1, S - 1, R, 0, 0, 0, 0); // no-op keep rect
  // 盖一层圆角遮罩：绘制 4 个角为透明 → 用反向圆角处理过于复杂，改为绘制圆角白框模拟
  // 简化：直接画圆角深色内边框即可（PWA 圆形裁切时安全）
  const u = S / 100;
  // 蛇身（三段圆，沿对角线）
  const segs = [[0.30, 0.68, 0.115], [0.50, 0.55, 0.115], [0.70, 0.42, 0.13]];
  for (const [sx, sy, sr] of segs) fillCircle(sx * S, sy * S, sr * S, 34, 197, 94, 255);
  // 蛇头
  const hx = 0.70 * S, hy = 0.42 * S, hr = 0.15 * S;
  fillCircle(hx, hy, hr, 74, 222, 128, 255);
  // 眼睛
  fillCircle(hx - hr * 0.28, hy - hr * 0.3, hr * 0.16, 255, 255, 255, 255);
  fillCircle(hx + hr * 0.28, hy - hr * 0.3, hr * 0.16, 255, 255, 255, 255);
  fillCircle(hx - hr * 0.28, hy - hr * 0.3, hr * 0.075, 10, 15, 25, 255);
  fillCircle(hx + hr * 0.28, hy - hr * 0.3, hr * 0.075, 10, 15, 25, 255);
  // 舌头
  fillCircle(hx + hr * 0.55, hy, hr * 0.06, 239, 68, 68, 255);
  // 苹果
  const ax = 0.26 * S, ay = 0.30 * S, ar = 0.13 * S;
  fillCircle(ax, ay, ar, 239, 68, 68, 255);
  fillCircle(ax - ar * 0.3, ay - ar * 0.25, ar * 0.35, 252, 165, 165, 255);
  fillCircle(ax + ar * 0.35, ay - ar * 0.75, ar * 0.22, 74, 222, 128, 255); // 叶

  // 盒式降采样
  const out = new Uint8ClampedArray(size * size * 4);
  const f = S / size;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < f; sy++) for (let sx = 0; sx < f; sx++) {
      const i = ((y * f + sy) * S + (x * f + sx)) * 4;
      r += img[i]; g += img[i + 1]; b += img[i + 2]; a += img[i + 3];
    }
    const n = f * f, o = (y * size + x) * 4;
    out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n);
    out[o + 2] = Math.round(b / n); out[o + 3] = Math.round(a / n);
  }
  return encodePNG(size, size, out);
}

for (const s of [192, 512]) {
  const buf = renderIcon(s);
  const file = path.join(__dirname, 'icon-' + s + '.png');
  fs.writeFileSync(file, buf);
  console.log('已生成', file, buf.length, 'bytes');
}
