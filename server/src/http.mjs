/**
 * TRL — The Right Lifestyle
 * server/src/http.mjs — static file serving and request plumbing.
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { logger } from './logger.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8'
};

const CACHE_RULES = {
  '.woff2': 'public, max-age=31536000, immutable',
  '.woff': 'public, max-age=31536000, immutable',
  '.png': 'public, max-age=604800',
  '.jpg': 'public, max-age=604800',
  '.jpeg': 'public, max-age=604800',
  '.gif': 'public, max-age=604800',
  '.svg': 'public, max-age=604800',
  '.css': 'public, max-age=3600',
  '.js': 'public, max-age=3600',
  '.html': 'public, max-age=0, must-revalidate'
};

export function mimeFor(path) {
  return MIME[extname(path).toLowerCase()] || 'application/octet-stream';
}

/** Resolve a request path to a file inside `root`, refusing traversal. */
export function safeResolve(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  // Any explicit parent segment is refused outright — no normalisation games.
  if (decoded.split(/[\\/]+/).some((segment) => segment === '..')) return null;
  const relative = normalize(decoded).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  const target = join(root, relative);
  if (!target.startsWith(root + sep) && target !== root) return null;
  return target;
}

/**
 * Directories and files that belong to the repository, not to the website.
 * They are never served as static content.
 */
const PRIVATE_SEGMENTS = new Set(['server', 'tests', 'scripts', 'node_modules', '.git', '.github']);
const PRIVATE_ROOT_FILES = new Set([
  'package.json', 'package-lock.json', 'Dockerfile', 'Procfile', 'railway.json',
  'render.yaml', '.env', '.env.example', 'CHANGELOG.md', 'ARCHITECTURE.md',
  'DEVELOPMENT.md', 'DEPLOYMENT.md', 'README.md', 'LICENSE'
]);

/** True when a resolved request path is repository-internal rather than site content. */
export function isPrivatePath(relativePath) {
  const segments = relativePath.split(/[\\/]+/).filter(Boolean);
  if (!segments.length) return false;
  if (segments.some((segment) => segment.startsWith('.'))) return true;
  if (PRIVATE_SEGMENTS.has(segments[0])) return true;
  if (segments.length === 1 && PRIVATE_ROOT_FILES.has(segments[0])) return true;
  return false;
}

export async function serveStatic(req, res, root, { spaFallback = null } = {}) {
  const urlPath = (req.url || '/').split('?')[0];
  let filePath = safeResolve(root, urlPath);
  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad request');
    return true;
  }

  const relative = filePath.slice(root.length).replace(/^[/\\]+/, '');
  if (isPrivatePath(relative)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return true;
  }

  let info = await stat(filePath).catch(() => null);
  if (info?.isDirectory()) {
    filePath = join(filePath, 'index.html');
    info = await stat(filePath).catch(() => null);
  }
  if (!info?.isFile() && spaFallback) {
    filePath = join(root, spaFallback);
    info = await stat(filePath).catch(() => null);
  }
  if (!info?.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return true;
  }

  const etag = `W/"${createHash('sha1')
    .update(`${filePath}:${info.size}:${info.mtimeMs}`)
    .digest('base64url')}"`;

  const ext = extname(filePath).toLowerCase();
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', info.mtime.toUTCString());
  res.setHeader('Cache-Control', CACHE_RULES[ext] || 'public, max-age=3600');
  res.setHeader('Content-Type', mimeFor(filePath));

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304);
    res.end();
    return true;
  }

  if (req.method === 'HEAD') {
    res.writeHead(200, { 'Content-Length': info.size });
    res.end();
    return true;
  }

  res.writeHead(200, { 'Content-Length': info.size });
  const stream = createReadStream(filePath);
  stream.pipe(res);
  stream.on('error', (err) => {
    logger.error('static.stream_error', { file: filePath, error: err.message });
    res.destroy();
  });
  return true;
}

export function readJsonBody(req, { limit = 64 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}
