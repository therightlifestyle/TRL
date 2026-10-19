/**
 * TRL — The Right Lifestyle
 * assets/js/main.js — site bootstrap.
 *
 * Every page loads this one module. It wires the shared components and then
 * hands over to the page-level app declared on <body data-page="…">.
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

async function boot() {
  initTheme();
  initNav();
  markActiveNav();
  initReveals();
  initAnchors();
  initTabs();
  initAccordions();
  initCounters();

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
