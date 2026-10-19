/**
 * TRL — The Right Lifestyle
 * tests/triage.test.mjs — the enquiry triage engine.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { triageEnquiry, extractName, extractBusiness, extractBudget, extractOrderRef, SAMPLE_ENQUIRIES } from '../assets/js/engines/triage.js';

test('extracts a sender name from common phrasings', () => {
  assert.equal(extractName('Hi, my name is Ayesha Noor and I need help'), 'Ayesha Noor');
  assert.equal(extractName('I am Bilal from Sattar Textiles'), 'Bilal');
  assert.equal(extractName('This is Sana from Crescent Clinics'), 'Sana');
  assert.equal(extractName('No name here at all'), null);
});

test('extracts a business name', () => {
  assert.equal(extractBusiness('I work at Gulberg Foods (Pvt) Ltd.'), 'Gulberg Foods (Pvt) Ltd');
  assert.equal(extractBusiness('Regards, Farhan from Metro Dealership'), 'Metro Dealership');
});

test('extracts budget with currency and scale', () => {
  assert.deepEqual(extractBudget('Budget is around PKR 250,000'), { value: 250000, currency: 'PKR', raw: 'PKR 250,000' });
  assert.equal(extractBudget('about $1.5m budget').value, 1500000);
  assert.equal(extractBudget('no money mentioned'), null);
});

test('extracts order references', () => {
  assert.equal(extractOrderRef('order #ORD-4471 please'), 'ORD-4471');
  assert.equal(extractOrderRef('ticket: 99201'), '99201');
});

test('classifies an order enquiry and routes it to fulfilment', () => {
  const result = triageEnquiry(SAMPLE_ENQUIRIES[0].text);
  assert.equal(result.intent.id, 'order');
  assert.ok(result.intent.confidence > 0.3);
  assert.equal(result.route.team, 'Order fulfilment');
  assert.equal(result.sender.name, 'Ayesha Noor');
  assert.equal(result.entities.orderRef, 'ORD-4471');
  assert.ok(Array.isArray(result.gaps));
});

test('asks for what is missing before anything else', () => {
  const result = triageEnquiry('Hi, I need a website built for my shop.');
  assert.ok(result.gaps.some((gap) => gap.field === 'contact'));
  assert.ok(result.gaps.some((gap) => gap.field === 'timeline'));
  assert.ok(result.draft.body.includes('?'));
});

test('raises urgency and escalates a complaint', () => {
  const result = triageEnquiry(SAMPLE_ENQUIRIES[3].text);
  assert.equal(result.urgency.level, 'high');
  assert.equal(result.intent.id, 'complaint');
  assert.equal(result.route.priority, 'P1');
  assert.ok(result.urgency.reasons.length > 0);
});

test('detects an automation enquiry with a budget and timeline', () => {
  const result = triageEnquiry(SAMPLE_ENQUIRIES[1].text);
  assert.equal(result.intent.id, 'automation');
  assert.equal(result.entities.budget.value, 250000);
  assert.ok(result.entities.timeline);
  assert.equal(result.entities.timeline.toLowerCase(), 'within 6 weeks');
});

test('always produces a human-readable draft and a summary', () => {
  const result = triageEnquiry(SAMPLE_ENQUIRIES[2].text);
  assert.ok(result.draft.body.length > 60);
  assert.ok(result.draft.nextStep.length > 10);
  assert.ok(result.summary.includes('Clinic') || result.summary.includes('Sana'));
});

test('handles an empty message without throwing', () => {
  const result = triageEnquiry('');
  assert.equal(result.empty, true);
  assert.equal(result.route.priority, 'P3');
  assert.ok(result.gaps.length > 0);
});

test('every classification is explainable', () => {
  const result = triageEnquiry(SAMPLE_ENQUIRIES[0].text);
  assert.ok(result.signals.length > 0);
  assert.ok(result.intent.alternatives.length >= 0);
  assert.ok(result.quality.score >= 0 && result.quality.score <= 100);
});

test('is deterministic', () => {
  const a = triageEnquiry(SAMPLE_ENQUIRIES[0].text, { receivedAt: '2026-01-01T00:00:00.000Z' });
  const b = triageEnquiry(SAMPLE_ENQUIRIES[0].text, { receivedAt: '2026-01-01T00:00:00.000Z' });
  assert.deepEqual(a, b);
});
