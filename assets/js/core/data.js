/**
 * TRL — The Right Lifestyle
 * core/data.js — loads the JSON data layer with caching and fallbacks.
 *
 * URLs are resolved against this module's location, so they work from any
 * page depth (the Console lives one directory below the site root).
 */

import { rootUrl } from './paths.js';

const cache = new Map();

export async function loadJSON(path, fallback = null) {
  if (cache.has(path)) return cache.get(path);
  const promise = (async () => {
    try {
      const response = await fetch(rootUrl(path), { credentials: 'omit' });
      if (!response.ok) throw new Error(`Failed to load ${path} (${response.status})`);
      return await response.json();
    } catch (err) {
      console.warn(`[data] ${path} unavailable — using fallback`, err.message);
      return fallback;
    }
  })();
  cache.set(path, promise);
  return promise;
}

export const loadServices = () => loadJSON('assets/data/services.json', { services: [] });
export const loadWork = () => loadJSON('assets/data/work.json', { items: [] });
export const loadInsights = () => loadJSON('assets/data/insights.json', { articles: [] });
export const loadKnowledge = () => loadJSON('assets/data/knowledge.json', { entries: [] });
export const loadFaq = () => loadJSON('assets/data/faq.json', { items: [] });
export const loadConfig = () => loadJSON('assets/data/config.json', null);

