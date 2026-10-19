/**
 * TRL — The Right Lifestyle
 * scripts/smoke-dom.mjs — optional browser-simulation smoke test.
 *
 * Loads every page in a JSDOM window, executes the real ES modules against
 * the real DOM, and fails on any console error or unhandled rejection.
 *
 * JSDOM is a development-only dependency: it is not required by the static
 * site or the runtime API, but `npm install` makes this check reproducible.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = path.resolve(import.meta.dirname, '..');
const PAGES = [
  'index.html',
  'services.html',
  'work.html',
  'insights.html',
  'how-we-work.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  'console/index.html'
];

const problems = [];
const openWindows = [];
let runCounter = 0;

/** Fire a hashchange on every window we created — cached modules keep their
 *  listener on the first window, so the current one must be told as well. */
function fireHashChange() {
  for (const w of openWindows) {
    try {
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
    } catch { /* ignore */ }
  }
}

async function runPage(page, after) {
  runCounter += 1;
  const file = path.join(ROOT, page);
  const html = await readFile(file, 'utf8');
  const errors = [];

  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (err) => errors.push(`jsdomError: ${err.message}`));
  virtualConsole.on('error', (...args) => errors.push(`console.error: ${args.join(' ')}`));

  const dom = new JSDOM(html, {
    url: pathToFileURL(file).href,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    resources: undefined,
    virtualConsole
  });

  const { window } = dom;
  openWindows.push(window);

  // Expose the simulated window as the Node globals the modules expect.
  const globals = ['window', 'document', 'navigator', 'location', 'history', 'localStorage',
    'sessionStorage', 'CustomEvent', 'Event', 'MouseEvent', 'KeyboardEvent', 'Node', 'Element',
    'HTMLElement', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
    'matchMedia', 'fetch', 'DOMParser', 'NodeFilter', 'CSS', 'MutationObserver'];
  for (const key of globals) {
    if (!(key in window)) continue;
    try {
      Object.defineProperty(globalThis, key, {
        value: window[key],
        configurable: true,
        writable: true
      });
    } catch {
      /* read-only global (e.g. navigator) — keep Node's own */
    }
  }
  globalThis.self = window;
  globalThis.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe(el) { this.cb([{ target: el, isIntersecting: true, intersectionRatio: 1 }], this); }
    unobserve() {}
    disconnect() {}
  };
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // MutationObserver is deliberately NOT stubbed. JSDOM implements it for real,
  // and replacing it with a no-op hides genuine behaviour: reveal tracking of
  // late-rendered content depends on it firing.
  globalThis.scrollTo = () => {};

  const mockFetch = async (url) => {
    const target = new URL(String(url), window.location.href);
    let local = null;
    if (target.protocol === 'file:') {
      local = fileURLToPath(target);
    } else if (target.hostname === '' || target.hostname === 'localhost') {
      local = path.join(ROOT, decodeURIComponent(target.pathname).replace(/^\/+/, ''));
    }
    if (local && existsSync(local) && !local.endsWith('/')) {
      const body = await readFile(local, 'utf8');
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(body),
        text: async () => body
      };
    }
    return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  };
  window.fetch = mockFetch;
  globalThis.fetch = mockFetch;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }));
  window.scrollTo = () => {};
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);

  // Execute the page's module graph manually (JSDOM does not support ESM).
  const scripts = [...window.document.querySelectorAll('script[type="module"]')].map((s) => s.getAttribute('src'));
  for (const src of scripts) {
    if (!src) continue;
    const moduleUrl = pathToFileURL(path.resolve(path.dirname(file), src)).href;
    try {
      // Cache-bust so each simulated page re-executes the bootstrap.
      await import(`${moduleUrl}?run=${runCounter}`);
    } catch (err) {
      errors.push(`module ${src}: ${err.message}`);
    }
  }

  // Let queued microtasks and timers settle.
  await new Promise((resolve) => setTimeout(resolve, 120));

  // Interactions run before the window is closed — a closed window stops
  // processing events, so a hash navigation would never complete.
  if (after) {
    try {
      await after(window);
    } catch (err) {
      errors.push(`interaction: ${err.message}`);
    }
  }

  window.close();

  if (errors.length) {
    problems.push({ page, errors });
    console.log(`✗ ${page}`);
    errors.forEach((e) => console.log(`    ${e}`));
  } else {
    console.log(`✓ ${page}`);
  }
}

for (const page of PAGES) {
  await runPage(page);
}

