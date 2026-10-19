/**
 * TRL — The Right Lifestyle
 * components/palette.js — the ⌘K command palette.
 *
 * One input that reaches the whole site: navigation, the seven services, the
 * demonstrations, the published insights, the FAQ and a handful of actions
 * (theme, contact, copy email). Ranking comes from engines/search.js — the
 * same module the API runs — so the palette and GET /api/search agree.
 *
 * The corpus is built lazily on first open and then cached; opening the
 * palette a second time is instant.
 */

import { el, qsa, on, copyText, debounce } from '../core/dom.js';
import { rootUrl } from '../core/paths.js';
import { loadServices, loadWork, loadInsights, loadKnowledge, loadFaq } from '../core/data.js';
import { indexFromData, search, highlight } from '../engines/search.js';
import { toast } from './toast.js';
import { setTheme, getTheme } from './theme.js';

const GROUP_LABEL = {
  navigate: 'Navigate',
  action: 'Actions',
  service: 'Services',
  work: 'Demonstrations',
  insight: 'Insights',
  faq: 'Answers'
};

const GROUP_ORDER = ['navigate', 'action', 'service', 'work', 'insight', 'faq'];

/** The site's own pages. Kept here rather than scraped, so the palette works
 *  from any page depth and on GitHub Pages where there is no server. */
const PAGES = [
  { id: 'home', title: 'Home', url: 'index.html', subtitle: 'The right system changes everything', priority: 6, keywords: 'start overview' },
  { id: 'services', title: 'Services', url: 'services.html', subtitle: 'Seven disciplines', priority: 6, keywords: 'offer pricing what we do' },
  { id: 'work', title: 'Work & Demonstrations', url: 'work.html', subtitle: 'Sample deliverables', priority: 5, keywords: 'portfolio demos examples' },
  { id: 'insights', title: 'Insights', url: 'insights.html', subtitle: 'Published articles', priority: 5, keywords: 'blog articles writing' },
  { id: 'process', title: 'How we work', url: 'how-we-work.html', subtitle: 'The engagement process', priority: 4, keywords: 'process stages timeline' },
  { id: 'console', title: 'TRL Console', url: 'console/index.html', subtitle: 'Triage, pipeline, ROI, assistant', priority: 5, keywords: 'app tools dashboard engine' },
  { id: 'about', title: 'About TRL', url: 'about.html', subtitle: 'Founder-led, Islamabad', priority: 3, keywords: 'company founder team' },
  { id: 'contact', title: 'Contact', url: 'contact.html', subtitle: 'Start a conversation', priority: 6, keywords: 'email phone whatsapp connect' },
  { id: 'privacy', title: 'Privacy notice', url: 'privacy.html', subtitle: 'No trackers, no cookies', priority: 1, keywords: 'privacy data gdpr' },
  { id: 'terms', title: 'Terms of engagement', url: 'terms.html', subtitle: 'How we work together', priority: 1, keywords: 'terms legal contract' }
];

let index = null;
let building = null;

/** Actions the palette can run without leaving the page. */
function buildActions() {
  const actions = [
    {
      id: 'theme',
      title: getTheme() === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
      hint: 'Appearance',
      keywords: ['theme', 'dark', 'light', 'appearance', 'mode'],
      priority: 2,
      run: () => {
        setTheme(getTheme() === 'light' ? 'dark' : 'light');
        toast(`Theme set to ${getTheme()}.`, { type: 'ok', duration: 2200 });
      }
    },
    {
      id: 'whatsapp',
      title: 'Message TRL on WhatsApp',
      hint: '+92 319 0091457',
      keywords: ['whatsapp', 'chat', 'message', 'contact', 'talk'],
      url: 'https://wa.me/923190091457',
      priority: 3
    },
    {
      id: 'email',
      title: 'Copy the TRL email address',
      hint: 'officialtrlservice@gmail.com',
      keywords: ['email', 'copy', 'mail', 'address', 'contact'],
      priority: 2,
      run: async () => {
        const ok = await copyText('officialtrlservice@gmail.com');
        toast(ok ? 'Email address copied to the clipboard.' : 'Could not reach the clipboard.', {
          type: ok ? 'ok' : 'err'
        });
      }
    },
    {
      id: 'audit',
      title: 'Book the Rapid AI Opportunity Audit',
      hint: 'PKR 3,000 · 72-hour turnaround',
      keywords: ['audit', 'book', 'price', 'assessment', 'opportunity'],
      url: 'services.html#audit',
      priority: 4
    },
    {
      id: 'top',
      title: 'Scroll to the top of the page',
      hint: 'Back to the beginning',
      keywords: ['top', 'up', 'start', 'beginning'],
      priority: 0,
      run: () => window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  ];
  return actions;
}

/** Build (once) and cache the searchable corpus from the data layer. */
async function ensureIndex() {
  if (index) return index;
  if (building) return building;

  building = (async () => {
    const [services, work, insights, knowledge, faq] = await Promise.all([
      loadServices(), loadWork(), loadInsights(), loadKnowledge(), loadFaq()
    ]);
    index = indexFromData({
      services, work, insights, knowledge, faq,
      pages: PAGES,
      actions: buildActions()
    });
    return index;
  })();

  return building;
}

const state = { open: false, results: [], cursor: 0, nodes: [] };

function close(host) {
  if (!state.open) return;
  state.open = false;
  const panel = host.querySelector('.palette');
  const restore = host.dataset.restore;
  host.remove();
  if (restore) {
    const back = document.querySelector(restore);
    if (back) back.focus();
  }
  document.documentElement.classList.remove('palette-open');
  document.removeEventListener('keydown', onKey, true);
}

function onKey(event) {
  if (!state.open) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    close(document.getElementById('trl-palette'));
    return;
  }

  if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
    if (event.key === 'Tab' && !state.nodes.length) return;
    event.preventDefault();
    move(1);
    return;
  }

  if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
    event.preventDefault();
    move(-1);
  }
}

