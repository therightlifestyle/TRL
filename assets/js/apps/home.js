/**
 * TRL — The Right Lifestyle
 * apps/home.js — homepage composition: capability grid, work strip, insights
 * preview, the interactive architecture strip and the hero system readout.
 */

import { qs, qsa, el, escapeHtml } from '../core/dom.js';
import { loadServices, loadWork, loadInsights, loadFaq } from '../core/data.js';
import { initAccordions } from '../components/accordion.js';
import { LAYERS, PRINCIPLES } from '../engines/blueprint.js';
import { dateShort } from '../core/format.js';
import { icon } from '../components/icons.js';
import { rootUrl } from '../core/paths.js';

function renderCapabilities(services) {
  const host = qs('#home-capabilities');
  if (!host) return;
  host.innerHTML = services.map((service) => `
    <article class="card card-link" data-service="${service.id}" data-spot tabindex="0" role="link">
      <span class="card-ico">${icon(service.icon, 19)}</span>
      <span class="card-n">${service.number}</span>
      <h3>${escapeHtml(service.title)}</h3>
      <p>${escapeHtml(service.short)}</p>
      <span class="card-more">See capability ${icon('arrow', 14)}</span>
    </article>`).join('');

  qsa('[data-service]', host).forEach((card) => {
    card.addEventListener('click', () => {
      location.href = `services.html#${card.dataset.service}`;
    });
  });
}

function renderFaq(items) {
  const host = qs('#faq-list');
  if (!host || !items.length) return;
  host.innerHTML = items.map((item) => `
    <div class="acc-item">
      <button class="acc-head" type="button" data-acc-head><b>${escapeHtml(item.question)}</b><span class="acc-ico"></span></button>
      <div class="acc-body" data-acc-body><div class="acc-body-inner">
        ${item.answer.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      </div></div>
    </div>`).join('');
  initAccordions(host);
}

function renderWork(items) {
  const host = qs('#home-work');
  if (!host) return;
  const featured = items.slice(0, 3);
  host.innerHTML = featured.map((item) => `
    <article class="work rv">
      <div class="work-body">
        <div class="work-top">
          <h3>${escapeHtml(item.title)}</h3>
          <span class="label ${item.status === 'demo' ? 'demo' : item.status === 'live' ? 'live' : 'sample'}">${escapeHtml(item.statusLabel)}</span>
        </div>
        <p>${escapeHtml(item.outcome)}</p>
        <div class="work-meta">
          <span><b>Discipline</b> · ${escapeHtml(item.discipline)}</span>
          <span><b>Type</b> · ${escapeHtml(item.statusLabel)}</span>
        </div>
        <div class="btn-row" style="margin-top:1.2rem">
          <a class="btn btn-sm btn-blue" href="${escapeHtml(rootUrl(item.link))}">${escapeHtml(item.linkLabel)} ${icon('arrow', 14)}</a>
        </div>
      </div>
    </article>`).join('');
}

function renderInsights(articles) {
  const host = qs('#home-insights');
  if (!host) return;
  host.innerHTML = articles.slice(0, 3).map((article) => `
    <article class="insight" data-insight="${article.id}">
      <div class="insight-body">
        <span class="insight-cat" style="position:static;display:inline-block">${escapeHtml(article.category)}</span>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.summary)}</p>
        <div class="insight-foot">
          <span>${dateShort(article.date)} · ${article.readTime} min</span>
          <span class="card-more">Read →</span>
        </div>
      </div>
    </article>`).join('');

  qsa('[data-insight]', host).forEach((card) => {
    card.addEventListener('click', () => { location.href = `insights.html#${card.dataset.insight}`; });
  });
}

function renderArchitecture() {
  const host = qs('#home-architecture');
  if (!host) return;

  host.innerHTML = `
    <div class="bp-stack">
      ${LAYERS.map((layer, index) => `
        <button class="bp-layer" type="button" data-arch="${layer.id}" aria-selected="${index === 0}">
          <span class="bp-n">0${layer.index}</span>
          <span><b>${escapeHtml(layer.name)}</b><small>${escapeHtml(layer.tagline)}</small></span>
          <span class="bp-arrow">${icon('arrow', 14)}</span>
        </button>`).join('')}
    </div>
    <div class="bp-panel" id="arch-panel"></div>`;

  const panel = qs('#arch-panel');
  const show = (id) => {
    const layer = LAYERS.find((l) => l.id === id) || LAYERS[0];
    qsa('[data-arch]').forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.arch === layer.id));
    });
    panel.innerHTML = `
      <h3>${escapeHtml(layer.name)} — ${escapeHtml(layer.tagline)}</h3>
      <p>${escapeHtml(layer.purpose)}</p>
      <div class="bp-kpis">
        ${layer.metrics.map((m) => `<div class="bp-kpi"><b>${escapeHtml(m.value)}</b><span>${escapeHtml(m.label)}</span></div>`).join('')}
      </div>
      <div class="bp-flow">
        ${layer.flow.map((step, i) => `<i>${escapeHtml(step)}</i>${i < layer.flow.length - 1 ? '<span>→</span>' : ''}`).join('')}
      </div>`;
  };

  qsa('[data-arch]').forEach((button) => {
    button.addEventListener('click', () => show(button.dataset.arch));
  });
  show(LAYERS[0].id);
}

function renderPrinciples() {
  const host = qs('#home-principles');
  if (!host) return;
  host.innerHTML = PRINCIPLES.map((principle) => `
    <div class="card card-ghost" style="gap:.35rem">
      <h3 style="font-size:.95rem">${escapeHtml(principle.title)}</h3>
      <p style="font-size:.8rem">${escapeHtml(principle.body)}</p>
    </div>`).join('');
}

function startHeroReadout() {
  const host = qs('#hero-readout');
  if (!host) return;

  const rows = [
    { label: 'Triage throughput', value: '310 / hour' },
    { label: 'Routing accuracy', value: '96.4%' },
    { label: 'SLA coverage', value: '24 / 7' },
    { label: 'Handover completeness', value: '100%' }
  ];

  host.insertAdjacentHTML('beforeend', `
    <div class="sys-bar"><i id="hero-bar"></i></div>` + rows.map((row) => `
    <div class="sys-row"><span>${escapeHtml(row.label)}</span><b>${escapeHtml(row.value)}</b></div>`).join(''));

  const bar = qs('#hero-bar');
  if (bar) {
    requestAnimationFrame(() => {
      window.setTimeout(() => { bar.style.width = '72%'; }, 400);
    });
  }
}

export async function initHome() {
  const [servicesData, workData, insightsData, faqData] = await Promise.all([
    loadServices(), loadWork(), loadInsights(), loadFaq()
  ]);

  renderCapabilities(servicesData.services || []);
  renderWork(workData.items || []);
  renderInsights(insightsData.articles || []);
  renderFaq(faqData.items || []);
  renderArchitecture();
  renderPrinciples();
  startHeroReadout();
}
