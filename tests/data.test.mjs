/**
 * TRL — The Right Lifestyle
 * tests/data.test.mjs — the data layer and the honesty policy.
 *
 * These assertions protect the promises the company makes about its own
 * content: demonstrations are labelled, every service is described with
 * deliverables and boundaries, and the published commercial facts are
 * consistent across the data layer.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DATA = path.resolve(import.meta.dirname, '..', 'assets', 'data');

async function read(name) {
  return JSON.parse(await readFile(path.join(DATA, name), 'utf8'));
}

test('the service catalogue describes all seven disciplines', async () => {
  const { services } = await read('services.json');
  assert.equal(services.length, 7);
  for (const service of services) {
    assert.ok(service.id, 'service needs an id');
    assert.ok(service.title, 'service needs a title');
    assert.ok(service.short?.length > 20, `${service.id} needs a real summary`);
    assert.ok(Array.isArray(service.deliverables) && service.deliverables.length >= 3,
      `${service.id} needs at least three deliverables`);
    assert.ok(service.notFor && String(service.notFor).length > 20,
      `${service.id} needs an explicit "not for" boundary`);
    assert.ok(service.icon, `${service.id} needs an icon`);
  }
});

test('every demonstration is labelled honestly', async () => {
  const { items } = await read('work.json');
  assert.ok(items.length >= 4);
  const allowed = new Set(['demo', 'sample', 'live']);
  for (const item of items) {
    assert.ok(allowed.has(item.status), `${item.id} has an unrecognised status "${item.status}"`);
    assert.ok(item.statusLabel?.length > 3, `${item.id} needs a visible status label`);
    assert.ok(item.discipline, `${item.id} needs a discipline`);
    assert.ok(item.outcome?.length > 20, `${item.id} needs an honest outcome description`);
    assert.ok(item.link && item.linkLabel, `${item.id} needs a link and a link label`);
    // A demonstration must never claim a named client.
    assert.equal(item.client, undefined, `${item.id} must not name a client`);
  }
});

test('insights carry enough to publish', async () => {
  const { articles } = await read('insights.json');
  assert.ok(articles.length >= 4);
  for (const article of articles) {
    assert.ok(article.id && article.title && article.category);
    assert.ok(article.summary?.length > 40, `${article.id} needs a real summary`);
    assert.ok(Array.isArray(article.body) && article.body.length >= 2, `${article.id} needs body paragraphs`);
    assert.ok(article.readTime, `${article.id} needs a reading time`);
  }
});

test('the assistant knowledge base is searchable', async () => {
  const { entries } = await read('knowledge.json');
  assert.ok(entries.length >= 12);
  for (const entry of entries) {
    assert.ok(entry.id && entry.title && entry.answer, `${entry.id} is incomplete`);
    assert.ok(String(entry.answer).length > 60, `${entry.id} needs a substantial answer`);
    assert.ok(Array.isArray(entry.keywords) && entry.keywords.length >= 2,
      `${entry.id} needs keywords so the assistant can retrieve it`);
  }
});

test('the FAQ is written as answers, not as a stub', async () => {
  const { items } = await read('faq.json');
  assert.ok(items.length >= 5);
  for (const item of items) {
    assert.ok(item.question?.endsWith('?'), `${item.id} should be a question`);
    assert.ok(Array.isArray(item.answer) && item.answer.length >= 1, `${item.id} needs an answer`);
    assert.ok(item.answer[0].length > 80, `${item.id} needs a substantial answer`);
  }
});

test('the published commercial facts are consistent', async () => {
  const config = await read('config.json');
  assert.equal(config.audit.price, 3000);
  assert.equal(config.audit.currency, 'PKR');
  assert.equal(config.audit.turnaroundHours, 72);
  assert.equal(config.audit.creditedAgainstBuild, false);
  assert.equal(config.brand.email, 'officialtrlservice@gmail.com');
  assert.equal(config.brand.whatsapp, '923190091457');
  assert.equal(config.brand.location, 'Islamabad, Pakistan');
  assert.equal(config.engagement.disciplines, 7);
  assert.deepEqual(config.engagement.stages, [
    'Conversation', 'Definition', 'Confirmation', 'Build', 'Review', 'Handover'
  ]);

  // The assistant must quote the same numbers the website publishes.
  const { entries } = await read('knowledge.json');
  const pricing = entries.find((entry) => /price|cost|fee|audit/i.test(`${entry.id} ${entry.title}`));
  assert.ok(pricing, 'the knowledge base needs a pricing entry');
  assert.match(pricing.answer, /3,000|3000/);
  assert.match(pricing.answer, /72/);
});
