/**
 * TRL — The Right Lifestyle
 * components/totop.js — back-to-top control with a scroll-progress ring.
 *
 * Appears once the visitor has scrolled past the first screen. The ring reads
 * --scroll, the same custom property components/motion.js writes for the top
 * progress bar, so the two can never disagree about where you are.
 */

import { el, on, rafThrottle, prefersReducedMotion } from '../core/dom.js';

const RING = '<circle class="tt-track" cx="22" cy="22" r="20"/><circle class="tt-bar" cx="22" cy="22" r="20"/>';

/** Build the control if the page has not declared one already. */
function ensureNode() {
  const existing = document.getElementById('totop');
  if (existing) return existing;

  const node = el('button', {
    class: 'totop',
    id: 'totop',
    type: 'button',
    'aria-label': 'Back to top',
    title: 'Back to top'
  },
  el('svg', { viewBox: '0 0 44 44', 'aria-hidden': 'true', html: RING }),
  el('svg', {
    class: 'tt-arrow', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
    html: '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'
  }));

  document.body.append(node);
  return node;
}

export function initBackToTop() {
  const node = ensureNode();
  const THRESHOLD = Math.max(320, window.innerHeight * 0.6);

  const update = rafThrottle(() => {
    node.classList.toggle('on', window.scrollY > THRESHOLD);
  });

  update();
  const offScroll = on(window, 'scroll', update, { passive: true });
  const offResize = on(window, 'resize', update, { passive: true });

  const offClick = on(node, 'click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    // Move focus to the skip target so keyboard users land somewhere sensible.
    const main = document.getElementById('main');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  });

  return () => { offScroll(); offResize(); offClick(); };
}
