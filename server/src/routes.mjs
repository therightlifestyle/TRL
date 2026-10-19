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

import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { triageEnquiry } from '../../assets/js/engines/triage.js';
import { STAGES, pipelineMetrics, ENGINE_VERSION as PIPELINE_VERSION } from '../../assets/js/engines/pipeline.js';
import { indexFromData, search as runSearch, VERSION as SEARCH_VERSION } from '../../assets/js/engines/search.js';
import { ask, starterQuestions, ENGINE_VERSION as ASSISTANT_VERSION } from '../../assets/js/engines/assistant.js';
import { analyseOpportunity, ENGINE_VERSION as ROI_VERSION } from '../../assets/js/engines/roi.js';
import { buildBrief, QUESTION_SET, ENGINE_VERSION as BRIEF_VERSION } from '../../assets/js/engines/brief.js';
import { listLayers, PRINCIPLES, ENGINE_VERSION as BLUEPRINT_VERSION } from '../../assets/js/engines/blueprint.js';
import {
  validateLead, validateTriage, validateSearch, validateAsk,
  validateRoi, validateBrief, validateNewsletter
} from './validate.mjs';
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

/**
 * Content-negotiated JSON with a weak ETag. A repeat request for unchanged
 * data answers 304 with no body, which is most of the bandwidth the API serves.
 */
function sendCached(req, res, payload, { maxAge = 60 } = {}) {
  const body = JSON.stringify(payload);
  const etag = `W/"${createHash('sha1').update(body).digest('base64url')}"`;
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  res.setHeader('ETag', etag);
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304);
    res.end();
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

/**
 * The searchable corpus, built from the data files and rebuilt only when one of
 * them changes on disk. Rebuilding on every request would re-tokenise the whole
 * corpus for each keystroke-driven query.
 */
function createSearchIndex(assetsRoot) {
  const FILES = ['services.json', 'insights.json', 'work.json', 'faq.json', 'knowledge.json'];
  let signature = '';
  let index = null;

  async function signatureOf() {
    const parts = [];
    for (const file of FILES) {
      const info = await stat(join(assetsRoot, 'assets', 'data', file)).catch(() => null);
      parts.push(info ? `${file}:${info.size}:${Math.round(info.mtimeMs)}` : `${file}:missing`);
    }
    return parts.join('|');
  }

  return async function getIndex() {
    const next = await signatureOf();
    if (index && next === signature) return index;

    const [services, insights, work, faq, knowledge] = await Promise.all(
      FILES.map((file) => loadJson(assetsRoot, file))
    );
    index = indexFromData({ services, insights, work, faq, knowledge, pages: [], actions: [] });
    signature = next;
    logger.info('api.search_index_built', { entries: index.length });
    return index;
  };
}

