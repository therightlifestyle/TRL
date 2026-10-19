/**
 * TRL — The Right Lifestyle
 * components/reveal.js — scroll reveals and anchor scrolling.
 *
 * Reveals are not a one-shot scan. Much of this site renders its cards after
 * boot (capabilities, work, insights, filtered grids), and a reveal observer
 * that only looked at the initial document left every late-added `.rv` stuck
 * at opacity 0 — invisible content. A MutationObserver now picks up nodes that
 * appear later, so a card is revealed whether it was in the HTML or built by
 * an app module a second afterwards.
 */

import { prefersReducedMotion } from '../core/dom.js';

let observer = null;
let mutations = null;

function showImmediately(items) {
  items.forEach((node) => node.classList.add('in'));
}

/** Observe one element if it has not been handled already. */
function track(node) {
  if (!node || node.dataset.rvTracked === '1') return;
  node.dataset.rvTracked = '1';
  if (observer) observer.observe(node);
  else node.classList.add('in');
}

/**
 * Scan a subtree for reveal targets. Called on boot and again whenever the DOM
 * gains nodes, so app-rendered content animates like static content.
 */
export function refreshReveals(root = document) {
  const items = Array.from(root.querySelectorAll('.rv'));
  if (observer) items.forEach(track);
  else showImmediately(items);
  return items.length;
}

export function initReveals() {
  const reduced = prefersReducedMotion();
  // Resolved through the scope chain rather than `in window`, so the same check
  // works in a browser and in the JSDOM harness the smoke tests use.
  const supported = typeof IntersectionObserver !== 'undefined';

  if (!reduced && supported) {
    observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.06 });
  }

  refreshReveals();

  // Pick up content rendered after boot — in BOTH modes. When animation is off
  // or unsupported, a late-added `.rv` still has to be shown, or it stays
  // invisible forever.
  //
  // The watcher is bound to a document, not to this module: it is disconnected
  // and rebuilt on every init, so a second document (a re-booted page, or the
  // JSDOM harness loading ten pages through one cached module graph) gets its
  // own live watcher instead of inheriting a dead one.
  if (mutations) {
    mutations.disconnect();
    mutations = null;
  }
  if (typeof MutationObserver !== 'undefined' && document.body) {
    mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.classList?.contains('rv')) track(node);
          if (node.querySelectorAll) refreshReveals(node);
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });
  }
}

export function initAnchors() {
  const nav = document.getElementById('nav');
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      const navHeight = nav ? nav.offsetHeight : 70;
      const top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      if (history.pushState) history.pushState(null, '', href);
    });
  });
}
