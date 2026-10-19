/**
 * TRL — The Right Lifestyle
 * apps/console.js — the TRL Console application.
 *
 * A working, client-side system surface: the enquiry triage engine, the
 * enquiry pipeline, the reference system architecture, the automation
 * opportunity model, the scope brief builder and the TRL assistant.
 *
 * Everything runs in the browser. When a TRL API is deployed and reachable
 * the console upgrades to server-backed calls; when it is not, the local
 * engines take over and the status chip says so honestly.
 */

import { qs, qsa, el, escapeHtml, copyText, downloadText, prefersReducedMotion } from '../core/dom.js';
import { createRouter } from '../core/router.js';
import { createStore } from '../core/store.js';
import { api, withFallback, getStatus, onStatusChange, getApiBase } from '../core/api.js';
import { CONFIG } from '../core/config.js';
import { loadKnowledge, loadWork } from '../core/data.js';
import { triageEnquiry, SAMPLE_ENQUIRIES } from '../engines/triage.js';
import { analyseOpportunity, DEFAULT_INPUT, QUADRANTS } from '../engines/roi.js';
import { LAYERS, PRINCIPLES, getLayer, layerForIntent } from '../engines/blueprint.js';
import { QUESTION_SET, buildBrief, briefToMarkdown } from '../engines/brief.js';
import { STAGES, DISICIPLINES, seedCards, pipelineMetrics, nextStage, previousStage, stageById } from '../engines/pipeline.js';
import { icon } from '../components/icons.js';
import { rootUrl } from '../core/paths.js';
import { toast } from '../components/toast.js';
import { createChat } from '../components/chat.js';
import { pkr, num, relativeTime, dateShort } from '../core/format.js';

/* ------------------------------------------------------------------ state */

const pipelineStore = createStore({
  key: 'trl-console-pipeline',
  version: CONFIG.storeVersion,
  initial: { cards: [] }
});

const briefStore = createStore({
  key: 'trl-console-brief',
  version: CONFIG.storeVersion,
  initial: { answers: {} }
});

const roiStore = createStore({
  key: 'trl-console-roi',
  version: CONFIG.storeVersion,
  initial: DEFAULT_INPUT
});

let knowledge = [];
let workItems = [];

/* ------------------------------------------------------------------ helpers */

function engineChip() {
  const status = getStatus();
  const online = status === 'online';
  return `<span class="engine-status ${online ? 'online' : 'offline'}" data-engine-status>
    <span class="dot"></span>${online ? 'API connected' : 'Local engine'}</span>`;
}

function viewShell(title, subtitle, body, head = '') {
  return `
    <div class="con-head">
      <div>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="row">${head}</div>
    </div>
    ${body}`;
}

function kpiRow(items) {
  return `<div class="kpi-row">${items.map((item) => `
    <div><b>${item.value}</b><span>${item.label}</span></div>`).join('')}</div>`;
}

/* ------------------------------------------------------------------ view: triage */

function triageView() {
  const body = `
    <div class="grid-side">
      <div class="panel">
        <div class="panel-head">
          <div><b>Raw enquiry</b><small>Paste a customer message exactly as it arrived.</small></div>
          ${engineChip()}
        </div>
        <div class="panel-body">
          <label class="mini-h" for="triage-input">Message</label>
          <textarea class="triage-input" id="triage-input" placeholder="Paste an enquiry — WhatsApp, email, web form or a note taken from a phone call."></textarea>
          <div class="samples">
            <span class="lbl">Samples</span>
            ${SAMPLE_ENQUIRIES.map((s, i) => `<button type="button" data-sample="${i}">${escapeHtml(s.label)}</button>`).join('')}
          </div>
          <div class="btn-row" style="margin-top:1.2rem">
            <button class="btn btn-sm btn-gold" id="triage-run" type="button">${icon('play', 15)} Run the engine</button>
            <button class="btn btn-sm btn-line" id="triage-clear" type="button">Clear</button>
            <span class="tiny" style="flex:1;min-width:18ch">Runs entirely in your browser. Nothing is transmitted or stored.</span>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <div><b>Structured record</b><small>What the engine produced, and why.</small></div>
          <div class="row">
            <button class="btn btn-sm btn-line" id="triage-copy" type="button">${icon('copy', 14)} Copy JSON</button>
            <button class="btn btn-sm btn-line" id="triage-dl" type="button">${icon('download', 14)} Download</button>
          </div>
        </div>
        <div class="panel-body" id="triage-result">
          <p class="muted" style="font-size:.88rem">Run the engine to see the structured record, the routing decision and a reply draft.</p>
        </div>
      </div>
    </div>`;

  return viewShell(
    'Enquiry triage &amp; routing engine',
    'Turns unstructured customer messages into a structured, prioritised record with a human-approved reply draft.',
    body,
    `<button class="btn btn-sm btn-line" id="triage-to-pipeline" type="button">${icon('inbox', 14)} Send to pipeline</button>`
  );
}

