#!/usr/bin/env node
/**
 * TRL — The Right Lifestyle
 * scripts/lint-js.mjs — syntax check for every JavaScript module in the repo.
 * Uses Node's own parser, so there is no toolchain to install.
 */

import { readdir } from 'node:fs/promises';
import { join, extname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const here = resolve(fileURLToPath(import.meta.url), '../..');
const IGNORED = new Set(['.git', 'node_modules']);

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, files);
    else if (['.js', '.mjs'].includes(extname(entry.name))) files.push(full);
  }
  return files;
}

const files = await walk(here);
let failed = 0;

for (const file of files) {
  try {
    await run(process.execPath, ['--check', file]);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${relative(here, file)}\n${err.stderr || err.message}`);
  }
}

if (failed) {
  console.error(`\n${failed} file(s) failed the syntax check.`);
  process.exit(1);
}
console.log(`✓ ${files.length} JavaScript files parsed cleanly.`);
