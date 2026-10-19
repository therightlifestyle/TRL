/**
 * TRL — The Right Lifestyle
 * tests/pipeline.test.mjs — the pipeline model, blueprint and the site audit.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { pipelineMetrics, seedCards, nextStage, previousStage, STAGES, canTransition } from '../assets/js/engines/pipeline.js';
import { LAYERS, getLayer, layerForIntent, PRINCIPLES } from '../assets/js/engines/blueprint.js';
import { checkSite } from '../scripts/check-site.mjs';

test('the pipeline has a coherent stage order', () => {
  assert.equal(STAGES[0].id, 'intake');
  assert.equal(STAGES[STAGES.length - 1].id, 'handover');
  assert.equal(nextStage('intake').id, 'discovery');
  assert.equal(previousStage('intake'), null);
  assert.equal(nextStage('handover'), null);
  assert.equal(canTransition('intake', 'discovery'), true);
  assert.equal(canTransition('intake', 'audit'), false);
});

test('seed data is clearly labelled as sample', () => {
  const cards = seedCards();
  assert.ok(cards.length >= 5);
  cards.forEach((card) => assert.equal(card.business, 'Sample record'));
});

test('metrics aggregate by stage', () => {
  const cards = seedCards();
  const metrics = pipelineMetrics(cards);
  assert.equal(metrics.total, cards.length);
  assert.equal(metrics.open, cards.length - metrics.byStage.handover);
  assert.ok(metrics.pipelineValue > 0);
  assert.ok(metrics.winRate >= 0 && metrics.winRate <= 100);
});

test('the blueprint has five complete layers', () => {
  assert.equal(LAYERS.length, 5);
  LAYERS.forEach((layer) => {
    assert.ok(layer.components.length >= 3, `${layer.id} needs components`);
    assert.ok(layer.metrics.length >= 3, `${layer.id} needs metrics`);
    assert.ok(layer.failureModes.length >= 3, `${layer.id} needs failure modes`);
    assert.ok(layer.flow.length >= 3, `${layer.id} needs a flow`);
  });
  assert.ok(PRINCIPLES.length >= 4);
});

test('intents map onto a blueprint layer', () => {
  assert.equal(layerForIntent('order').id, 'capture');
  assert.equal(layerForIntent('complaint').id, 'route');
  assert.equal(getLayer('nope'), null);
});

test('the site audit passes: no broken links, no external requests', async () => {
  const report = await checkSite();
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  assert.ok(report.pages.length >= 9);
});
