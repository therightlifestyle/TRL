/**
 * TRL — The Right Lifestyle
 * core/paths.js — site-root aware path resolution.
 *
 * The site is served from a repository sub-path (for example
 * https://example.github.io/TRL/) and some pages live one level deeper
 * (/TRL/console/). Relative links break in that case, so every internal
 * link is resolved against the repository root derived from this module's
 * own location.
 */

const SITE_ROOT = new URL('../../../', import.meta.url);

/** Resolve a repository-relative path to an absolute URL. */
export function rootUrl(path = '') {
  if (!path) return SITE_ROOT.href;
  if (/^(https?:|mailto:|tel:|#)/i.test(path)) return path;
  return new URL(String(path).replace(/^\/+/, ''), SITE_ROOT).href;
}

/** The repository root as a path string (always ends with a slash). */
export const siteRoot = SITE_ROOT.href;
