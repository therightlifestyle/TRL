/**
 * TRL — The Right Lifestyle
 * tests/server.test.mjs — the API's safety primitives.
 *
 * These are the pieces that decide what the server is allowed to read,
 * accept and expose. They are pure functions, so they are tested directly.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { safeResolve, isPrivatePath, mimeFor } from '../server/src/http.mjs';
import { validateLead, validateTriage } from '../server/src/validate.mjs';
import { createRateLimiter } from '../server/src/security.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

test('path traversal is refused', () => {
  assert.equal(safeResolve(ROOT, '/../../etc/passwd'), null);
  assert.equal(safeResolve(ROOT, '/assets/../../../etc/passwd'), null);
  assert.equal(safeResolve(ROOT, '/%2e%2e/%2e%2e/etc/passwd'), null);
  assert.ok(safeResolve(ROOT, '/index.html').startsWith(ROOT));
});

test('repository internals are never served as site content', () => {
  for (const path of [
    'package.json', 'server/src/index.mjs', 'tests/triage.test.mjs',
    'scripts/check-site.mjs', '.git/config', '.github/workflows/ci.yml',
    'README.md', 'DEPLOYMENT.md', '.env'
  ]) {
    assert.equal(isPrivatePath(path), true, `${path} must not be served`);
  }
  for (const path of [
    'index.html', 'console/index.html', 'assets/js/main.js',
    'assets/data/services.json', 'assets/fonts/newsreader.woff2', 'favicon.svg'
  ]) {
    assert.equal(isPrivatePath(path), false, `${path} must be served`);
  }
});

test('content types are correct for the assets we ship', () => {
  assert.match(mimeFor('/index.html'), /^text\/html/);
  assert.match(mimeFor('/assets/js/main.js'), /javascript/);
  assert.match(mimeFor('/assets/css/tokens.css'), /^text\/css/);
  assert.match(mimeFor('/assets/fonts/x.woff2'), /font\/woff2/);
  assert.match(mimeFor('/assets/img/hero.jpg'), /^image\/jpeg/);
  assert.match(mimeFor('/assets/data/services.json'), /application\/json/);
});

test('lead validation rejects malformed input and accepts a real enquiry', () => {
  const bad = validateLead({ name: '', email: 'not-an-email', message: 'short' });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length >= 1);

  const good = validateLead({
    name: 'Ayesha Noor',
    email: 'ayesha@example.com',
    message: 'We receive around 300 WhatsApp enquiries every day and need them classified automatically.'
  });
  assert.equal(good.valid, true);
  assert.equal(good.lead.name, 'Ayesha Noor');
  assert.equal(good.lead.email, 'ayesha@example.com');
});

test('triage validation requires real text', () => {
  assert.equal(validateTriage({}).valid, false);
  assert.equal(validateTriage({ text: 'hi' }).valid, false);
  const result = validateTriage({ text: 'I need a website built for my packaging business.' });
  assert.equal(result.valid, true);
  assert.equal(result.text.length > 0, true);
});

test('the rate limiter blocks a flood from one client and lets others through', () => {
  const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
  for (let i = 0; i < 3; i += 1) {
    assert.equal(limiter('1.2.3.4').allowed, true, `request ${i + 1} should pass`);
  }
  assert.equal(limiter('1.2.3.4').allowed, false, 'the fourth request should be blocked');
  assert.equal(limiter('5.6.7.8').allowed, true, 'a different client is unaffected');
});
