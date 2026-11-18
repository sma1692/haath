#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Ensure dist bundle is built before serving playground
const distFile = path.join(rootDir, 'dist', 'index.js');
if (!fs.existsSync(distFile)) {
  console.log('⚡ dist/index.js not found, executing npm run build...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.ts': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

const initialPort = parseInt(process.env.PORT || '5173', 10);

function startServer(p) {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/' || urlPath === '/playground' || urlPath === '/playground/') {
      urlPath = '/playground/index.html';
    }

    const filePath = path.normalize(path.join(rootDir, urlPath));
    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      // Directory URLs (e.g. /examples/03-pose-playback/) serve their index.html.
      if (!err && stats.isDirectory()) {
        if (!urlPath.endsWith('/')) {
          res.writeHead(301, { Location: `${urlPath}/` });
          res.end();
          return;
        }
        const indexPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'], 'Cache-Control': 'no-cache' });
          fs.createReadStream(indexPath).pipe(res);
          return;
        }
      }
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`Not Found: ${urlPath}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(filePath).pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${p} in use, trying ${p + 1}...`);
      startServer(p + 1);
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  server.listen(p, () => {
    console.log(`\n🚀 Haath Telemetry Playground running at:`);
    console.log(`   http://localhost:${p}/`);
    console.log(`   http://localhost:${p}/playground/index.html`);
    console.log(`   http://localhost:${p}/examples/\n`);
  });
}

startServer(initialPort);