function renderTriageResult(result) {
  const host = qs('#triage-result');
  if (!host) return;

  const urgencyClass = { high: 'high', medium: 'med', low: 'low' }[result.urgency.level] || 'low';
  const confidence = Math.round(result.intent.confidence * 100);
  const quality = result.quality.score;

  host.innerHTML = `
    <div class="mini-h">Summary</div>
    <p style="font-size:.9rem;color:var(--tx-2);line-height:1.7;margin-bottom:1.2rem">${escapeHtml(result.summary)}</p>

    <div class="grid-2" style="gap:1.2rem">
      <div>
        <div class="mini-h">Classification</div>
        <dl class="kv">
          <div><dt>Intent</dt><dd>${escapeHtml(result.intent.label)}<span class="sub">Confidence ${confidence}%${result.intent.alternatives.length ? ` · next: ${escapeHtml(result.intent.alternatives[0].label)} (${Math.round(result.intent.alternatives[0].confidence * 100)}%)` : ''}</span></dd></div>
          <div><dt>Urgency</dt><dd><span class="pill ${urgencyClass}">${result.urgency.level}</span>${result.urgency.reasons.length ? `<span class="sub">${escapeHtml(result.urgency.reasons.slice(0, 2).join(' · '))}</span>` : ''}</dd></div>
          <div><dt>Route</dt><dd>${escapeHtml(result.route.team)}<span class="sub">${escapeHtml(result.route.priority)} · ${escapeHtml(result.route.sla)}</span></dd></div>
          <div><dt>Quality</dt><dd>${quality}/100<span class="sub">Completeness ${Math.round(result.quality.completeness * 100)}% · ${result.quality.wordCount} words</span>
            <div class="conf-bar"><i style="width:${quality}%"></i></div></dd></div>
        </dl>
      </div>
      <div>
        <div class="mini-h">Extracted</div>
        <dl class="kv">
          <div><dt>Sender</dt><dd>${escapeHtml(result.sender.name || 'Not identified')}<span class="sub">${escapeHtml(result.sender.business || 'No business given')}</span></dd></div>
          <div><dt>Contact</dt><dd>${escapeHtml(result.sender.email || result.sender.phone || 'No reply channel')}<span class="sub">Channel: ${escapeHtml(result.sender.channel)}</span></dd></div>
          <div><dt>Reference</dt><dd>${escapeHtml(result.entities.orderRef || '—')}</dd></div>
          <div><dt>Budget</dt><dd>${result.entities.budget ? escapeHtml(result.entities.budget.raw) : '—'}</dd></div>
          <div><dt>Timeline</dt><dd>${escapeHtml(result.entities.timeline || '—')}</dd></div>
          <div><dt>Key points</dt><dd>${result.entities.topics?.length ? escapeHtml(result.entities.topics.join(', ')) : '—'}<span class="sub">phrases that drove the classification</span></dd></div>
        </dl>
      </div>
    </div>

    <div class="mini-h" style="margin-top:1.6rem">Reply draft — for human approval</div>
    <div class="draft">${escapeHtml(result.draft.body)}</div>
    <p class="tiny" style="margin-top:.6rem">Next step: ${escapeHtml(result.draft.nextStep)}</p>

    <div class="mini-h" style="margin-top:1.6rem">Gaps to confirm</div>
    <ul class="gaps">
      ${result.gaps.length
        ? result.gaps.map((gap) => `<li><b>${escapeHtml(gap.label)}</b> — ${escapeHtml(gap.question)}</li>`).join('')
        : '<li class="ok">Nothing missing — the record is complete enough to action.</li>'}
    </ul>

    ${result.quality.flags.length ? `
      <div class="mini-h" style="margin-top:1.4rem">Quality flags</div>
      <ul class="gaps">${result.quality.flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join('')}</ul>` : ''}
  `;
}

/* ------------------------------------------------------------------ view: pipeline */