function move(delta) {
  if (!state.nodes.length) return;
  state.cursor = (state.cursor + delta + state.nodes.length) % state.nodes.length;
  paint();
}

function paint() {
  state.nodes.forEach((node, i) => {
    node.setAttribute('aria-selected', String(i === state.cursor));
    // scrollIntoView is absent in some embedded environments — keep the
    // selected row in view where it is available, never fail because it is not.
    if (i === state.cursor) node.scrollIntoView?.({ block: 'nearest' });
  });
}

function render(host, body, query, tokens) {
  state.nodes = [];
  body.textContent = '';

  if (!state.results.length) {
    body.append(el('div', { class: 'palette-empty' },
      query
        ? `Nothing matches “${query}”. Try “automation”, “audit” or “website”.`
        : 'Type to search the site.'));
    return;
  }

  let currentGroup = null;
  for (const result of state.results) {
    if (result.group !== currentGroup) {
      currentGroup = result.group;
      body.append(el('div', { class: 'palette-group' }, GROUP_LABEL[currentGroup] || currentGroup));
    }

    const label = GROUP_ORDER.indexOf(result.group) === 1 ? '⌘' : '→';
    const button = el('button', {
      class: 'palette-item',
      type: 'button',
      role: 'option',
      'aria-selected': 'false',
      onclick: () => activate(result, host)
    },
    el('span', { class: 'palette-ico', 'aria-hidden': 'true' }, label),
    el('span', { class: 'palette-txt' },
      el('span', { class: 'palette-t', html: highlight(result.title, tokens) }),
      el('span', { class: 'palette-s' }, result.subtitle || result.summary || '')
    ),
    el('span', { class: 'palette-kbd' }, result.group === 'action' ? 'run' : 'open'));

    body.append(button);
    state.nodes.push(button);
  }
  paint();
}

function activate(result, host) {
  close(host);
  const action = buildActions().find((item) => item.id === result.id && result.group === 'action');
  if (action?.run) {
    action.run();
    return;
  }
  if (result.url) window.location.href = rootUrl(result.url);
}

/** Open the palette. Focus is trapped inside while it is up. */
export async function openPalette(trigger = null) {
  if (state.open) {
    document.getElementById('trl-palette')?.querySelector('input')?.focus();
    return;
  }

  const body = el('div', { class: 'palette-body', role: 'listbox', 'aria-label': 'Search results' });
  const input = el('input', {
    type: 'text',
    placeholder: 'Search services, work, insights, answers…',
    'aria-label': 'Search TRL',
    autocomplete: 'off',
    spellcheck: 'false',
    role: 'combobox',
    'aria-expanded': 'true',
    'aria-controls': 'trl-palette-list',
    oninput: debounce((event) => run(event.target.value), 90)
  });
  body.id = 'trl-palette-list';

  const host = el('div', {
    class: 'palette-scrim',
    id: 'trl-palette',
    onclick: (event) => { if (event.target === host) close(host); }
  },
  el('div', {
    class: 'palette',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Command palette'
  },
  el('div', { class: 'palette-in' },
    el('span', { class: 'palette-ico', 'aria-hidden': 'true' }, '⌕'),
    input,
    el('span', { class: 'palette-kbd' }, 'esc')
  ),
  body,
  el('div', { class: 'palette-foot' },
    el('span', {}, '↑↓ navigate'),
    el('span', {}, '↵ open'),
    el('span', { class: 'spacer' }),
    el('span', { id: 'trl-palette-status' }, 'loading index…')
  )));

  state.open = true;
  state.cursor = 0;
  state.results = [];
  host.dataset.restore = trigger?.id ? `#${trigger.id}` : '';
  document.body.append(host);
  document.documentElement.classList.add('palette-open');
  document.addEventListener('keydown', onKey, true);
  input.focus();

  const docs = await ensureIndex();
  host.querySelector('#trl-palette-status').textContent = `${docs.length} entries indexed`;
  run(input.value);

  function run(query) {
    // An effect layer must never take the page down: a rendering failure is
    // reported, the palette stays usable, and the rest of the site is untouched.
    try {
      const outcome = search(query, docs, { limit: 14 });
      state.results = outcome.results;
      state.cursor = 0;
      render(host, body, query.trim(), outcome.tokens);
      const status = host.querySelector('#trl-palette-status');
      if (status) {
        status.textContent = query.trim()
          ? `${outcome.total} result${outcome.total === 1 ? '' : 's'} · ${outcome.tookMs}ms`
          : `${docs.length} entries indexed`;
      }
    } catch (err) {
      console.warn('[trl] palette render failed', err.message);
      state.results = [];
      render(host, body, '', []);
    }
  }
}

/** Wire every [data-palette] trigger and the ⌘K / Ctrl+K shortcut. */
export function initPalette() {
  const open = (event) => {
    event.preventDefault();
    openPalette(event.currentTarget);
  };

  qsa('[data-palette]').forEach((node) => on(node, 'click', open));

  on(document, 'keydown', (event) => {
    const combo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    const slash = event.key === '/' && !/^(input|textarea|select)$/i.test(event.target.tagName || '');
    if (!combo && !slash) return;
    event.preventDefault();
    openPalette(document.activeElement);
  });
}
