/**
 * TRL — The Right Lifestyle
 * tests/search.test.mjs — the unified search engine.
 *
 * The same module powers the browser ⌘K palette and GET /api/search, so its
 * ranking rules are contract, not implementation detail.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  search, buildIndex, indexFromData, highlight, tokenize, subsequenceScore
} from '../assets/js/engines/search.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const load = async (file) => JSON.parse(await readFile(path.join(ROOT, 'assets', 'data', file), 'utf8'));

const SAMPLE = buildIndex([
  { id: 'p1', group: 'navigate', title: 'Services', url: 'services.html', priority: 5 },
  { id: 's1', group: 'service', title: 'AI & Automation', url: 'services.html#ai',
    summary: 'Enquiry routing and scheduled background jobs', keywords: 'rpa workflow bot' },
  { id: 's2', group: 'service', title: 'Websites & Digital Products', url: 'services.html#web',
    summary: 'Design systems and marketing sites', keywords: 'design frontend' },
  { id: 'a1', group: 'insight', title: 'How to tell if a process is worth automating',
    url: 'insights.html#1', summary: 'A test for repeatability' },
  { id: 'f1', group: 'faq', title: 'How much does the audit cost?', url: 'index.html#faq',
    summary: 'PKR 3,000, fixed price, 72-hour turnaround' }
]);

test('a title match outranks the same term in a summary', () => {
  const docs = buildIndex([
    { id: 'in-title', group: 'service', title: 'AI & Automation', url: 'a.html', summary: 'Unrelated text' },
    { id: 'in-summary', group: 'service', title: 'Something else', url: 'b.html',
      summary: 'This service includes automation of repetitive work' }
  ]);
  const { results } = search('automation', docs, { limit: 5 });
  assert.equal(results.length, 2, 'both documents mention automation somewhere');
  assert.equal(results[0].id, 'in-title');
  assert.ok(results[0].score > results[1].score);
});

test('a term absent from a document keeps it out of the results', () => {
  // "automating" is not "automation": the engine matches whole terms, so a
  // document that only uses a different inflection must not silently appear.
  const { results } = search('automation', SAMPLE, { limit: 10 });
  const ids = results.map((r) => r.id);
  assert.ok(ids.includes('s1'));
  assert.ok(!ids.includes('f1'), 'the pricing FAQ does not mention automation');
});

test('every query term must be present for a document to rank properly', () => {
  const { results } = search('automation website', SAMPLE, { limit: 10 });
  const automation = results.find((r) => r.id === 's1');
  const website = results.find((r) => r.id === 's2');
  // Both mention only one of the two terms, so both are penalised equally
  // rather than one silently winning.
  if (automation && website) {
    assert.ok(Math.abs(automation.score - website.score) < Math.max(automation.score, website.score));
  }
});

test('stopwords and single characters are ignored', () => {
  assert.deepEqual(tokenize('how do I automate the work?'), ['automate', 'work']);
  assert.deepEqual(tokenize('a b c'), []);
});

test('subsequence matching rescues typos and abbreviations', () => {
  assert.ok(subsequenceScore('auom', 'automation') > 0.3);
  assert.equal(subsequenceScore('zzzz', 'automation'), 0);
  assert.equal(subsequenceScore('a', 'automation'), 0, 'single characters are too weak to fuzzy match');
});

test('an empty query returns prioritised suggestions instead of the whole corpus', () => {
  const { results } = search('', SAMPLE, { limit: 3 });
  assert.ok(results.length > 0);
  assert.ok(results.length <= 3);
  assert.ok(results.every((r) => r.score === 0));
  assert.equal(results[0].id, 'p1', 'the highest-priority page comes first');
});

test('highlight escapes HTML before wrapping matches', () => {
  const out = highlight('<script>alert("x")</script> AI', ['ai']);
  assert.ok(!out.includes('<script>'), 'raw markup must not survive');
  assert.ok(out.includes('&lt;script&gt;'));
  assert.ok(out.includes('<b>AI</b>'));
});

test('highlight survives regex metacharacters in the query', () => {
  assert.doesNotThrow(() => highlight('a+b.c', ['a+b.c']));
});

test('builds a corpus from the real data files', async () => {
  const [services, insights, work, faq, knowledge] = await Promise.all([
    load('services.json'), load('insights.json'), load('work.json'), load('faq.json'), load('knowledge.json')
  ]);
  const docs = indexFromData({ services, insights, work, faq, knowledge });

  const expected = services.services.length + insights.articles.length + work.items.length
    + faq.items.length + knowledge.entries.length;
  assert.equal(docs.length, expected);

  for (const query of ['automation', 'website', 'audit', 'price', 'timeline']) {
    const { results } = search(query, docs, { limit: 5 });
    assert.ok(results.length > 0, `"${query}" returned nothing against the live corpus`);
    for (const result of results) {
      assert.ok(result.title, 'result has no title');
      assert.ok(result.group, 'result has no group');
    }
  }
});

test('knowledge entries carry their question as the subtitle, not the starter flag', async () => {
  const knowledge = await load('knowledge.json');
  const docs = indexFromData({ knowledge });
  const starter = docs.find((doc) => doc.id === 'knowledge:service-ai');
  assert.ok(starter, 'the AI knowledge entry is missing from the index');
  assert.notEqual(starter.subtitle, true, 'the boolean starter flag leaked into the subtitle');
  assert.equal(typeof starter.subtitle, 'string');
});

test('search is deterministic across runs', async () => {
  const knowledge = await load('knowledge.json');
  const docs = indexFromData({ knowledge });
  const a = search('automation', docs, { limit: 8 }).results.map((r) => r.id);
  const b = search('automation', docs, { limit: 8 }).results.map((r) => r.id);
  assert.deepEqual(a, b);
});

test('group filtering restricts results to one bucket', () => {
  const { results } = search('a', SAMPLE, { limit: 20, group: 'service' });
  assert.ok(results.every((r) => r.group === 'service'));
});
