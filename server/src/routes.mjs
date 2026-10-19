/**
 * TRL — The Right Lifestyle
 * server/src/routes.mjs — the TRL API.
 *
 * The API is optional infrastructure. The website works fully without it
 * (every browser-side module has a local fallback); when it is deployed the
 * browser upgrades to server-backed calls automatically.
 *
 * The triage endpoint runs the exact same engine file the browser uses, so
 * the two can never disagree.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { triageEnquiry } from '../../assets/js/engines/triage.js';
import { STAGES, pipelineMetrics } from '../../assets/js/engines/pipeline.js';
import { validateLead, validateTriage } from './validate.mjs';
import { sendJson } from './http.mjs';
import { logger } from './logger.mjs';

async function loadJson(assetsRoot, file) {
  try {
    const raw = await readFile(join(assetsRoot, 'assets', 'data', file), 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error('api.data_load_failed', { file, error: err.message });
    return null;
  }
}

export function createRoutes({ store, assetsRoot, adminToken = '', version = '1.0.0' }) {
  const requireAdmin = (req, res) => {
    if (!adminToken) return true; // open instance — local development
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-admin-token'];
    if (token === adminToken) return true;
    sendJson(res, 401, { error: 'Unauthorized' });
    return false;
  };

  return {
    'GET /api/health': async (req, res) => {
      sendJson(res, 200, {
        ok: true,
        service: 'trl-api',
        version,
        engine: triageEnquiry('health check').version,
        uptimeSeconds: Math.round(process.uptime()),
        leads: store.metrics().total,
        time: new Date().toISOString()
      });
    },

    'GET /api/services': async (req, res) => {
      const data = await loadJson(assetsRoot, 'services.json');
      if (!data) return sendJson(res, 500, { error: 'Service catalogue unavailable' });
      sendJson(res, 200, data);
    },

    'GET /api/insights': async (req, res) => {
      const data = await loadJson(assetsRoot, 'insights.json');
      if (!data) return sendJson(res, 500, { error: 'Insights unavailable' });
      sendJson(res, 200, data);
    },

    'GET /api/knowledge': async (req, res) => {
      const data = await loadJson(assetsRoot, 'knowledge.json');
      if (!data) return sendJson(res, 500, { error: 'Knowledge base unavailable' });
      sendJson(res, 200, data);
    },

    'GET /api/work': async (req, res) => {
      const data = await loadJson(assetsRoot, 'work.json');
      if (!data) return sendJson(res, 500, { error: 'Work index unavailable' });
      sendJson(res, 200, data);
    },

    'GET /api/config': async (req, res) => {
      const data = await loadJson(assetsRoot, 'config.json');
      if (!data) return sendJson(res, 500, { error: 'Configuration unavailable' });
      sendJson(res, 200, data);
    },

    'GET /api/faq': async (req, res) => {
      const data = await loadJson(assetsRoot, 'faq.json');
      if (!data) return sendJson(res, 500, { error: 'FAQ unavailable' });
      sendJson(res, 200, data);
    },

    'GET /api/pipeline': async (req, res) => {
      sendJson(res, 200, { stages: STAGES, metrics: pipelineMetrics([]) });
    },

    'POST /api/triage': async (req, res) => {
      const { valid, errors, text } = validateTriage(req.body || {});
      if (!valid) return sendJson(res, 422, { error: errors[0], errors });
      const result = triageEnquiry(text, { source: 'api' });
      sendJson(res, 200, result);
    },

    'POST /api/leads': async (req, res) => {
      const { valid, errors, lead } = validateLead(req.body || {});
      if (!valid) return sendJson(res, 422, { error: errors[0], errors });

      const triage = triageEnquiry(
        [lead.name, lead.business, lead.service, lead.message].filter(Boolean).join('. '),
        { source: 'lead-intake' }
      );

      const created = await store.createLead({
        ...lead,
        triage: {
          intent: triage.intent.id,
          intentLabel: triage.intent.label,
          confidence: triage.intent.confidence,
          urgency: triage.urgency.level,
          priority: triage.route.priority,
          route: triage.route.team,
          missing: triage.gaps.map((gap) => gap.label)
        }
      });

      logger.info('lead.created', { id: created.id, intent: triage.intent.id, urgency: triage.urgency.level });
      sendJson(res, 201, {
        id: created.id,
        stage: created.stage,
        createdAt: created.createdAt,
        triage: created.triage
      });
    },

    'GET /api/leads': async (req, res) => {
      if (!requireAdmin(req, res)) return undefined;
      const stage = req.query.get('stage');
      const limit = Math.min(500, Number(req.query.get('limit')) || 100);
      sendJson(res, 200, { leads: store.listLeads({ stage, limit }) });
      return undefined;
    },

    'PATCH /api/leads/:id': async (req, res, params) => {
      if (!requireAdmin(req, res)) return undefined;
      const patch = {};
      if (typeof req.body?.stage === 'string') patch.stage = req.body.stage;
      if (typeof req.body?.note === 'string') patch.note = req.body.note.slice(0, 500);
      if (typeof req.body?.value === 'number') patch.value = req.body.value;
      if (!Object.keys(patch).length) return sendJson(res, 422, { error: 'Nothing to update' });

      const updated = await store.updateLead(params.id, patch);
      if (!updated) return sendJson(res, 404, { error: 'Lead not found' });
      sendJson(res, 200, updated);
      return undefined;
    },

    'GET /api/metrics': async (req, res) => {
      if (!requireAdmin(req, res)) return undefined;
      sendJson(res, 200, store.metrics());
      return undefined;
    }
  };
}
