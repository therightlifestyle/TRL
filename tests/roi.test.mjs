/**
 * TRL — The Right Lifestyle
 * tests/roi.test.mjs — the automation opportunity model.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseOpportunity, automatableShare, DEFAULT_INPUT } from '../assets/js/engines/roi.js';

test('repetitive, rule-based work has the highest automatable share', () => {
  const high = automatableShare({ repetitiveness: 5, complexity: 1 });
  const low = automatableShare({ repetitiveness: 1, complexity: 5 });
  assert.ok(high > low);
  assert.ok(high <= 0.9 && low >= 0.05);
});

test('produces ranked candidates with a stated verdict', () => {
  const result = analyseOpportunity(DEFAULT_INPUT);
  assert.equal(result.candidates.length, DEFAULT_INPUT.tasks.length);
  assert.ok(result.ranked[0].totalAnnualBenefit >= result.ranked[result.ranked.length - 1].totalAnnualBenefit);
  result.candidates.forEach((candidate) => {
    assert.ok(['Automate now', 'Plan and phase', 'Quick win', 'Leave alone'].includes(candidate.verdict));
    assert.ok(candidate.annualSaving >= 0);
  });
});

test('totals are internally consistent', () => {
  const result = analyseOpportunity(DEFAULT_INPUT);
  const sum = result.candidates.reduce((acc, c) => acc + c.totalAnnualBenefit, 0);
  assert.ok(Math.abs(sum - result.totals.annualBenefit) <= 2);
  assert.ok(result.totals.annualHoursRecovered > 0);
});

test('always carries the honesty disclaimer', () => {
  const result = analyseOpportunity(DEFAULT_INPUT);
  assert.match(result.disclaimer, /not results measured from a client engagement/i);
});

test('survives empty or nonsense input', () => {
  const result = analyseOpportunity({ tasks: [] });
  assert.ok(result.candidates.length > 0);
  assert.ok(result.totals.annualBenefit >= 0);
});
