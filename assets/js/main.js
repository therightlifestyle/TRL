/**
 * TRL — The Right Lifestyle
 * assets/js/main.js — site bootstrap.
 *
 * Every page loads this one module. It wires the shared components, then the
 * motion/effect layer, then hands over to the page-level app declared on
 * <body data-page="…">.
 *
 * Order matters: theme and reveals run before any data is fetched, so the
 * first paint is never blocked on the network. The effect layer degrades to
 * nothing at all when the visitor prefers reduced motion.
 */

import { initTheme } from './components/theme.js';
import { initNav, markActiveNav } from './components/nav.js';
import { initReveals, initAnchors } from './components/reveal.js';
import { initTabs } from './components/tabs.js';
import { initAccordions } from './components/accordion.js';
import { initCounters } from './components/counters.js';
import { toast } from './components/toast.js';
import { loadConfig } from './core/data.js';
import { applySiteConfig } from './core/config.js';
import { el, prefersReducedMotion } from './core/dom.js';

/**
 * Page chrome that only exists when JavaScript does: the scroll progress bar,
 * the film-grain overlay and the ⌘K trigger in the navigation. Injected rather
 * than hard-coded so the HTML stays meaningful with scripts disabled.
 */
function mountChrome() {
  if (!document.getElementById('trl-progress')) {
    document.body.prepend(el('div', { class: 'progress', id: 'trl-progress', 'aria-hidden': 'true' },
      el('div', { class: 'progress-bar' })));
  }

  if (!prefersReducedMotion() && !document.getElementById('trl-grain')) {
    document.body.append(el('div', { class: 'grain', id: 'trl-grain', 'aria-hidden': 'true' }));
  }

  const menu = document.getElementById('menu');
  if (menu && !document.getElementById('palette-trigger')) {
    const trigger = el('button', {
      class: 'theme-toggle palette-trigger',
      id: 'palette-trigger',
      type: 'button',
      'data-palette': true,
      'aria-label': 'Search the site (Ctrl K)',
      title: 'Search the site — Ctrl/⌘ K',
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
        + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/></svg>'
    });
    const toggle = document.getElementById('theme-toggle');
    if (toggle) menu.insertBefore(trigger, toggle);
    else menu.append(trigger);
  }
}

async function boot() {
  initTheme();
  initNav();
  markActiveNav();
  mountChrome();
  initReveals();
  initAnchors();
  initTabs();
  initAccordions();
  initCounters();

  // Motion + palette + back-to-top + subscribe. Each is independently
  // optional: if one fails the others still run, and the static page is never
  // broken.
  try {
    const [{ initMotion }, { initPalette }, { initBackToTop }, { initSubscribe }] = await Promise.all([
      import('./components/motion.js'),
      import('./components/palette.js'),
      import('./components/totop.js'),
      import('./components/subscribe.js')
    ]);
    initMotion();
    initPalette();
    initBackToTop();
    initSubscribe();
  } catch (err) {
    console.warn('[trl] enhancement layer unavailable', err.message);
  }

  const year = document.getElementById('yr');
  if (year) year.textContent = String(new Date().getFullYear());

  // Canonical facts (brand, contact, audit pricing) come from the data layer.
  try {
    applySiteConfig(await loadConfig());
  } catch (err) {
    console.warn('[trl] configuration file unavailable — using built-in defaults', err.message);
  }

  const page = document.body.dataset.page;
  try {
    switch (page) {
      case 'home': {
        const { initHome } = await import('./apps/home.js');
        await initHome();
        break;
      }
      case 'work': {
        const { initWork } = await import('./apps/work.js');
        await initWork();
        break;
      }
      case 'insights': {
        const { initInsights } = await import('./apps/insights.js');
        await initInsights();
        break;
      }
      case 'contact': {
        const { initContact } = await import('./apps/contact.js');
        initContact();
        break;
      }
      case 'services': {
        const { initServices } = await import('./apps/services.js');
        initServices();
        break;
      }
      case 'console': {
        const { initConsole } = await import('./apps/console.js');
        await initConsole();
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`[trl] failed to initialise "${page}"`, err);
    toast('Some interactive features could not load. The rest of the page works normally.', { type: 'err' });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