export function createRoutes({ store, assetsRoot, adminToken = '', version = '1.0.0' }) {
  const searchIndex = createSearchIndex(assetsRoot);

  const requireAdmin = (req, res) => {
    if (!adminToken) return true; // open instance — local development
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-admin-token'];
    if (token === adminToken) return true;
    sendJson(res, 401, { error: 'Unauthorized' });
    return false;
  };

  // Handlers are invoked as bare functions (match.handler(req, res, params)),
  // never as methods, so the route table is captured in a closure rather than
  // read from `this` — which is undefined under ESM strict mode.
  const routes = {
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

    /** Machine-readable endpoint list, so the API is discoverable without docs. */
    'GET /api': async (req, res) => {
      sendCached(req, res, {
        service: 'trl-api',
        version,
        engines: {
          triage: triageEnquiry('x').version,
          search: SEARCH_VERSION,
          assistant: ASSISTANT_VERSION,
          roi: ROI_VERSION,
          brief: BRIEF_VERSION,
          blueprint: BLUEPRINT_VERSION,
          pipeline: PIPELINE_VERSION
        },
        endpoints: Object.keys(routes).sort()
      }, { maxAge: 300 });
    },

    'GET /api/engines': async (req, res) => {
      sendCached(req, res, {
        triage: triageEnquiry('x').version,
        search: SEARCH_VERSION,
        assistant: ASSISTANT_VERSION,
        roi: ROI_VERSION,
        brief: BRIEF_VERSION,
        blueprint: BLUEPRINT_VERSION,
        pipeline: PIPELINE_VERSION
      }, { maxAge: 300 });
    },

    'GET /api/services': async (req, res) => {
      const data = await loadJson(assetsRoot, 'services.json');
      if (!data) return sendJson(res, 500, { error: 'Service catalogue unavailable' });
      sendCached(req, res, data);
      return undefined;
    },

    'GET /api/insights': async (req, res) => {
      const data = await loadJson(assetsRoot, 'insights.json');
      if (!data) return sendJson(res, 500, { error: 'Insights unavailable' });
      sendCached(req, res, data);
      return undefined;
    },

    'GET /api/knowledge': async (req, res) => {
      const data = await loadJson(assetsRoot, 'knowledge.json');
      if (!data) return sendJson(res, 500, { error: 'Knowledge base unavailable' });
      sendCached(req, res, data);
      return undefined;
    },

    'GET /api/work': async (req, res) => {
      const data = await loadJson(assetsRoot, 'work.json');
      if (!data) return sendJson(res, 500, { error: 'Work index unavailable' });
      sendCached(req, res, data);
      return undefined;
    },

    'GET /api/config': async (req, res) => {
      const data = await loadJson(assetsRoot, 'config.json');
      if (!data) return sendJson(res, 500, { error: 'Configuration unavailable' });
      sendCached(req, res, data);
      return undefined;
    },

    'GET /api/faq': async (req, res) => {
      const data = await loadJson(assetsRoot, 'faq.json');
      if (!data) return sendJson(res, 500, { error: 'FAQ unavailable' });
      sendCached(req, res, data);
      return undefined;
    },

    'GET /api/pipeline': async (req, res) => {
      sendCached(req, res, { stages: STAGES, metrics: pipelineMetrics([]) });
    },

    'GET /api/blueprint': async (req, res) => {
      sendCached(req, res, {
        version: BLUEPRINT_VERSION,
        layers: listLayers(),
        principles: PRINCIPLES
      });
    },

    'GET /api/brief/questions': async (req, res) => {
      sendCached(req, res, { version: BRIEF_VERSION, questions: QUESTION_SET });
    },

    /**
     * Unified search. Runs the identical engine the browser palette uses, so
     * GET /api/search?q=automation and ⌘K rank the same way by construction.
     */
    'GET /api/search': async (req, res) => {
      const { q, limit, group } = validateSearch({
        q: req.query.get('q') ?? req.query.get('query'),
        limit: req.query.get('limit'),
        group: req.query.get('group')
      });
      const docs = await searchIndex();
      const outcome = runSearch(q, docs, { limit, group });
      sendCached(req, res, { ...outcome, indexed: docs.length }, { maxAge: 0 });
    },

    'POST /api/search': async (req, res) => {
      const { valid, errors, q, limit, group } = validateSearch(req.body || {});
      if (!valid) return sendJson(res, 422, { error: errors[0], errors });
      const docs = await searchIndex();
      sendJson(res, 200, { ...runSearch(q, docs, { limit, group }), indexed: docs.length });
      return undefined;
    },

    'POST /api/triage': async (req, res) => {
      const { valid, errors, text } = validateTriage(req.body || {});
      if (!valid) return sendJson(res, 422, { error: errors[0], errors });
      const result = triageEnquiry(text, { source: 'api' });
      sendJson(res, 200, result);
    },

    'POST /api/assistant': async (req, res) => {
      const { valid, errors, question, limit } = validateAsk(req.body || {});
      if (!valid) return sendJson(res, 422, { error: errors[0], errors });
      const knowledge = await loadJson(assetsRoot, 'knowledge.json');
      const entries = knowledge?.entries || [];
      const answer = ask(question, entries, { limit });
      sendJson(res, 200, { ...answer, corpus: entries.length });
    },

    'GET /api/assistant/starters': async (req, res) => {
      const knowledge = await loadJson(assetsRoot, 'knowledge.json');
      sendCached(req, res, { suggestions: starterQuestions(knowledge?.entries || []) });
    },

    'POST /api/roi': async (req, res) => {
      const { valid, errors, input } = validateRoi(req.body || {});
      if (!valid) return sendJson(res, 422, { error: errors[0], errors });
      sendJson(res, 200, analyseOpportunity(input));
    },

    'POST /api/brief': async (req, res) => {
      const { valid, errors, answers } = validateBrief(req.body || {});
      if (!valid) return sendJson(res, 422, { error: errors[0], errors });
      sendJson(res, 200, buildBrief(answers));
    },

    'POST /api/newsletter': async (req, res) => {
      const { valid, errors, subscriber } = validateNewsletter(req.body || {});
      if (!valid) return sendJson(res, 422, { error: errors[0], errors });
      const { created } = await store.subscribe(subscriber);
      logger.info('newsletter.subscribe', { topic: subscriber.topic, created });
      sendJson(res, created ? 201 : 200, {
        ok: true,
        created,
        topic: subscriber.topic,
        message: created
          ? 'Subscribed. You will hear from us when there is something worth reading.'
          : 'You were already subscribed — your topic preference was updated.'
      });
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

    'GET /api/leads/:id': async (req, res, params) => {
      if (!requireAdmin(req, res)) return undefined;
      const lead = store.getLead(params.id);
      if (!lead) return sendJson(res, 404, { error: 'Lead not found' });
      sendJson(res, 200, lead);
      return undefined;
    },

    'PATCH /api/leads/:id': async (req, res, params) => {
      if (!requireAdmin(req, res)) return undefined;
      const patch = {};
      if (typeof req.body?.stage === 'string') patch.stage = req.body.stage;
      if (typeof req.body?.note === 'string') patch.note = req.body.note.slice(0, 500);
      if (typeof req.body?.value === 'number') patch.value = req.body.value;
      if (!Object.keys(patch).length) return sendJson(res, 422, { error: 'Nothing to update' });

      let result = await store.updateLead(params.id, patch);
      if (!result) return sendJson(res, 404, { error: 'Lead not found' });

      // Stage moves are recorded, not just applied, so the pipeline is auditable.
      // The response must be the post-history record, not the pre-history one.
      if (patch.stage) {
        const withHistory = await store.appendHistory(params.id, { event: 'stage', to: patch.stage });
        if (withHistory) result = withHistory;
      }

      sendJson(res, 200, result);
      return undefined;
    },

    'DELETE /api/leads/:id': async (req, res, params) => {
      if (!requireAdmin(req, res)) return undefined;
      const removed = await store.deleteLead(params.id);
      if (!removed) return sendJson(res, 404, { error: 'Lead not found' });
      logger.info('lead.deleted', { id: params.id });
      sendJson(res, 200, { ok: true, id: params.id });
      return undefined;
    },

    'GET /api/subscribers': async (req, res) => {
      if (!requireAdmin(req, res)) return undefined;
      const topic = req.query.get('topic');
      sendJson(res, 200, { subscribers: store.listSubscribers({ topic }) });
      return undefined;
    },

    'GET /api/metrics': async (req, res) => {
      if (!requireAdmin(req, res)) return undefined;
      sendJson(res, 200, store.metrics());
      return undefined;
    }
  };

  return routes;
}