function pipelineView() {
  const cards = pipelineStore.get('cards');
  const metrics = pipelineMetrics(cards);

  const body = `
    ${kpiRow([
      { label: 'Open enquiries', value: num(metrics.open) },
      { label: 'Pipeline value', value: pkr(metrics.pipelineValue, { compact: true }) },
      { label: 'Past SLA', value: num(metrics.overdue) },
      { label: 'Win rate', value: `${metrics.winRate}%` }
    ])}
    <div class="panel">
      <div class="panel-head">
        <div><b>Enquiry pipeline</b><small>Drag a card between columns. The stages mirror the real TRL engagement method.</small></div>
        <div class="row">
          <span class="label sample">Sample data</span>
          <button class="btn btn-sm btn-line" id="pipe-reset" type="button">${icon('refresh', 14)} Reset to sample</button>
          <button class="btn btn-sm btn-gold" id="pipe-new" type="button">${icon('plus', 14)} New enquiry</button>
        </div>
      </div>
      <div class="panel-body tight">
        <div class="kanban" id="kanban">
          ${STAGES.map((stage) => `
            <div class="kcol" data-stage="${stage.id}">
              <div class="kcol-head">
                <b>${escapeHtml(stage.name)}</b>
                <span data-count="${stage.id}">0</span>
              </div>
              <div class="kcol-body" data-drop="${stage.id}"></div>
            </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="panel" id="pipe-form-panel" hidden>
      <div class="panel-head"><div><b>Log a new enquiry</b><small>Adds a card to the board and to your local store.</small></div></div>
      <div class="panel-body">
        <div class="form-grid">
          <div class="field full"><label for="np-title">Summary <span class="req">*</span></label>
            <input class="input" id="np-title" placeholder="e.g. Inbound enquiry — WhatsApp, packaging supplier" /></div>
          <div class="field"><label for="np-business">Business</label><input class="input" id="np-business" placeholder="Company or individual" /></div>
          <div class="field"><label for="np-discipline">Discipline</label>
            <select class="select" id="np-discipline">${DISICIPLINES.map((d) => `<option>${escapeHtml(d)}</option>`).join('')}</select></div>
          <div class="field"><label for="np-value">Indicative value (PKR)</label><input class="input" id="np-value" type="number" min="0" step="1000" placeholder="0" /></div>
          <div class="field"><label for="np-note">Note</label><input class="input" id="np-note" placeholder="One line of context" /></div>
        </div>
        <div class="btn-row" style="margin-top:1.1rem">
          <button class="btn btn-sm btn-gold" id="np-save" type="button">Add to pipeline</button>
          <button class="btn btn-sm btn-line" id="np-cancel" type="button">Cancel</button>
        </div>
      </div>
    </div>`;

  return viewShell(
    'Enquiry pipeline',
    'The commercial flow from first message to handover — the same stages a TRL engagement moves through.',
    body
  );
}

function renderPipeline() {
  const cards = pipelineStore.get('cards');
  const metrics = pipelineMetrics(cards);

  STAGES.forEach((stage) => {
    const countNode = document.querySelector(`[data-count="${stage.id}"]`);
    if (countNode) countNode.textContent = cards.filter((c) => c.stage === stage.id).length;
  });

  qsa('[data-drop]').forEach((column) => {
    const stageId = column.dataset.drop;
    const stageCards = cards.filter((card) => card.stage === stageId);
    column.innerHTML = stageCards.map((card) => `
      <div class="kcard" draggable="true" data-card="${card.id}">
        <b>${escapeHtml(card.title)}</b>
        <small>${escapeHtml(card.business || '—')} · ${relativeTime(card.updatedAt)}</small>
        <div class="tags"><span>${escapeHtml(card.discipline)}</span>${card.value ? `<span>${pkr(card.value, { compact: true })}</span>` : ''}</div>
        ${card.note ? `<small>${escapeHtml(card.note)}</small>` : ''}
      </div>`).join('');
  });

  const kpis = document.querySelectorAll('.kpi-row div');
  if (kpis.length >= 4) {
    kpis[0].querySelector('b').textContent = num(metrics.open);
    kpis[1].querySelector('b').textContent = pkr(metrics.pipelineValue, { compact: true });
    kpis[2].querySelector('b').textContent = num(metrics.overdue);
    kpis[3].querySelector('b').textContent = `${metrics.winRate}%`;
  }
}

function wirePipelineDrag() {
  let dragged = null;

  qsa('.kcard').forEach((card) => {
    card.addEventListener('dragstart', () => {
      dragged = card;
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      qsa('.kcol').forEach((col) => col.classList.remove('drop'));
    });
  });

  qsa('[data-drop]').forEach((column) => {
    column.addEventListener('dragover', (event) => {
      event.preventDefault();
      column.closest('.kcol')?.classList.add('drop');
    });
    column.addEventListener('dragleave', () => column.closest('.kcol')?.classList.remove('drop'));
    column.addEventListener('drop', (event) => {
      event.preventDefault();
      column.closest('.kcol')?.classList.remove('drop');
      if (!dragged) return;
      const id = dragged.dataset.card;
      const stageId = column.dataset.drop;
      moveCard(id, stageId);
      dragged = null;
    });
  });
}

function moveCard(id, stageId) {
  const cards = pipelineStore.get('cards').map((card) => (
    card.id === id ? { ...card, stage: stageId, updatedAt: new Date().toISOString() } : card
  ));
  pipelineStore.set({ cards });
  renderPipeline();
  wirePipelineDrag();
  const stage = stageById(stageId);
  toast(`Moved to ${stage?.name || stageId}`, { type: 'ok' });
}

function addCard(data) {
  const now = new Date().toISOString();
  const card = {
    id: `local-${Date.now().toString(36)}`,
    title: data.title,
    business: data.business || 'Not stated',
    discipline: data.discipline || DISICIPLINES[0],
    value: Number(data.value) || 0,
    stage: 'intake',
    note: data.note || '',
    createdAt: now,
    updatedAt: now
  };
  pipelineStore.update((state) => ({ cards: [card, ...state.cards] }));
  renderPipeline();
  wirePipelineDrag();
}

/* ------------------------------------------------------------------ view: blueprint */

function blueprintView() {
  const body = `
    <div class="blueprint">
      <div class="bp-stack" role="tablist" aria-label="System layers">
        ${LAYERS.map((layer) => `
          <button class="bp-layer" role="tab" data-layer="${layer.id}" aria-selected="${layer.index === 1}">
            <span class="bp-n">0${layer.index}</span>
            <span><b>${escapeHtml(layer.name)}</b><small>${escapeHtml(layer.tagline)}</small></span>
            <span class="bp-arrow">${icon('arrow', 14)}</span>
          </button>`).join('')}
      </div>
      <div class="bp-panel" id="bp-panel"></div>
    </div>
    <div class="panel" style="margin-top:1rem">
      <div class="panel-head"><div><b>Design principles</b><small>The rules we design against, whatever the stack.</small></div></div>
      <div class="panel-body">
        <div class="grid g3" style="gap:1rem">
          ${PRINCIPLES.map((p) => `
            <div class="card card-ghost" style="gap:.35rem">
              <h3 style="font-size:.95rem">${escapeHtml(p.title)}</h3>
              <p style="font-size:.8rem">${escapeHtml(p.body)}</p>
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  return viewShell(
    'Reference system architecture',
    'Five layers, each with what we build, what we measure, the tools we reach for and the failure modes we design against.',
    body
  );
}

function renderBlueprintLayer(id) {
  const layer = getLayer(id) || LAYERS[0];
  const panel = qs('#bp-panel');
  if (!panel) return;
  panel.innerHTML = `
    <h3>${escapeHtml(layer.name)} — ${escapeHtml(layer.tagline)}</h3>
    <p>${escapeHtml(layer.purpose)}</p>
    <div class="grid g2" style="gap:1.4rem">
      <div>
        <div class="mini-h">What we implement</div>
        <ul style="display:flex;flex-direction:column;gap:.45rem">
          ${layer.components.map((c) => `<li style="font-size:.84rem;color:var(--tx-2);padding-left:1.1rem;position:relative">${escapeHtml(c)}</li>`).join('')}
        </ul>
        <div class="mini-h" style="margin-top:1.2rem">Failure modes we design against</div>
        <ul style="display:flex;flex-direction:column;gap:.45rem">
          ${layer.failureModes.map((c) => `<li style="font-size:.84rem;color:var(--tx-3);padding-left:1.1rem;position:relative">${escapeHtml(c)}</li>`).join('')}
        </ul>
      </div>
      <div>
        <div class="mini-h">Signals we measure</div>
        <div class="bp-kpis">
          ${layer.metrics.map((m) => `<div class="bp-kpi"><b>${escapeHtml(m.value)}</b><span>${escapeHtml(m.label)}</span></div>`).join('')}
        </div>
        <div class="mini-h" style="margin-top:1.2rem">Tools we usually reach for</div>
        <div class="row" style="gap:.4rem">
          ${layer.tools.map((t) => `<span class="chip" style="cursor:default">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="bp-flow">
      ${layer.flow.map((step, i) => `<i>${escapeHtml(step)}</i>${i < layer.flow.length - 1 ? '<span>→</span>' : ''}`).join('')}
    </div>`;
}

/* ------------------------------------------------------------------ view: roi */

function roiView() {
  const input = roiStore.state;
  const body = `
    <div class="calc">
      <div class="panel">
        <div class="panel-head">
          <div><b>Your operating numbers</b><small>Everything below is modelled from what you enter here.</small></div>
        </div>
        <div class="panel-body calc-controls">
          <div class="calc-field">
            <label for="roi-team">People doing this work <span class="val" data-val="teamSize">${input.teamSize}</span></label>
            <input type="range" id="roi-team" min="1" max="40" step="1" value="${input.teamSize}" data-roi="teamSize" />
          </div>
          <div class="calc-field">
            <label for="roi-hours">Hours per person, per week <span class="val" data-val="hoursPerWeek">${input.hoursPerWeek}</span></label>
            <input type="range" id="roi-hours" min="1" max="60" step="1" value="${input.hoursPerWeek}" data-roi="hoursPerWeek" />
          </div>
          <div class="calc-field">
            <label for="roi-cost">Fully loaded cost per hour (PKR) <span class="val" data-val="hourlyCost">${num(input.hourlyCost)}</span></label>
            <input type="range" id="roi-cost" min="200" max="8000" step="100" value="${input.hourlyCost}" data-roi="hourlyCost" />
          </div>
          <div class="mini-h" style="margin-top:.6rem">Tasks in scope</div>
          <div class="table-wrap">
            <table class="data" style="min-width:520px">
              <thead><tr><th>Task</th><th>Hours/wk</th><th>Repetitive</th><th>Complexity</th><th>Error rate</th></tr></thead>
              <tbody id="roi-tasks">
                ${input.tasks.map((task, i) => `
                  <tr>
                    <td><input class="input" data-task="${i}" data-field="name" value="${escapeHtml(task.name)}" style="padding:.45rem .6rem;font-size:.82rem" /></td>
                    <td><input class="input" type="number" data-task="${i}" data-field="hours" value="${task.hours}" min="0" max="80" style="padding:.45rem .6rem;font-size:.82rem;width:5.4rem" /></td>
                    <td><input class="input" type="number" data-task="${i}" data-field="repetitiveness" value="${task.repetitiveness}" min="1" max="5" style="padding:.45rem .6rem;font-size:.82rem;width:4.2rem" /></td>
                    <td><input class="input" type="number" data-task="${i}" data-field="complexity" value="${task.complexity}" min="1" max="5" style="padding:.45rem .6rem;font-size:.82rem;width:4.2rem" /></td>
                    <td><input class="input" type="number" data-task="${i}" data-field="errorRate" value="${task.errorRate}" min="0" max="1" step="0.01" style="padding:.45rem .6rem;font-size:.82rem;width:4.6rem" /></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="btn-row">
            <button class="btn btn-sm btn-line" id="roi-add" type="button">${icon('plus', 14)} Add task</button>
            <button class="btn btn-sm btn-line" id="roi-reset" type="button">${icon('refresh', 14)} Reset</button>
          </div>
        </div>
      </div>

      <div>
        <div class="panel">
          <div class="panel-head">
            <div><b>Modelled outcome</b><small>Change any number on the left and this updates instantly.</small></div>
          </div>
          <div class="panel-body">
            <div class="calc-out" id="roi-out"></div>
            <div class="matrix" id="roi-matrix">
              <span class="q-lbl q1">Automate now</span>
              <span class="q-lbl q2">Plan and phase</span>
              <span class="q-lbl q3">Leave alone</span>
              <span class="q-lbl q4">Quick win</span>
            </div>
            <p class="tiny" style="margin-top:.8rem">Each dot is one task. Top-right is high impact and low effort — start there.</p>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><b>Prioritised shortlist</b><small>Ranked by modelled annual benefit.</small></div></div>
          <div class="panel-body tight">
            <div class="table-wrap" style="border:0;border-radius:0">
              <table class="data">
                <thead><tr><th>Task</th><th>Verdict</th><th>Hours/yr</th><th>Annual benefit</th><th>Payback</th></tr></thead>
                <tbody id="roi-table"></tbody>
              </table>
            </div>
          </div>
        </div>
        <p class="note info" id="roi-disclaimer" style="margin-top:1rem"></p>
      </div>
    </div>`;

  return viewShell(
    'Automation opportunity model',
    'Enter your real numbers. The model ranks the work by impact against effort — including the work it says to leave alone.',
    body
  );
}

function renderRoi() {
  const result = analyseOpportunity(roiStore.state);
  const out = qs('#roi-out');
  if (out) {
    out.innerHTML = `
      <div><b>${pkr(result.totals.annualBenefit, { compact: true })}</b><span>Annual benefit modelled</span></div>
      <div><b>${num(result.totals.annualHoursRecovered)}</b><span>Hours recovered / year</span></div>
      <div><b class="gold">${result.totals.fastestPaybackMonths ?? '—'} mo</b><span>Fastest payback</span></div>`;
  }

  const matrix = qs('#roi-matrix');
  if (matrix) {
    qsa('.dot', matrix).forEach((dot) => dot.remove());
    result.candidates.forEach((candidate) => {
      const x = Math.min(96, Math.max(4, candidate.effort));
      const y = Math.min(94, Math.max(6, 100 - candidate.impact));
      const dot = el('span', {
        class: `dot ${candidate.quadrant === 'high' || candidate.quadrant === 'planned' ? 'hi' : ''}`,
        style: { left: `${x}%`, top: `${y}%` },
        title: `${candidate.name} — ${candidate.verdict}`
      });
      matrix.append(dot);
    });
  }

  const table = qs('#roi-table');
  if (table) {
    table.innerHTML = result.ranked.map((candidate) => `
      <tr>
        <td><b>${escapeHtml(candidate.name)}</b><br /><span class="tiny">${candidate.verdict} · effort ${candidate.effort}/100</span></td>
        <td><span class="pill ${candidate.quadrant === 'high' ? 'gold' : candidate.quadrant === 'low' ? 'low' : 'info'}">${escapeHtml(candidate.verdict)}</span></td>
        <td>${num(candidate.annualHoursSaved)}</td>
        <td>${pkr(candidate.totalAnnualBenefit, { compact: true })}</td>
        <td>${candidate.paybackMonths < 999 ? `${candidate.paybackMonths} mo` : '—'}</td>
      </tr>`).join('');
  }

  const disclaimer = qs('#roi-disclaimer');
  if (disclaimer) disclaimer.textContent = result.disclaimer;
}

/* ------------------------------------------------------------------ view: brief */

function briefView() {
  const answers = briefStore.get('answers') || {};
  const body = `
    <div class="grid-side">
      <div class="panel">
        <div class="panel-head">
          <div><b>Scope brief builder</b><small>Eight questions. A written brief you can send to any firm — including us.</small></div>
        </div>
        <div class="panel-body">
          <div class="stack stack-4" id="brief-form">
            ${QUESTION_SET.map((question) => {
              if (question.type === 'textarea') {
                return `<div class="field"><label for="bq-${question.id}">${escapeHtml(question.label)} ${question.required ? '<span class="req">*</span>' : ''}</label>
                  <textarea class="textarea" id="bq-${question.id}" data-brief="${question.id}" placeholder="${escapeHtml(question.placeholder || '')}">${escapeHtml(answers[question.id] || '')}</textarea></div>`;
              }
              if (question.type === 'select') {
                return `<div class="field"><label for="bq-${question.id}">${escapeHtml(question.label)}</label>
                  <select class="select" id="bq-${question.id}" data-brief="${question.id}">
                    <option value="">Select…</option>
                    ${question.options.map((option) => `<option ${answers[question.id] === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
                  </select></div>`;
              }
              return `<div class="field"><label for="bq-${question.id}">${escapeHtml(question.label)}</label>
                <input class="input" id="bq-${question.id}" data-brief="${question.id}" value="${escapeHtml(answers[question.id] || '')}" placeholder="${escapeHtml(question.placeholder || '')}" /></div>`;
            }).join('')}
          </div>
          <div class="btn-row" style="margin-top:1.2rem">
            <button class="btn btn-sm btn-gold" id="brief-build" type="button">${icon('spark', 14)} Build the brief</button>
            <button class="btn btn-sm btn-line" id="brief-copy" type="button">${icon('copy', 14)} Copy brief</button>
            <button class="btn btn-sm btn-line" id="brief-dl" type="button">${icon('download', 14)} Download</button>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><b>Generated brief</b><small>Updates as you answer.</small></div></div>
        <div class="panel-body" id="brief-out">
          <p class="muted" style="font-size:.88rem">Answer the questions on the left and the brief builds itself.</p>
        </div>
      </div>
    </div>`;

  return viewShell(
    'Scope brief builder',
    'A structured brief is where a project stops being a guess. Generate one before you commit to anything.',
    body
  );
}

function renderBrief() {
  const brief = buildBrief(briefStore.get('answers') || {});
  const out = qs('#brief-out');
  if (!out) return;

  out.innerHTML = `
    <div class="mini-h">Assessment</div>
    <dl class="kv">
      <div><dt>Route</dt><dd>${escapeHtml(brief.route)}</dd></div>
      <div><dt>Priority</dt><dd>${brief.priority} / 5</dd></div>
      <div><dt>Duration</dt><dd>${escapeHtml(brief.estimatedDuration)}</dd></div>
      <div><dt>First step</dt><dd>${escapeHtml(brief.recommendedFirstStep)}</dd></div>
    </div>
    ${brief.missing.length ? `<div class="mini-h" style="margin-top:1.3rem">Still missing</div>
      <ul class="gaps">${brief.missing.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>` : ''}
    <div class="mini-h" style="margin-top:1.3rem">Preview</div>
    <pre class="draft" style="white-space:pre-wrap;font-family:var(--sans)">${escapeHtml(briefToMarkdown(brief))}</pre>`;
  return brief;
}

/* ------------------------------------------------------------------ view: assistant */

function assistantView() {
  const body = `
    <div class="assist-wrap">
      <div class="panel">
        <div class="panel-head">
          <div><b>TRL assistant</b><small>Answers from TRL's own published information. Runs locally — nothing is sent.</small></div>
          ${engineChip()}
        </div>
        <div class="panel-body tight">
          <div class="chat assist-chat" id="assist-chat"></div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><div><b>What it knows</b><small>The knowledge base it answers from.</small></div></div>
        <div class="panel-body" style="max-height:640px;overflow:auto">
          <ul style="display:flex;flex-direction:column;gap:.5rem">
            ${knowledge.map((entry) => `
              <li style="border:1px solid var(--hair);border-radius:var(--r);padding:.6rem .7rem">
                <b style="font-size:.84rem">${escapeHtml(entry.title)}</b>
                <div class="tiny" style="margin-top:.2rem">${escapeHtml(entry.keywords.slice(0, 5).join(' · '))}</div>
              </li>`).join('')}
          </ul>
        </div>
      </div>
    </div>`;

  return viewShell(
    'TRL assistant',
    'Ask about services, pricing, process, timelines or ownership. If it does not know, it says so.',
    body
  );
}

function wireAssistant() {
  const host = qs('#assist-chat');
  if (!host) return;
  createChat(host, {
    knowledge,
    greeting: 'Hello — I answer from TRL’s published information: the seven service disciplines, the fixed-fee audit, the four-stage process, timelines, ownership at handover, and what we will not do. What would you like to know?'
  });
}

/* ------------------------------------------------------------------ views: work */

function workView() {
  const body = `
    <div class="panel">
      <div class="panel-head">
        <div><b>Demonstrations &amp; sample deliverables</b><small>Every item is labelled. Nothing here is presented as a client result.</small></div>
        <div class="row">${engineChip()}</div>
      </div>
      <div class="panel-body">
        <div class="insight-grid">
          ${workItems.map((item) => `
            <article class="insight" data-work="${item.id}">
              <div class="insight-visual">
                <span class="insight-cat">${escapeHtml(item.discipline)}</span>
                ${workVisual(item.visual)}
              </div>
              <div class="insight-body">
                <div class="row" style="gap:.5rem">
                  <span class="label ${item.status === 'demo' ? 'demo' : item.status === 'live' ? 'live' : 'sample'}">${escapeHtml(item.statusLabel)}</span>
                </div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.summary)}</p>
                <div class="insight-foot"><span>${escapeHtml(item.year)}</span><a class="card-more" href="${escapeHtml(rootUrl(item.link))}">${escapeHtml(item.linkLabel)} →</a></div>
              </div>
            </article>`).join('')}
        </div>
      </div>
    </div>`;

  return viewShell(
    'Demonstrations &amp; work',
    'Working prototypes and sample deliverables — the standard of thinking you can judge before you speak to us.',
    body
  );
}

function workVisual(kind) {
  const base = '<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">';
  const bg = '<rect width="400" height="225" fill="#081426"/>';
  if (kind === 'triage') {
    return `${base}${bg}
      <rect x="28" y="34" width="150" height="150" rx="6" fill="#0D1E39" stroke="rgba(255,255,255,.12)"/>
      <rect x="46" y="56" width="96" height="7" rx="3.5" fill="rgba(255,255,255,.18)"/>
      <rect x="46" y="72" width="112" height="7" rx="3.5" fill="rgba(255,255,255,.11)"/>
      <rect x="46" y="88" width="82" height="7" rx="3.5" fill="rgba(255,255,255,.11)"/>
      <rect x="46" y="118" width="44" height="16" rx="3" fill="#C9A227" opacity=".8"/>
      <rect x="46" y="146" width="72" height="16" rx="3" fill="rgba(91,157,255,.25)"/>
      <path d="M196 110h44" stroke="#C9A227" stroke-width="1.4"/>
      <path d="m236 106 6 4-6 4" fill="none" stroke="#C9A227" stroke-width="1.4"/>
      <rect x="248" y="34" width="124" height="150" rx="6" fill="#0A1830" stroke="rgba(255,255,255,.1)"/>
      <rect x="264" y="56" width="58" height="7" rx="3.5" fill="#C9A227" opacity=".75"/>
      <rect x="264" y="78" width="92" height="6" rx="3" fill="rgba(255,255,255,.13)"/>
      <rect x="264" y="94" width="76" height="6" rx="3" fill="rgba(255,255,255,.13)"/>
      <rect x="264" y="110" width="88" height="6" rx="3" fill="rgba(255,255,255,.13)"/>
      <rect x="264" y="132" width="40" height="14" rx="3" fill="rgba(76,175,130,.35)"/>
      <rect x="264" y="154" width="66" height="14" rx="3" fill="rgba(224,163,74,.3)"/>
      </svg>`;
  }
  if (kind === 'roi') {
    return `${base}${bg}
      <path d="M60 40v140h300" stroke="rgba(255,255,255,.14)" fill="none"/>
      <path d="M60 110h300M210 40v140" stroke="rgba(255,255,255,.08)" fill="none"/>
      <circle cx="110" cy="150" r="7" fill="#5B9DFF"/>
      <circle cx="150" cy="70" r="9" fill="#C9A227"/>
      <circle cx="250" cy="96" r="7" fill="#5B9DFF"/>
      <circle cx="310" cy="140" r="6" fill="rgba(255,255,255,.25)"/>
      <circle cx="195" cy="52" r="6" fill="rgba(255,255,255,.25)"/>
      </svg>`;
  }
  if (kind === 'blueprint') {
    return `${base}${bg}
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="${34 + i * 68}" y="${58 + i * 8}" width="58" height="${96 - i * 8}" rx="4" fill="#0D1E39" stroke="rgba(255,255,255,.12)"/>`).join('')}
      <rect x="46" y="70" width="30" height="4" rx="2" fill="#C9A227" opacity=".8"/>
      <rect x="114" y="76" width="30" height="4" rx="2" fill="#5B9DFF" opacity=".7"/>
      <rect x="182" y="84" width="30" height="4" rx="2" fill="#5B9DFF" opacity=".5"/>
      <rect x="250" y="92" width="30" height="4" rx="2" fill="rgba(255,255,255,.2)"/>
      <rect x="318" y="100" width="30" height="4" rx="2" fill="rgba(255,255,255,.2)"/>
      </svg>`;
  }
  if (kind === 'brief') {
    return `${base}${bg}
      <rect x="60" y="30" width="280" height="165" rx="6" fill="#0D1E39" stroke="rgba(255,255,255,.12)"/>
      <rect x="84" y="54" width="120" height="8" rx="4" fill="#C9A227" opacity=".8"/>
      <rect x="84" y="76" width="200" height="6" rx="3" fill="rgba(255,255,255,.14)"/>
      <rect x="84" y="92" width="176" height="6" rx="3" fill="rgba(255,255,255,.14)"/>
      <rect x="84" y="116" width="64" height="22" rx="4" fill="rgba(201,162,39,.16)" stroke="rgba(201,162,39,.4)"/>
      <rect x="160" y="116" width="64" height="22" rx="4" fill="rgba(91,157,255,.14)" stroke="rgba(91,157,255,.35)"/>
      <rect x="84" y="152" width="140" height="6" rx="3" fill="rgba(255,255,255,.1)"/>
      </svg>`;
  }
  if (kind === 'audit') {
    return `${base}${bg}
      <rect x="140" y="24" width="120" height="176" rx="6" fill="#0D1E39" stroke="rgba(255,255,255,.12)"/>
      <rect x="160" y="48" width="66" height="7" rx="3.5" fill="#C9A227" opacity=".85"/>
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="160" y="${70 + i * 18}" width="${96 - i * 10}" height="6" rx="3" fill="rgba(255,255,255,${0.15 - i * 0.02})"/>`).join('')}
      <rect x="160" y="168" width="46" height="14" rx="3" fill="rgba(76,175,130,.3)"/>
      </svg>`;
  }
  return `${base}${bg}
    <rect x="52" y="34" width="296" height="160" rx="8" fill="#0B1B31" stroke="rgba(255,255,255,.12)"/>
    <rect x="52" y="34" width="296" height="22" rx="8" fill="rgba(255,255,255,.05)"/>
    <circle cx="68" cy="45" r="3" fill="rgba(255,255,255,.22)"/>
    <circle cx="78" cy="45" r="3" fill="rgba(255,255,255,.16)"/>
    <rect x="72" y="72" width="150" height="10" rx="5" fill="#C9A227" opacity=".8"/>
    <rect x="72" y="92" width="110" height="7" rx="3.5" fill="rgba(255,255,255,.16)"/>
    <rect x="72" y="106" width="134" height="7" rx="3.5" fill="rgba(255,255,255,.11)"/>
    <rect x="72" y="128" width="66" height="20" rx="3" fill="none" stroke="#5B9DFF" stroke-width="1.2"/>
    <rect x="240" y="72" width="90" height="100" rx="4" fill="#0E2138" stroke="rgba(255,255,255,.09)"/>
    <circle cx="285" cy="122" r="24" fill="none" stroke="rgba(201,162,39,.4)" stroke-width="1"/>
    <circle cx="285" cy="122" r="12" fill="none" stroke="rgba(91,157,255,.5)" stroke-width="1"/>
    </svg>`;
}

/* ------------------------------------------------------------------ router */

const views = {
  triage: triageView,
  pipeline: pipelineView,
  blueprint: blueprintView,
  roi: roiView,
  brief: briefView,
  assistant: assistantView,
  work: workView
};

function mountView(name) {
  const main = qs('#con-main');
  if (!main) return;
  const render = views[name] || views.triage;
  main.innerHTML = render();

  qsa('.con-nav button').forEach((button) => {
    button.setAttribute('aria-current', String(button.dataset.view === name));
  });

  if (name === 'pipeline') {
    renderPipeline();
    wirePipelineDrag();
    wirePipelineControls();
  }
  if (name === 'blueprint') {
    renderBlueprintLayer(LAYERS[0].id);
    qsa('[data-layer]').forEach((button) => {
      button.addEventListener('click', () => {
        qsa('[data-layer]').forEach((b) => b.setAttribute('aria-selected', String(b === button)));
        renderBlueprintLayer(button.dataset.layer);
      });
    });
  }
  if (name === 'roi') {
    renderRoi();
    wireRoi();
  }
  if (name === 'brief') {
    renderBrief();
    wireBrief();
  }
  if (name === 'assistant') wireAssistant();
  if (name === 'triage') wireTriage();
}

function wireTriage() {
  const input = qs('#triage-input');
  const runBtn = qs('#triage-run');
  if (!input || !runBtn) return;

  const run = async () => {
    const text = input.value.trim();
    if (!text) {
      toast('Paste an enquiry first.', { type: 'err' });
      input.focus();
      return;
    }
    const { data, remote } = await withFallback('/api/triage', () => triageEnquiry(text, { source: 'console' }), {
      method: 'POST',
      body: { text, source: 'console' }
    });
    renderTriageResult(data);
    toast(remote ? 'Triaged by the TRL API.' : 'Triaged by the local engine.', { type: 'ok' });
  };

  runBtn.addEventListener('click', run);
  qs('#triage-clear')?.addEventListener('click', () => {
    input.value = '';
    qs('#triage-result').innerHTML = '<p class="muted" style="font-size:.88rem">Run the engine to see the structured record, the routing decision and a reply draft.</p>';
  });

  qsa('[data-sample]').forEach((button) => {
    button.addEventListener('click', () => {
      input.value = SAMPLE_ENQUIRIES[Number(button.dataset.sample)].text;
      run();
    });
  });

  const copyBtn = qs('#triage-copy');
  copyBtn?.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return toast('Nothing to copy.', { type: 'err' });
    const result = triageEnquiry(text, { source: 'console' });
    const ok = await copyText(JSON.stringify(result, null, 2));
    toast(ok ? 'Structured record copied as JSON.' : 'Could not copy.', { type: ok ? 'ok' : 'err' });
  });

  qs('#triage-dl')?.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return toast('Nothing to download.', { type: 'err' });
    const result = triageEnquiry(text, { source: 'console' });
    downloadText('trl-triage-record.json', JSON.stringify(result, null, 2));
    toast('Record downloaded.', { type: 'ok' });
  });

  qs('#triage-to-pipeline')?.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return toast('Run the engine on a message first.', { type: 'err' });
    const result = triageEnquiry(text, { source: 'console' });
    addCard({
      title: result.summary.slice(0, 90),
      business: result.sender.business || result.sender.name || 'Not stated',
      discipline: DISICIPLINES.find((d) => result.intent.label.toLowerCase().includes(d.split(' ')[0].toLowerCase())) || 'Consultation',
      value: result.entities.budget?.value || 0,
      note: `${result.route.priority} · ${result.route.team}`
    });
    toast('Added to the pipeline.', { type: 'ok' });
  });
}

