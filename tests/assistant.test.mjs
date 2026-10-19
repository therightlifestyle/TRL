/**
 * TRL — The Right Lifestyle
 * tests/assistant.test.mjs — the retrieval assistant and the scope brief.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ask, tokenize, starterQuestions } from '../assets/js/engines/assistant.js';
import { buildBrief, briefToMarkdown } from '../assets/js/engines/brief.js';

const knowledge = JSON.parse(await readFile(new URL('../assets/data/knowledge.json', import.meta.url), 'utf8')).entries;

test('tokenizer drops stopwords and punctuation', () => {
  const tokens = tokenize('What does the audit cost, please?');
  assert.ok(tokens.includes('audit'));
  assert.ok(tokens.includes('cost'));
  assert.ok(!tokens.includes('the'));
  assert.ok(!tokens.includes('please'));
});

test('answers a pricing question from the knowledge base', () => {
  const result = ask('How much does the audit cost?', knowledge);
  assert.ok(result.sources.length > 0);
  assert.match(result.answer, /3,000/);
  assert.ok(result.confidence > 0.4);
});

test('answers an ownership question', () => {
  const result = ask('Who owns the code at handover?', knowledge);
  assert.match(result.answer, /own|completely|source code/i);
  assert.ok(result.sources.some((s) => /handover|ownership/i.test(s.title)));
});

test('refuses to guess when it does not know', () => {
  const result = ask('What is the airspeed velocity of an unladen swallow?', knowledge);
  assert.equal(result.sources.length, 0);
  assert.match(result.answer, /do not have a confident answer/i);
  assert.ok(result.suggestions.length > 0);
});

test('starter questions are available', () => {
  assert.ok(starterQuestions(knowledge).length >= 3);
});

test('a scope brief needs a problem and routes the engagement', () => {
  const brief = buildBrief({
    problem: 'Enquiries arrive on WhatsApp and someone types them into a spreadsheet by hand.',
    volume: 'Several times a day',
    team: 'Two to three people',
    tools: 'WhatsApp, Google Sheets, Gmail',
    impact: 'A full working day a week',
    timeline: 'Within a month',
    budget: 'PKR 50,000 – 150,000'
  });
  assert.equal(brief.complete, true);
  assert.ok(brief.route.length > 0);
  assert.ok(brief.estimatedDuration.includes('day') || brief.estimatedDuration.includes('week'));
  assert.match(briefToMarkdown(brief), /Engagement brief/);
});

test('an incomplete brief reports what is missing', () => {
  const brief = buildBrief({});
  assert.equal(brief.complete, false);
  assert.ok(brief.missing.length > 0);
  assert.match(brief.recommendedFirstStep, /discovery conversation/i);
});
