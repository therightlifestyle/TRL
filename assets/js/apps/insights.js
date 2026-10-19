/**
 * TRL — The Right Lifestyle
 * apps/insights.js — Case Studies & Insights hub.
 *
 * Searchable, filterable and readable without leaving the page: the detail
 * opens in a drawer so a visitor can skim, judge and go back.
 */

import { qs, qsa, el, escapeHtml } from '../core/dom.js';
import { loadInsights } from '../core/data.js';
import { dateShort } from '../core/format.js';
import { icon } from '../components/icons.js';

let articles = [];
let insightsData = { articles: [] };
let activeCategory = 'all';
let query = '';

function categoryList() {
  const categories = new Set(articles.map((a) => a.category));
  return ['all', ...Array.from(categories).sort()];
}

function filtered() {
  const term = query.trim().toLowerCase();
  return articles.filter((article) => {
    const inCategory = activeCategory === 'all' || article.category === activeCategory;
    if (!inCategory) return false;
    if (!term) return true;
    const haystack = [article.title, article.summary, article.category, ...(article.tags || [])]
      .join(' ').toLowerCase();
    return haystack.includes(term);
  });
}

function renderFilters() {
  const host = qs('#insight-filters');
  if (!host) return;
  host.innerHTML = categoryList().map((category) => `
    <button class="chip ${category === activeCategory ? 'on' : ''}" data-category="${escapeHtml(category)}" aria-pressed="${category === activeCategory}">
      ${category === 'all' ? 'All' : escapeHtml(category)}
    </button>`).join('');

  qsa('[data-category]', host).forEach((button) => {
    button.addEventListener('click', () => {
      activeCategory = button.dataset.category;
      renderFilters();
      renderGrid();
    });
  });
}

function visualFor(article) {
  const index = articles.indexOf(article);
  const variant = index % 3;
  const base = '<svg viewBox="0 0 400 225" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
  const bg = '<rect width="400" height="225" fill="#081426"/>';
  if (variant === 0) {
    return `${base}${bg}
      <g stroke="rgba(255,255,255,.1)" stroke-width="1" fill="none">
        <path d="M40 190 120 60l80 130 60-90 100 90"/>
        <path d="M40 190h320" stroke="rgba(201,162,39,.45)"/>
      </g>
      <circle cx="120" cy="60" r="5" fill="#C9A227"/>
      <circle cx="200" cy="190" r="5" fill="#5B9DFF"/>
      <circle cx="260" cy="100" r="4" fill="#5B9DFF"/>
      </svg>`;
  }
  if (variant === 1) {
    return `${base}${bg}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${50 + i * 60}" cy="${60 + (i % 3) * 46}" r="3" fill="rgba(201,162,39,${0.3 + (i % 3) * 0.2})"/>`).join('')}
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M${50 + i * 60} ${60 + (i % 3) * 46} L${110 + i * 60} ${60 + ((i + 1) % 3) * 46}" stroke="rgba(91,157,255,.35)" stroke-width="1"/>`).join('')}
      </svg>`;
  }
  return `${base}${bg}
    <rect x="50" y="40" width="140" height="145" rx="6" fill="#0D1E39" stroke="rgba(255,255,255,.1)"/>
    <rect x="70" y="62" width="80" height="7" rx="3.5" fill="#C9A227" opacity=".8"/>
    ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="70" y="${82 + i * 16}" width="${100 - i * 8}" height="6" rx="3" fill="rgba(255,255,255,${0.14 - i * 0.015})"/>`).join('')}
    <rect x="220" y="62" width="130" height="52" rx="6" fill="#0A1830" stroke="rgba(255,255,255,.08)"/>
    <rect x="220" y="132" width="130" height="52" rx="6" fill="#0A1830" stroke="rgba(255,255,255,.08)"/>
    </svg>`;
}

function renderGrid() {
  const grid = qs('#insight-grid');
  const empty = qs('#insight-empty');
  const count = qs('#insight-count');
  const list = filtered();

  if (count) count.textContent = `${list.length} of ${articles.length}`;
  if (empty) {
    const nothing = list.length === 0;
    empty.classList.toggle('show', nothing);
    if (nothing) {
      empty.textContent = articles.length
        ? 'No insight matches that search. Try a different word.'
        : 'The insights index could not be loaded. Please reload the page.';
    }
  }

  if (grid) {
    grid.innerHTML = list.map((article) => `
      <article class="insight" data-article="${article.id}" tabindex="0" role="button"
        aria-label="Read: ${escapeHtml(article.title)}">
        <div class="insight-visual">
          <span class="insight-cat">${escapeHtml(article.category)}</span>
          ${visualFor(article)}
        </div>
        <div class="insight-body">
          <h3>${escapeHtml(article.title)}</h3>
          <p>${escapeHtml(article.summary)}</p>
          <div class="insight-foot">
            <span>${dateShort(article.date)} · ${article.readTime} min read</span>
            <span class="card-more">Read →</span>
          </div>
        </div>
      </article>`).join('');

    qsa('[data-article]', grid).forEach((card) => {
      const open = () => openDrawer(card.dataset.article);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    });
  }

  empty?.classList.toggle('show', list.length === 0);
}

function openDrawer(id) {
  const article = articles.find((a) => a.id === id);
  const drawer = qs('#insight-drawer');
  const body = qs('#drawer-body');
  if (!article || !drawer || !body) return;

  body.innerHTML = `
    <p class="eyebrow" style="margin-bottom:1rem">${escapeHtml(article.category)} · ${dateShort(article.date)} · ${article.readTime} min read</p>
    <h2>${escapeHtml(article.title)}</h2>
    <p class="lead" style="margin-bottom:1.4rem">${escapeHtml(article.summary)}</p>
    ${article.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
    ${article.tags?.length ? `<div class="row" style="margin-top:1.4rem">${article.tags.map((tag) => `<span class="chip" style="cursor:default">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
    <div class="btn-row" style="margin-top:1.8rem">
      <a class="btn btn-sm btn-gold" href="contact.html">Discuss this with TRL ${icon('arrow', 14)}</a>
      <button class="btn btn-sm btn-line" type="button" id="drawer-close-2">Close</button>
    </div>`;

  drawer.classList.add('open');
  document.body.style.overflow = 'hidden';
  qs('#drawer-close-2')?.addEventListener('click', closeDrawer);
}

function closeDrawer() {
  qs('#insight-drawer')?.classList.remove('open');
  document.body.style.overflow = '';
}

export async function initInsights() {
  const grid = qs('#insight-grid');
  if (!grid) return;

  [insightsData] = await Promise.all([loadInsights()]);
  articles = insightsData.articles || [];

  renderFilters();
  renderGrid();

  const search = qs('#insight-search');
  search?.addEventListener('input', (event) => {
    query = event.target.value;
    renderGrid();
  });

  qs('#drawer-close')?.addEventListener('click', closeDrawer);
  qs('#insight-drawer .drawer-scrim')?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDrawer();
  });
}