function wirePipelineControls() {
  qs('#pipe-new')?.addEventListener('click', () => {
    const panel = qs('#pipe-form-panel');
    panel.hidden = !panel.hidden;
    if (!panel.hidden) qs('#np-title')?.focus();
  });
  qs('#np-cancel')?.addEventListener('click', () => { qs('#pipe-form-panel').hidden = true; });
  qs('#np-save')?.addEventListener('click', () => {
    const title = qs('#np-title').value.trim();
    if (!title) return toast('A summary is required.', { type: 'err' });
    addCard({
      title,
      business: qs('#np-business').value.trim(),
      discipline: qs('#np-discipline').value,
      value: qs('#np-value').value,
      note: qs('#np-note').value.trim()
    });
    qs('#np-title').value = '';
    qs('#np-business').value = '';
    qs('#np-value').value = '';
    qs('#np-note').value = '';
    qs('#pipe-form-panel').hidden = true;
    toast('Added to the pipeline.', { type: 'ok' });
  });
  qs('#pipe-reset')?.addEventListener('click', () => {
    pipelineStore.set({ cards: seedCards() });
    renderPipeline();
    wirePipelineDrag();
    toast('Board reset to the sample records.', { type: 'ok' });
  });
}

function wireRoi() {
  const commit = () => {
    const state = { ...roiStore.state };
    qsa('[data-roi]').forEach((input) => {
      state[input.dataset.roi] = Number(input.value);
      const label = document.querySelector(`[data-val="${input.dataset.roi}"]`);
      if (label) label.textContent = input.dataset.roi === 'hourlyCost' ? num(input.value) : input.value;
    });
    qsa('[data-task]').forEach((input) => {
      const index = Number(input.dataset.task);
      const field = input.dataset.field;
      const task = { ...(state.tasks[index] || {}) };
      task[field] = field === 'name' ? input.value : Number(input.value);
      state.tasks[index] = task;
    });
    roiStore.set(state);
    renderRoi();
  };

  qsa('[data-roi], [data-task]').forEach((input) => {
    input.addEventListener('input', commit);
    input.addEventListener('change', commit);
  });

  qs('#roi-add')?.addEventListener('click', () => {
    const state = { ...roiStore.state };
    state.tasks = [...state.tasks, { name: 'New task', hours: 5, repetitiveness: 3, complexity: 3, errorRate: 0.1 }];
    roiStore.set(state);
    mountView('roi');
  });

  qs('#roi-reset')?.addEventListener('click', () => {
    roiStore.replace(DEFAULT_INPUT);
    mountView('roi');
  });
}

