/**
 * TRL — The Right Lifestyle
 * apps/work.js — the Work / demonstrations page: filters, cards, detail drawer.
 */

import { qs, qsa, escapeHtml } from '../core/dom.js';
import { loadWork } from '../core/data.js';
import { icon } from '../components/icons.js';
import { rootUrl } from '../core/paths.js';

let items = [];
let active = 'all';

function statusLabel(status) {
  if (status === 'demo') return 'Working prototype';
  if (status === 'live') return 'Live in this site';
  return 'Sample deliverable';
}

function statusClass(status) {
  if (status === 'demo') return 'demo';
  if (status === 'live') return 'live';
  return 'sample';
}

function filtered() {
  if (active === 'all') return items;
  if (active === 'discipline') return items;
  return items.filter((item) => item.status === active);
}

function renderFilters() {
  const host = qs('#work-filters');
  if (!host) return;
  const options = [
    { id: 'all', label: 'Everything' },
    { id: 'demo', label: 'Working prototypes' },
    { id: 'sample', label: 'Sample deliverables' },
    { id: 'live', label: 'Live in this site' }
  ];
  host.innerHTML = options.map((option) => `
    <button class="chip ${option.id === active ? 'on' : ''}" data-work-filter="${option.id}" aria-pressed="${option.id === active}">
      ${option.label}
    </button>`).join('');

  qsa('[data-work-filter]', host).forEach((button) => {
    button.addEventListener('click', () => {
      active = button.dataset.workFilter;
      renderFilters();
      renderGrid();
    });
  });
}

function renderGrid() {
  const grid = qs('#work-grid');
  const count = qs('#work-count');
  const empty = qs('#work-empty');
  const list = filtered();
  if (count) count.textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;
  empty?.classList.toggle('show', list.length === 0);

  if (!grid) return;
  grid.innerHTML = list.map((item) => `
    <article class="insight" data-work-item="${item.id}" tabindex="0" role="button" aria-label="Open: ${escapeHtml(item.title)}">
      <div class="insight-body">
        <div class="row" style="gap:.5rem">
          <span class="label ${statusClass(item.status)}">${escapeHtml(statusLabel(item.status))}</span>
          <span class="tiny">${escapeHtml(item.discipline)}</span>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.problem)}</p>
        <div class="insight-foot">
          <span>${escapeHtml(item.year)}</span>
          <span class="card-more">Open →</span>
        </div>
      </div>
    </article>`).join('');

  qsa('[data-work-item]', grid).forEach((card) => {
    const open = () => openDrawer(card.dataset.workItem);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
    });
  });
}

function openDrawer(id) {
  const item = items.find((i) => i.id === id);
  const drawer = qs('#work-drawer');
  const body = qs('#work-drawer-body');
  if (!item || !drawer || !body) return;

  body.innerHTML = `
    <p class="eyebrow" style="margin-bottom:1rem">${escapeHtml(item.discipline)} · ${escapeHtml(item.year)}</p>
    <h2>${escapeHtml(item.title)}</h2>
    <div class="row" style="margin:.6rem 0 1.4rem">
      <span class="label ${statusClass(item.status)}">${escapeHtml(statusLabel(item.status))}</span>
    </div>
    <div class="mini-h">The problem</div>
    <p>${escapeHtml(item.problem)}</p>
    <div class="mini-h" style="margin-top:1.4rem">The approach</div>
    <p>${escapeHtml(item.approach)}</p>
    <div class="mini-h" style="margin-top:1.4rem">What it produces</div>
    <p>${escapeHtml(item.outcome)}</p>
    <div class="btn-row" style="margin-top:1.8rem">
      <a class="btn btn-sm btn-gold" href="${escapeHtml(rootUrl(item.link))}">${escapeHtml(item.linkLabel)} ${icon('arrow', 14)}</a>
      <button class="btn btn-sm btn-line" type="button" id="work-drawer-close-2">Close</button>
    </div>`;

  drawer.classList.add('open');
  document.body.style.overflow = 'hidden';
  qs('#work-drawer-close-2')?.addEventListener('click', closeDrawer);
}

function closeDrawer() {
  qs('#work-drawer')?.classList.remove('open');
  document.body.style.overflow = '';
}

export async function initWork() {
  const grid = qs('#work-grid');
  if (!grid) return;

  const data = await loadWork();
  items = data.items || [];

  renderFilters();
  renderGrid();

  qs('#work-drawer-close')?.addEventListener('click', closeDrawer);
  qs('#work-drawer .drawer-scrim')?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });
}
