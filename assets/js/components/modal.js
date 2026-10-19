/**
 * TRL — The Right Lifestyle
 * components/modal.js — one accessible dialog primitive for the whole site.
 *
 * Used by the Console (record details, confirmations) and by any page that
 * needs to interrupt. Focus is trapped inside while it is open, Escape closes
 * it, and focus returns to the element that opened it.
 */

import { el } from '../core/dom.js';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

let current = null;

/**
 * Open a dialog.
 * @param {{title?:string, body?:Node|string, footer?:Node,
 *          labelledBy?:string, onClose?:Function}} options
 * @returns {() => void} close
 */
export function openModal({ title = '', body = null, footer = null, onClose = null } = {}) {
  if (current) current.close();

  const restoreFocus = document.activeElement;

  const close = () => {
    if (!current) return;
    document.removeEventListener('keydown', onKey, true);
    scrim.remove();
    document.documentElement.classList.remove('modal-open');
    current = null;
    if (restoreFocus?.isConnected) restoreFocus.focus();
    onClose?.();
  };

  const panel = el('div', {
    class: 'modal',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': typeof title === 'string' ? title : 'Dialog'
  },
  el('div', { class: 'modal-head' },
    el('h3', { style: { flex: '1', margin: '0' } }, typeof title === 'string' ? title : ''),
    el('button', { class: 'modal-x', type: 'button', 'aria-label': 'Close dialog', onclick: close },
      el('svg', {
        viewBox: '0 0 24 24', width: '16', height: '16', fill: 'none', stroke: 'currentColor',
        'stroke-width': '2', 'stroke-linecap': 'round', 'aria-hidden': 'true',
        html: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>'
      })
    )
  ),
  el('div', { class: 'modal-body' }, body),
  footer ? el('div', { class: 'modal-foot' }, footer) : null);

  const scrim = el('div', {
    class: 'modal-scrim',
    onclick: (event) => { if (event.target === scrim) close(); }
  }, panel);

  function onKey(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(panel.querySelectorAll(FOCUSABLE))
      .filter((node) => node.offsetParent !== null || node === document.activeElement);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  document.body.append(scrim);
  document.documentElement.classList.add('modal-open');
  document.addEventListener('keydown', onKey, true);

  current = { close, panel };

  // Focus the first control, or the panel itself so Escape always works.
  const first = panel.querySelector(FOCUSABLE);
  if (first) {
    first.focus();
  } else {
    panel.setAttribute('tabindex', '-1');
    panel.focus();
  }

  return close;
}

/** Close whatever dialog is open. */
export function closeModal() {
  current?.close();
}

export function isModalOpen() {
  return Boolean(current);
}
