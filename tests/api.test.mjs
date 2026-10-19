/**
 * TRL — The Right Lifestyle
 * tests/api.test.mjs — the API's new validators and the persistence layer.
 *
 * The store is exercised against a real temporary directory, so these tests
 * cover the atomic write path (temp file + rename) rather than a mock.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  validateSearch, validateAsk, validateRoi, validateBrief, validateNewsletter
} from '../server/src/validate.mjs';
import { JsonStore } from '../server/src/store.mjs';

/* ------------------------------------------------------------------ validators */

test('search validation caps the query and clamps the limit', () => {
  const { valid, q, limit } = validateSearch({ q: 'automation', limit: 9999 });
  assert.equal(valid, true);
  assert.equal(q, 'automation');
  assert.equal(limit, 50, 'limit is clamped to the maximum');

  const empty = validateSearch({});
  assert.equal(empty.valid, true, 'an empty query is valid — it returns suggestions');
  assert.equal(empty.q, '');

  const long = validateSearch({ q: 'x'.repeat(5000) });
  assert.ok(long.q.length <= 200, 'an over-long query is truncated, not rejected');
});

test('search validation accepts either q or query', () => {
  assert.equal(validateSearch({ query: 'audit' }).q, 'audit');
});

test('ask validation requires a question and clamps the result count', () => {
  assert.equal(validateAsk({}).valid, false);
  const { valid, question, limit } = validateAsk({ question: 'What does the audit cost?', limit: 99 });
  assert.equal(valid, true);
  assert.equal(question, 'What does the audit cost?');
  assert.equal(limit, 10);
});

test('roi validation clamps every number instead of rejecting the request', () => {
  const { valid, input } = validateRoi({
    teamSize: -5,
    hourlyCost: 1e12,
    tasks: [{ name: 'Data entry', hours: 400, repetitiveness: 99, complexity: -3, errorRate: 5 }]
  });
  assert.equal(valid, true);
  assert.equal(input.teamSize, 1, 'a negative team size clamps to the floor');
  assert.equal(input.hourlyCost, 1_000_000, 'an absurd rate clamps to the ceiling');
  assert.equal(input.tasks[0].repetitiveness, 5);
  assert.equal(input.tasks[0].complexity, 1);
  assert.equal(input.tasks[0].errorRate, 1);
});

test('roi validation rejects a model with no tasks', () => {
  const { valid, errors } = validateRoi({ teamSize: 4 });
  assert.equal(valid, false);
  assert.match(errors[0], /task/i);
});

test('roi validation caps the task list', () => {
  const tasks = Array.from({ length: 60 }, (_, i) => ({ name: `Task ${i}`, hours: 1 }));
  const { input } = validateRoi({ tasks });
  assert.equal(input.tasks.length, 25);
});

test('brief validation accepts both a wrapped and a flat answer map', () => {
  const wrapped = validateBrief({ answers: { problem: 'Manual logging', volume: 'Every hour' } });
  assert.equal(wrapped.valid, true);
  assert.equal(wrapped.answers.problem, 'Manual logging');

  const flat = validateBrief({ problem: 'Manual logging' });
  assert.equal(flat.valid, true);
  assert.equal(flat.answers.problem, 'Manual logging');

  assert.equal(validateBrief({}).valid, false);
});

test('newsletter validation requires a usable email address', () => {
  assert.equal(validateNewsletter({ email: 'nope' }).valid, false);
  const { valid, subscriber } = validateNewsletter({ email: 'Founder@Example.com', topic: 'automation' });
  assert.equal(valid, true);
  assert.equal(subscriber.email, 'founder@example.com', 'the address is lowercased');
  assert.equal(subscriber.topic, 'automation');
});

/* ------------------------------------------------------------------ store */

