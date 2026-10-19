/**
 * TRL — The Right Lifestyle
 * components/counters.js — animated statistic counters.
 *   <span data-count="72" data-suffix="h">0</span>
 */

import { qsa, prefersReducedMotion } from '../core/dom.js';

export function initCounters(root = document) {
  const nodes = qsa('[data-count]', root);
  if (!nodes.length) return;

  const run = (node) => {
    const target = parseFloat(node.dataset.count);
    if (!Number.isFinite(target)) return;
    const decimals = (node.dataset.count.split('.')[1] || '').length;
    const prefix = node.dataset.prefix || '';
    const suffix = node.dataset.suffix || '';
    if (prefersReducedMotion()) {
      node.textContent = `${prefix}${target.toFixed(decimals)}${suffix}`;
      return;
    }
    const duration = 1100;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = `${prefix}${(target * eased).toFixed(decimals)}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) {
    nodes.forEach(run);
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      run(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.4 });
  nodes.forEach((node) => observer.observe(node));
}