function wireBrief() {
  const commit = () => {
    const answers = { ...(briefStore.get('answers') || {}) };
    qsa('[data-brief]').forEach((input) => { answers[input.dataset.brief] = input.value; });
    briefStore.set({ answers });
    renderBrief();
  };
  qsa('[data-brief]').forEach((input) => {
    input.addEventListener('input', commit);
    input.addEventListener('change', commit);
  });

  qs('#brief-build')?.addEventListener('click', () => {
    commit();
    toast('Brief built. Copy it or download it as a starting point.', { type: 'ok' });
  });

  const briefText = () => briefToMarkdown(buildBrief(briefStore.get('answers') || {}));

  qs('#brief-copy')?.addEventListener('click', async () => {
    const ok = await copyText(briefText());
    toast(ok ? 'Brief copied to your clipboard.' : 'Could not copy the brief.', { type: ok ? 'ok' : 'err' });
  });

  qs('#brief-dl')?.addEventListener('click', () => {
    downloadText('trl-engagement-brief.md', briefText(), 'text/markdown');
    toast('Brief downloaded.', { type: 'ok' });
  });
}

/* ------------------------------------------------------------------ boot */

export async function initConsole() {
  const main = qs('#con-main');
  if (!main) return;

  [knowledge, workItems] = await Promise.all([
    loadKnowledge().then((data) => data.entries || []),
    loadWork().then((data) => data.items || [])
  ]);

  if (!pipelineStore.get('cards').length) {
    pipelineStore.set({ cards: seedCards() });
  }

  const router = createRouter({
    routes: Object.fromEntries(Object.entries(views).map(([name, render]) => [
      name,
      () => { mountView(name); }
    ])),
    fallback: 'triage',
    onChange: (name) => {
      const titles = {
        triage: 'Enquiry triage', pipeline: 'Enquiry pipeline', blueprint: 'System blueprint',
        roi: 'Opportunity model', brief: 'Scope brief', assistant: 'Assistant', work: 'Work'
      };
      document.title = `${titles[name] || 'Console'} · TRL Console`;
    }
  });

  await router.start();

  qsa('.con-nav button').forEach((button) => {
    button.addEventListener('click', () => router.navigate(button.dataset.view));
  });

  onStatusChange(() => {
    qsa('[data-engine-status]').forEach((chip) => {
      const online = getStatus() === 'online';
      chip.className = `engine-status ${online ? 'online' : 'offline'}`;
      chip.innerHTML = `<span class="dot"></span>${online ? 'API connected' : 'Local engine'}`;
    });
  });
}
