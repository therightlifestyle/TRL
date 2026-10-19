/**
 * TRL — The Right Lifestyle
 * components/toast.js — transient status messages.
 */

import { el } from '../core/dom.js';

let host = null;

function getHost() {
  if (host && document.body.contains(host)) return host;
  host = el('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
  document.body.append(host);
  return host;
}

export function toast(message, { type = 'info', duration = 4200 } = {}) {
  const node = el('div', { class: `toast ${type}` }, message);
  getHost().append(node);
  setTimeout(() => {
    node.style.transition = 'opacity .35s, transform .35s';
    node.style.opacity = '0';
    node.style.transform = 'translateX(18px)';
    setTimeout(() => node.remove(), 360);
  }, duration);
  return node;
}
