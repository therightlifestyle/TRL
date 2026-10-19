/**
 * TRL — The Right Lifestyle
 * components/toast.js — transient status messages.
 *
 * Same call signature the whole site already uses:
 *   toast('Saved.', { type: 'ok' })
 * with three additions: an inline action button, manual dismissal, and a
 * drain bar that shows how long the message has left. Types are
 * 'info' | 'ok' | 'warn' | 'err'.
 */

import { el, prefersReducedMotion } from '../core/dom.js';

const MAX_VISIBLE = 4;
let host = null;

const ICONS = {
  info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.4 2.4 4.6-5"/>',
  warn: '<path d="M12 4.5L2.8 20h18.4L12 4.5z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  err: '<circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>'
};

const CLOSE_ICON = '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>';

const svg = (paths, extra = '') => el('svg', {
  class: 'toast-ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  'aria-hidden': 'true', html: paths, ...extra
});

function getHost() {
  if (host && document.body.contains(host)) return host;
  host = el('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
  document.body.append(host);
  return host;
}

/** Remove the oldest toasts when the stack gets too deep. */
function trim() {
  const container = getHost();
  const nodes = Array.from(container.children);
  while (nodes.length > MAX_VISIBLE) dismiss(nodes.shift());
}

function dismiss(node) {
  if (!node || node.dataset.leaving) return;
  node.dataset.leaving = '1';
  clearTimeout(Number(node.dataset.timer));
  node.classList.add('toast-out');
  setTimeout(() => node.remove(), prefersReducedMotion() ? 0 : 240);
}

/**
 * Show a message.
 * @param {string} message
 * @param {{type?:string, duration?:number, title?:string,
 *          action?:{label:string, onClick:Function}}} options
 */
export function toast(message, { type = 'info', duration = 4200, title = '', action = null } = {}) {
  const kind = ICONS[type] ? type : 'info';

  const node = el('div', { class: `toast ${kind}` },
    svg(ICONS[kind]),
    el('div', { class: 'toast-msg' },
      title ? el('strong', {}, `${title} `) : null,
      document.createTextNode(String(message))
    ),
    action
      ? el('button', {
        class: 'toast-act',
        type: 'button',
        onclick: () => { action.onClick?.(); dismiss(node); }
      }, action.label)
      : null,
    el('button', {
      class: 'toast-x',
      type: 'button',
      'aria-label': 'Dismiss notification',
      onclick: () => dismiss(node)
    }, svg(CLOSE_ICON, { class: 'toast-ico' }))
  );

  if (duration > 0 && !prefersReducedMotion()) {
    const bar = el('span', { class: 'toast-bar' });
    bar.style.animationDuration = `${duration}ms`;
    node.append(bar);
    node.dataset.timer = String(setTimeout(() => dismiss(node), duration));
  } else if (duration > 0) {
    node.dataset.timer = String(setTimeout(() => dismiss(node), duration));
  }

  getHost().append(node);
  trim();
  return node;
}

/** Remove every toast — used on route change so messages never pile up. */
export function clearToasts() {
  if (!host) return;
  Array.from(host.children).forEach(dismiss);
}
