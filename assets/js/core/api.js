/**
 * TRL — The Right Lifestyle
 * core/api.js — API client with timeout, retry-free graceful degradation.
 *
 * The site runs fully client-side. When a TRL API (see /server) is deployed
 * and reachable, the client upgrades to server-backed behaviour. When it is
 * not, every call falls back to the local engine and the UI reports
 * "local engine" status instead of failing.
 */

import { CONFIG } from './config.js';

const DEFAULT_TIMEOUT = 7000;

let apiBase = (CONFIG.apiBase || '').replace(/\/$/, '');
let lastStatus = 'unknown'; // 'online' | 'offline' | 'unknown'
const statusListeners = new Set();

export function getApiBase() {
  return apiBase;
}

export function setApiBase(base) {
  apiBase = (base || '').replace(/\/$/, '');
  return apiBase;
}

export function getStatus() {
  return lastStatus;
}

export function onStatusChange(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

function setStatus(status) {
  if (lastStatus === status) return;
  lastStatus = status;
  statusListeners.forEach((fn) => {
    try { fn(status); } catch (err) { console.error('[api] status listener failed', err); }
  });
}

export class ApiError extends Error {
  constructor(message, { status = 0, payload = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

/** Low-level JSON request. Throws ApiError on network/HTTP failure. */
export async function request(path, { method = 'GET', body = null, timeout = DEFAULT_TIMEOUT, headers = {} } = {}) {
  if (!apiBase) throw new ApiError('API base not configured', { status: 0 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const url = `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'omit',
      mode: 'cors'
    });

    const text = await response.text();
    let payload = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
    }

    if (!response.ok) {
      throw new ApiError(payload?.error || `Request failed (${response.status})`, {
        status: response.status,
        payload
      });
    }
    setStatus('online');
    return payload;
  } catch (err) {
    if (err instanceof ApiError) {
      setStatus(err.status === 404 ? 'offline' : 'offline');
      throw err;
    }
    setStatus('offline');
    throw new ApiError(err.name === 'AbortError' ? 'Request timed out' : 'Network unavailable', { status: 0 });
  } finally {
    clearTimeout(timer);
  }
}

/** Attempt a call; on failure run the local fallback and mark the API offline. */
export async function withFallback(path, fallback, options = {}) {
  try {
    return { data: await request(path, options), remote: true };
  } catch (err) {
    const data = typeof fallback === 'function' ? await fallback(err) : fallback;
    return { data, remote: false, error: err };
  }
}

export const api = {
  health: () => request('/api/health', { timeout: 3500 }),
  triage: (text, meta = {}) => request('/api/triage', { method: 'POST', body: { text, ...meta } }),
  createLead: (payload) => request('/api/leads', { method: 'POST', body: payload }),
  listLeads: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/leads${qs ? `?${qs}` : ''}`);
  },
  updateLead: (id, payload) => request(`/api/leads/${id}`, { method: 'PATCH', body: payload }),
  metrics: () => request('/api/metrics'),
  services: () => request('/api/services'),
  insights: () => request('/api/insights'),
  knowledge: () => request('/api/knowledge')
};
