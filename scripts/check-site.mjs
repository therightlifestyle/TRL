#!/usr/bin/env node
/**
 * TRL — The Right Lifestyle
 * scripts/check-site.mjs — static site integrity audit.
 *
 * Checks, without a browser:
 *   1. every local link and asset referenced by a page exists
 *   2. every page has a title, description, lang, and one h1
 *   3. no page loads a resource from a third-party origin
 *   4. every url() referenced from a stylesheet exists
 *
 *   node scripts/check-site.mjs
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '..');

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.github', 'server', 'tests', 'scripts']);
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.mp4', '.webm']);

/** Hosts that are fine to reference from markup. */
const ALLOWED_EXTERNAL = [
  'schema.org',
  'www.w3.org',
  'therightlifestyle.github.io',
  'wa.me',
  'mailto:',
  'tel:'
];

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.nojekyll') {
      if (IGNORED_DIRS.has(entry.name)) continue;
    }
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else files.push(full);
  }
  return files;
}

function isExternal(url) {
  if (!url || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('data:')) return false;
  return /^https?:\/\//i.test(url);
}

function externalAllowed(url) {
  return ALLOWED_EXTERNAL.some((host) => url.includes(host));
}

/** Strip query strings and hashes before resolving a local path. */
function localPath(url) {
  return url.split('#')[0].split('?')[0];
}

export async function checkSite({ root = ROOT } = {}) {
  const errors = [];
  const warnings = [];
  const pages = [];

  const allFiles = await walk(root);
  const htmlFiles = allFiles.filter((f) => extname(f) === '.html');
  const cssFiles = allFiles.filter((f) => extname(f) === '.css');
  const jsFiles = allFiles.filter((f) => extname(f) === '.js' || extname(f) === '.mjs');

  for (const file of htmlFiles) {
    const content = await readFile(file, 'utf8');
    const rel = file.slice(root.length + 1);
    pages.push(rel);

    // 1. required metadata
    if (!/<title>[^<]{4,}<\/title>/i.test(content)) errors.push(`${rel}: missing or empty <title>`);
    if (!/<meta\s+name="description"\s+content="[^"]{20,}"/i.test(content)) errors.push(`${rel}: missing or short meta description`);
    if (!/<html[^>]+lang="[a-z-]+"/i.test(content)) errors.push(`${rel}: <html> is missing a lang attribute`);
    const h1Count = (content.match(/<h1\b/gi) || []).length;
    if (h1Count === 0) errors.push(`${rel}: no <h1>`);
    if (h1Count > 1) warnings.push(`${rel}: ${h1Count} <h1> elements (one is recommended)`);

    // 2. local references exist
    const references = [...content.matchAll(/(?:src|href)="([^"]+)"/gi)].map((m) => m[1]);
    for (const ref of references) {
      if (!ref || ref.startsWith('#') || ref.startsWith('data:') || ref.startsWith('mailto:') || ref.startsWith('tel:')) continue;
      if (isExternal(ref)) {
        if (!externalAllowed(ref)) errors.push(`${rel}: external resource reference — ${ref}`);
        continue;
      }
      const target = resolve(dirname(file), localPath(ref));
      if (!existsSync(target)) errors.push(`${rel}: missing reference — ${ref}`);
    }

    // 3. no third-party script/style/font hosts
    const externalAssets = [...content.matchAll(/<(script|link|img|iframe|source)\b[^>]*\b(?:src|href)="(https?:\/\/[^"]+)"/gi)];
    for (const [, , url] of externalAssets) {
      if (!externalAllowed(url)) errors.push(`${rel}: loads a third-party asset — ${url}`);
    }
  }

  for (const file of cssFiles) {
    const content = await readFile(file, 'utf8');
    const rel = file.slice(root.length + 1);
    const urls = [...content.matchAll(/url\(["']?([^"')]+)["']?\)/gi)].map((m) => m[1]);
    for (const url of urls) {
      if (isExternal(url)) {
        if (!externalAllowed(url)) errors.push(`${rel}: external asset — ${url}`);
        continue;
      }
      const target = resolve(dirname(file), localPath(url));
      if (!existsSync(target)) errors.push(`${rel}: missing asset — ${url}`);
    }
  }

  for (const file of jsFiles) {
    const content = await readFile(file, 'utf8');
    const rel = file.slice(root.length + 1);
    const imports = [...content.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const spec of imports) {
      if (!spec.startsWith('.') && !spec.startsWith('/')) continue;
      const target = resolve(dirname(file), spec);
      if (!existsSync(target)) errors.push(`${rel}: import does not resolve — ${spec}`);
    }
  }

  return { errors, warnings, pages, files: allFiles.length };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const report = await checkSite();
  console.log(`\nTRL site audit — ${report.pages.length} pages, ${report.files} files checked\n`);
  if (report.warnings.length) {
    console.log('Warnings:');
    report.warnings.forEach((w) => console.log(`  · ${w}`));
    console.log('');
  }
  if (report.errors.length) {
    console.log(`Errors (${report.errors.length}):`);
    report.errors.forEach((e) => console.log(`  ✗ ${e}`));
    console.log('');
    process.exit(1);
  }
  console.log('✓ No broken links, no missing assets, no third-party requests.\n');
}
