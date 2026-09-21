/**
 * 生成 tabBar 图标与默认头像（纯 Node，无第三方依赖）
 * 运行：node scripts/gen-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 192; // 画布尺寸（2x 超采样后输出 96）
const OUT = 96;

// ---------- PNG 编码 ----------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(pixels, w, h) {
  // pixels: RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    pixels.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---------- SDF 绘图 ----------
function circleSDF(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}

function roundRectSDF(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - hw + r;
  const qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function ellipseSDF(x, y, cx, cy, rx, ry) {
  const px = (x - cx) / rx;
  const py = (y - cy) / ry;
  return (Math.hypot(px, py) - 1) * Math.min(rx, ry);
}

function subtract(a, b) {
  return Math.max(a, -b);
}

function union(a, b) {
  return Math.min(a, b);
}

// 图标形状定义：返回 SDF（<0 在形状内）
const shapes = {
  // 聊天气泡 + 两个眼睛
  chat(x, y) {
    const bubble = roundRectSDF(x, y, SIZE / 2, SIZE / 2 - 12, 62, 48, 28);
    const tail = roundRectSDF(x, y, SIZE / 2 - 30, SIZE / 2 + 42, 20, 14, 6);
    const eyeL = circleSDF(x, y, SIZE / 2 - 24, SIZE / 2 - 14, 8);
    const eyeR = circleSDF(x, y, SIZE / 2 + 24, SIZE / 2 - 14, 8);
    return subtract(union(bubble, tail), union(eyeL, eyeR));
  },
  // 通讯录：卡片 + 人形
  contacts(x, y) {
    const card = roundRectSDF(x, y, SIZE / 2, SIZE / 2, 64, 54, 14);
    const head = circleSDF(x, y, SIZE / 2, SIZE / 2 - 16, 20);
    const body = subtract(ellipseSDF(x, y, SIZE / 2, SIZE / 2 + 44, 40, 34), roundRectSDF(x, y, SIZE / 2, SIZE / 2 + 18, 90, 26, 4));
    return subtract(card, union(head, body));
  },
  // 我：人形（头 + 肩）
  mine(x, y) {
    const head = circleSDF(x, y, SIZE / 2, SIZE / 2 - 26, 34);
    const body = subtract(ellipseSDF(x, y, SIZE / 2, SIZE / 2 + 76, 66, 60), roundRectSDF(x, y, SIZE / 2, SIZE / 2 + 46, 110, 50, 6));
    return union(head, body);
  }
};

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function drawShape(shapeFn, colorHex) {
  const [r, g, b] = hexToRgb(colorHex);
  const px = Buffer.alloc(SIZE * SIZE * 4);
  // 2x2 超采样
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let cov = 0;
      for (const dx of [0.25, 0.75]) {
        for (const dy of [0.25, 0.75]) {
          if (shapeFn(x + dx, y + dy) < 0) cov += 0.25;
        }
      }
      const i = (y * SIZE + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = Math.round(cov * 255);
    }
  }
  // 降采样到 96x96
  const out = Buffer.alloc(OUT * OUT * 4);
  for (let y = 0; y < OUT; y++) {
    for (let x = 0; x < OUT; x++) {
      for (let c = 0; c < 4; c++) {
        const sum =
          px[(y * 2 * SIZE + x * 2) * 4 + c] +
          px[(y * 2 * SIZE + x * 2 + 1) * 4 + c] +
          px[((y * 2 + 1) * SIZE + x * 2) * 4 + c] +
          px[((y * 2 + 1) * SIZE + x * 2 + 1) * 4 + c];
        out[(y * OUT + x) * 4 + c] = Math.round(sum / 4);
      }
    }
  }
  return encodePNG(out, OUT, OUT);
}

// 默认头像：浅灰底 + 白色人形
function drawAvatar() {
  const bg = hexToRgb('#D8D8D8');
  const fg = hexToRgb('#FFFFFF');
  const px = Buffer.alloc(SIZE * SIZE * 4);
  const person = shapes.mine;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      const d = person(x, y);
      const inside = d < 0;
      let cov = 0;
      for (const dx of [0.25, 0.75]) {
        for (const dy of [0.25, 0.75]) {
          if (person(x + dx, y + dy) < 0) cov += 0.25;
        }
      }
      const [r, g, b] = inside || cov > 0.02 ? fg : bg;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }
  const out = Buffer.alloc(OUT * OUT * 4);
  for (let y = 0; y < OUT; y++) {
    for (let x = 0; x < OUT; x++) {
      for (let c = 0; c < 4; c++) {
        const sum =
          px[(y * 2 * SIZE + x * 2) * 4 + c] +
          px[(y * 2 * SIZE + x * 2 + 1) * 4 + c] +
          px[((y * 2 + 1) * SIZE + x * 2) * 4 + c] +
          px[((y * 2 + 1) * SIZE + x * 2 + 1) * 4 + c];
        out[(y * OUT + x) * 4 + c] = Math.round(sum / 4);
      }
    }
  }
  return encodePNG(out, OUT, OUT);
}

const outDir = path.join(__dirname, '../src/static');
fs.mkdirSync(path.join(outDir, 'tab'), { recursive: true });

for (const [name, fn] of Object.entries(shapes)) {
  fs.writeFileSync(path.join(outDir, 'tab', `${name}.png`), drawShape(fn, '#7A7A7A'));
  fs.writeFileSync(path.join(outDir, 'tab', `${name}-active.png`), drawShape(fn, '#07C160'));
}
fs.writeFileSync(path.join(outDir, 'avatar.png'), drawAvatar());

console.log('[ok] 图标已生成到 src/static');