/* ------------------------------------------------------------------ *
 * Interaction checks — drive the real UI and assert it responded.
 * ------------------------------------------------------------------ */

const INTERACTIONS = [
  {
    page: 'index.html',
    name: 'home page renders capabilities, work and insights',
    async run(window) {
      const doc = window.document;
      const checks = [
        ['#home-capabilities .card', 7],
        ['#home-work .work', 3],
        ['#home-insights .insight', 3],
        ['#hero-readout .sys-row', 3]
      ];
      for (const [selector, minimum] of checks) {
        const count = doc.querySelectorAll(selector).length;
        if (count < minimum) throw new Error(`${selector} rendered ${count} items (expected >= ${minimum})`);
      }
    }
  },
  {
    page: 'work.html',
    name: 'work filters and cards render',
    async run(window) {
      const doc = window.document;
      if (doc.querySelectorAll('#work-grid .insight').length < 3) throw new Error('work grid is empty');
      const filter = doc.querySelector('#work-filters button');
      if (!filter) throw new Error('no work filters');
      filter.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      if (doc.querySelectorAll('#work-grid .insight').length < 1) throw new Error('filtering emptied the grid');
    }
  },
  {
    page: 'insights.html',
    name: 'insight search filters the grid',
    async run(window) {
      const doc = window.document;
      const total = doc.querySelectorAll('#insight-grid .insight').length;
      if (total < 3) throw new Error(`insight grid rendered ${total} cards`);
      const search = doc.querySelector('#insight-search');
      search.value = 'automation';
      search.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      const filtered = doc.querySelectorAll('#insight-grid .insight').length;
      if (filtered === 0) throw new Error('search returned nothing');
    }
  },
  {
    page: 'services.html',
    name: 'engagement model cards render',
    async run(window) {
      const cards = window.document.querySelectorAll('#engagement-models .price-card').length;
      if (cards < 2) throw new Error(`engagement models rendered ${cards} cards`);
    }
  },
  {
    page: 'console/index.html',
    name: 'console runs the triage engine and renders the record',
    async run(window) {
      const doc = window.document;
      window.location.hash = '#/triage';
      fireHashChange();
      await new Promise((r) => setTimeout(r, 60));

      const input = doc.querySelector('#triage-input');
      if (!input) throw new Error('triage view did not mount');
      input.value = 'Hi, my name is Ayesha Noor from Gulberg Foods. I need a website quote. Budget PKR 200,000. Reach me on ayesha@example.com';
      const run = doc.querySelector('#triage-run');
      run.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 80));

      const out = doc.querySelector('#triage-result');
      if (!out || out.textContent.trim().length < 40) throw new Error('triage produced no output');
      if (!/Ayesha/i.test(out.textContent)) throw new Error('triage did not extract the sender name');
      if (!/200,?000/i.test(out.textContent)) throw new Error('triage did not extract the budget');
    }
  },
  {
    page: 'console/index.html',
    name: 'console pipeline board renders seven stages',
    async run(window) {
      const doc = window.document;
      window.location.hash = '#/pipeline';
      fireHashChange();
      await new Promise((r) => setTimeout(r, 60));
      const columns = doc.querySelectorAll('.kcol').length;
      if (columns < 6) throw new Error(`pipeline rendered ${columns} columns`);
      const cards = doc.querySelectorAll('.kcard').length;
      if (cards < 1) throw new Error('pipeline has no cards');
    }
  },
  {
    page: 'console/index.html',
    name: 'console opportunity model computes a payback period',
    async run(window) {
      const doc = window.document;
      window.location.hash = '#/roi';
      fireHashChange();
      await new Promise((r) => setTimeout(r, 60));
      const out = doc.querySelector('#roi-out');
      if (!out || out.textContent.trim().length < 20) throw new Error('opportunity model produced no output');
      if (!/payback|month/i.test(out.textContent)) throw new Error('opportunity model output has no payback figure');
      const matrix = doc.querySelector('#roi-matrix');
      if (!matrix || matrix.textContent.trim().length < 10) throw new Error('opportunity matrix is empty');
    }
  },
  {
    page: 'contact.html',
    name: 'enquiry form shows the live routing readout',
    async run(window) {
      const doc = window.document;
      const form = doc.querySelector('#enquiry-form');
      if (!form) throw new Error('enquiry form missing');
      const message = doc.querySelector('#eq-message');
      message.value = 'I need to automate 300 WhatsApp enquiries a day for my shop. Budget PKR 250,000. Call me on 03123456789';
      message.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
      const readout = doc.querySelector('#contact-readout');
      if (!readout || readout.textContent.trim().length < 20) throw new Error('no routing readout produced');
    }
  },
  {
    page: 'index.html',
    name: 'content rendered after boot is revealed, not left invisible',
    async run(window) {
      const doc = window.document;
      // These cards are built by apps/home.js long after initReveals() ran.
      // A reveal observer that only scans the initial document leaves them at
      // opacity 0 — present in the DOM, invisible on screen.
      const late = doc.querySelectorAll('#home-work .work');
      if (late.length < 1) throw new Error('no work cards rendered');
      const hidden = [...late].filter((node) => node.classList.contains('rv') && !node.classList.contains('in'));
      if (hidden.length) throw new Error(`${hidden.length} late-rendered .rv node(s) never received .in`);
    }
  },
  {
    page: 'index.html',
    name: 'command palette opens, searches the corpus and closes',
    async run(window) {
      const doc = window.document;
      doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
      await new Promise((r) => setTimeout(r, 220));

      const panel = doc.querySelector('#trl-palette');
      if (!panel) throw new Error('Ctrl+K did not open the palette');
      const items = panel.querySelectorAll('.palette-item');
      if (items.length < 1) throw new Error('palette opened with no indexed entries');

      const input = panel.querySelector('input');
      input.value = 'automation';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 220));

      const filtered = panel.querySelectorAll('.palette-item');
      if (filtered.length < 1) throw new Error('searching "automation" returned nothing');
      if (!/automation/i.test(panel.querySelector('.palette-body').textContent)) {
        throw new Error('search results do not mention automation');
      }

      doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((r) => setTimeout(r, 40));
      if (doc.querySelector('#trl-palette')) throw new Error('Escape did not close the palette');
    }
  },
  {
    page: 'index.html',
    name: 'effect layer mounts progress bar, back-to-top and scroll variable',
    async run(window) {
      const doc = window.document;
      if (!doc.querySelector('#trl-progress .progress-bar')) throw new Error('scroll progress bar missing');
      if (!doc.querySelector('#totop')) throw new Error('back-to-top control missing');
      if (!doc.querySelector('#palette-trigger')) throw new Error('palette trigger missing from the nav');
      const scroll = doc.documentElement.style.getPropertyValue('--scroll');
      if (scroll === '') throw new Error('--scroll was never written by the motion layer');
      if (!doc.documentElement.classList.contains('motion-ready')) throw new Error('motion layer did not finish');
    }
  },
  {
    page: 'index.html',
    name: 'newsletter form rejects a bad address and accepts a good one',
    async run(window) {
      const doc = window.document;
      const form = doc.querySelector('#subscribe-form');
      if (!form) throw new Error('newsletter form missing from the footer');
      const input = doc.querySelector('#sub-email');
      const button = doc.querySelector('#subscribe-form button[type="submit"]');
      if (!input || !button) throw new Error('newsletter form is missing its input or button');

      // Invalid address: the form must refuse it rather than submit.
      input.value = 'not-an-email';
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));
      if (!doc.querySelector('.toast.err')) throw new Error('an invalid address was not rejected');

      // Valid address: no API is configured here, so it must fall back locally
      // and say so honestly instead of failing silently.
      input.value = 'founder@example.com';
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 120));
      const host = doc.querySelector('.toast-host');
      if (!host || !host.textContent.length) throw new Error('a valid address produced no response');
      if (input.value !== '') throw new Error('the input was not cleared after submitting');
    }
  },
  {
    page: 'index.html',
    name: 'theme toggle switches the document and persists the choice',
    async run(window) {
      const doc = window.document;
      const toggle = doc.querySelector('#theme-toggle');
      if (!toggle) throw new Error('theme toggle missing');
      toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      if (doc.documentElement.getAttribute('data-theme') !== 'light') throw new Error('theme did not switch to light');
      if (toggle.getAttribute('aria-pressed') !== 'true') throw new Error('toggle aria-pressed not updated');
      toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      if (doc.documentElement.getAttribute('data-theme')) throw new Error('theme did not switch back to dark');
    }
  }
];

for (const check of INTERACTIONS) {
  try {
    await runPage(check.page, check.run);
  } catch (err) {
    problems.push({ page: check.page, errors: [err.message] });
    console.log(`✗ ${check.name}\n    ${err.message}`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll pages executed without console errors and every interaction responded.');
