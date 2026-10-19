#!/usr/bin/env node
/**
 * TRL — The Right Lifestyle
 * server/src/index.mjs — the TRL application server.
 *
 * One process serves two things:
 *   1. The static website (the same files GitHub Pages serves).
 *   2. The optional TRL API the browser upgrades to when it is reachable.
 *
 * Zero npm dependencies: Node's standard library only.
 *
 *   node server/src/index.mjs
 *   PORT=8080 HOST=0.0.0.0 node server/src/index.mjs
 */

import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createRoutes } from './routes.mjs';
import { createStore } from './store.mjs';
import { readJsonBody, sendJson, serveStatic } from './http.mjs';
import { applyCors, clientKey, createRateLimiter, securityHeaders } from './security.mjs';
import { logger } from './logger.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

const config = {
  port: Number(process.env.PORT) || 8080,
  host: process.env.HOST || '0.0.0.0',
  assetsRoot: process.env.ASSETS_ROOT || root,
  dataDir: process.env.DATA_DIR || join(root, 'server', 'data'),
  adminToken: process.env.ADMIN_TOKEN || '',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8000,http://localhost:8080')
    .split(',').map((s) => s.trim()).filter(Boolean),
  rateLimit: Number(process.env.RATE_LIMIT) || 120,
  version: process.env.APP_VERSION || '1.0.0'
};

const store = createStore({ dataDir: config.dataDir });
await store.load();

const routes = createRoutes({
  store,
  assetsRoot: config.assetsRoot,
  adminToken: config.adminToken,
  version: config.version
});

const limit = createRateLimiter({ windowMs: 60_000, max: config.rateLimit });

function matchRoute(method, pathname) {
  const direct = routes[`${method} ${pathname}`];
  if (direct) return { handler: direct, params: {} };
  for (const [key, handler] of Object.entries(routes)) {
    const [routeMethod, routePath] = key.split(' ');
    if (routeMethod !== method || !routePath.includes(':')) continue;
    const routeParts = routePath.split('/');
    const pathParts = pathname.split('/');
    if (routeParts.length !== pathParts.length) continue;
    const params = {};
    let matched = true;
    for (let i = 0; i < routeParts.length; i += 1) {
      if (routeParts[i].startsWith(':')) params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      else if (routeParts[i] !== pathParts[i]) { matched = false; break; }
    }
    if (matched) return { handler, params };
  }
  return null;
}

const server = createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  securityHeaders(res);
  applyCors(req, res, { allowedOrigins: config.corsOrigins });

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    const key = clientKey(req);
    const gate = limit(key);
    res.setHeader('X-RateLimit-Limit', String(config.rateLimit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, gate.remaining)));
    if (!gate.allowed) {
      logger.warn('api.rate_limited', { path: url.pathname, key });
      sendJson(res, 429, { error: 'Too many requests. Please slow down.' });
      return;
    }

    const match = matchRoute(req.method, url.pathname);
    if (!match) {
      sendJson(res, 404, { error: 'Unknown endpoint' });
      return;
    }

    try {
      if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
        req.body = await readJsonBody(req);
      }
      req.query = url.searchParams;
      await match.handler(req, res, match.params);
    } catch (err) {
      const status = err.status || 500;
      logger.error('api.error', { path: url.pathname, status, error: err.message });
      if (!res.headersSent) sendJson(res, status, { error: status === 500 ? 'Internal server error' : err.message });
    }

    logger.info('api.request', {
      method: req.method,
      path: url.pathname,
      status: res.statusCode,
      ms: Date.now() - started
    });
    return;
  }

  try {
    await serveStatic(req, res, config.assetsRoot);
  } catch (err) {
    logger.error('static.error', { path: url.pathname, error: err.message });
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
});

server.listen(config.port, config.host, () => {
  logger.info('server.started', {
    url: `http://${config.host}:${config.port}`,
    root: config.assetsRoot,
    dataDir: config.dataDir,
    admin: config.adminToken ? 'token-protected' : 'open (no ADMIN_TOKEN set)'
  });
});

const shutdown = (signal) => {
  logger.info('server.stopping', { signal });
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => logger.error('server.unhandled_rejection', { reason: String(reason) }));
