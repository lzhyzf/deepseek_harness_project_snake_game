// 贪吃蛇本地服务器 —— 零依赖 Node 静态服务器
// 用法: node server.js [端口]   （默认 8080；加 --no-open 不自动打开浏览器）
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = __dirname;
const args = process.argv.slice(2);
const NO_OPEN = args.includes('--no-open');
const portArg = args.find((a) => /^\d+$/.test(a));
const PORT = parseInt(portArg || process.env.PORT || '8080', 10);
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.png':'image/png', '.svg':'image/svg+xml',
  '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8',
  '.txt':'text/plain; charset=utf-8', '.ico':'image/x-icon', '.md':'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('404 Not Found'); return; }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('==============================================');
  console.log('  🐍 贪吃蛇已启动');
  console.log('  本机访问 : http://127.0.0.1:' + PORT);
  console.log('  手机访问 : http://<本机局域网IP>:' + PORT + '  （需同一WiFi）');
  console.log('  按 Ctrl+C 停止服务器');
  console.log('==============================================');
  if (!NO_OPEN) {
    try {
      const url = 'http://127.0.0.1:' + PORT;
      if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
      else if (process.platform === 'darwin') spawn('open', [url], { stdio: 'ignore' }).unref();
      else spawn('xdg-open', [url], { stdio: 'ignore' }).unref();
    } catch (e) { /* 打开浏览器失败不影响服务器 */ }
  }
});