async function withStore(run) {
  const dir = await mkdtemp(path.join(tmpdir(), 'trl-test-'));
  const store = new JsonStore({
    file: path.join(dir, 'leads.json'),
    initial: { leads: [], subscribers: [] }
  });
  await store.load();
  try {
    await run(store, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('a lead can be created, read, patched and deleted', async () => {
  await withStore(async (store, dir) => {
    const created = await store.createLead({ name: 'Ayesha', message: 'Automate our enquiries' });
    assert.ok(created.id);
    assert.equal(created.stage, 'intake');

    assert.equal(store.getLead(created.id).name, 'Ayesha');

    const patched = await store.updateLead(created.id, { stage: 'scoped' });
    assert.equal(patched.stage, 'scoped');
    assert.notEqual(patched.updatedAt, created.updatedAt);

    // The mutation reached disk, not just memory.
    const onDisk = JSON.parse(await readFile(path.join(dir, 'leads.json'), 'utf8'));
    assert.equal(onDisk.leads.length, 1);
    assert.equal(onDisk.leads[0].stage, 'scoped');

    const removed = await store.deleteLead(created.id);
    assert.equal(removed.id, created.id);
    assert.equal(store.getLead(created.id), null);
    assert.equal(await store.deleteLead(created.id), null, 'deleting twice returns null');
  });
});

test('updating a lead that does not exist returns null rather than throwing', async () => {
  await withStore(async (store) => {
    assert.equal(await store.updateLead('missing', { stage: 'scoped' }), null);
    assert.equal(await store.appendHistory('missing', { event: 'stage' }), null);
  });
});

test('stage history accumulates and is capped', async () => {
  await withStore(async (store) => {
    const lead = await store.createLead({ name: 'Bilal', message: 'Need a system' });
    for (let i = 0; i < 60; i += 1) {
      await store.appendHistory(lead.id, { event: 'stage', to: `stage-${i}` });
    }
    const history = store.getLead(lead.id).history;
    assert.equal(history.length, 50, 'history is capped so a record cannot grow without bound');
    assert.equal(history[history.length - 1].to, 'stage-59');
    assert.ok(history.every((entry) => entry.at));
  });
});

test('subscribing twice updates the topic instead of duplicating the address', async () => {
  await withStore(async (store) => {
    const first = await store.subscribe({ email: 'a@example.com', topic: 'automation' });
    assert.equal(first.created, true);

    const second = await store.subscribe({ email: 'a@example.com', topic: 'systems' });
    assert.equal(second.created, false);

    const all = store.listSubscribers();
    assert.equal(all.length, 1);
    assert.equal(all[0].topic, 'systems');
    assert.equal(store.listSubscribers({ topic: 'automation' }).length, 0);
    assert.equal(store.listSubscribers({ topic: 'systems' }).length, 1);
  });
});

test('metrics break leads down by stage, intent and recency', async () => {
  await withStore(async (store) => {
    await store.createLead({ name: 'A', triage: { intent: 'automation' } });
    const b = await store.createLead({ name: 'B', triage: { intent: 'web' } });
    await store.updateLead(b.id, { stage: 'scoped' });
    await store.subscribe({ email: 'a@example.com' });

    const metrics = store.metrics();
    assert.equal(metrics.total, 2);
    assert.equal(metrics.byIntent.automation, 1);
    assert.equal(metrics.byIntent.web, 1);
    assert.equal(metrics.byStage.intake, 1);
    assert.equal(metrics.byStage.scoped, 1);
    assert.equal(metrics.last7Days, 2);
    assert.equal(metrics.subscribers, 1);
    assert.ok(metrics.newest);
  });
});

test('a corrupted data file degrades to an empty store instead of crashing', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'trl-test-'));
  const file = path.join(dir, 'leads.json');
  const { writeFile } = await import('node:fs/promises');
  await writeFile(file, '{ this is not json', 'utf8');

  const store = new JsonStore({ file, initial: { leads: [], subscribers: [] } });
  const state = await store.load();
  assert.deepEqual(state.leads, []);
  assert.equal(store.metrics().total, 0);

  await rm(dir, { recursive: true, force: true });
});
