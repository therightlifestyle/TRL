/**
 * TRL — The Right Lifestyle
 * components/subscribe.js — the footer newsletter form.
 *
 * Submits to POST /api/newsletter when an API is reachable. Without one it
 * records the address locally and says plainly that it did — the same honest
 * degradation the rest of the site applies, so a static deploy never shows a
 * form that silently throws the address away.
 */

import { qs, on, debounce } from '../core/dom.js';
import { api, getStatus, getApiBase } from '../core/api.js';
import { toast } from './toast.js';
import { createStore } from '../core/store.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const store = createStore({ key: 'trl-subscribe', initial: { queued: [] } });

export function initSubscribe() {
  const form = qs('#subscribe-form');
  if (!form) return () => {};

  const input = qs('#sub-email', form);
  const button = qs('button[type="submit"]', form);

  const setBusy = (busy) => {
    if (!button) return;
    button.disabled = busy;
    button.style.opacity = busy ? '.6' : '';
    if (button.dataset.label === undefined) button.dataset.label = button.textContent;
    button.textContent = busy ? 'Sending…' : button.dataset.label;
  };

  const validate = () => {
    const value = (input?.value || '').trim();
    if (!EMAIL_RE.test(value)) {
      toast('That does not look like a valid email address.', { type: 'err' });
      input?.focus();
      return null;
    }
    return value;
  };

  const offSubmit = on(form, 'submit', async (event) => {
    event.preventDefault();
    const email = validate();
    if (!email) return;

    setBusy(true);
    try {
      if (getApiBase()) {
        const result = await api.subscribe(email);
        toast(result.message || 'Subscribed.', { type: 'ok', duration: 5200 });
      } else {
        throw new Error('no api');
      }
    } catch {
      // Local fallback: keep the address on this device and be honest about it.
      const queued = store.get().queued || [];
      if (!queued.includes(email)) store.update((state) => ({ queued: [...state.queued, email] }));
      toast('No TRL API is connected, so the address was saved on this device only. Email us to be added properly.', {
        type: 'warn',
        duration: 6500
      });
    } finally {
      setBusy(false);
      if (input) input.value = '';
    }
  });

  // Live feedback while typing, but never on the first keystroke.
  const offInput = input
    ? on(input, 'input', debounce(() => {
      const value = input.value.trim();
      if (!value) return;
      input.setAttribute('aria-invalid', String(!EMAIL_RE.test(value)));
    }, 400))
    : () => {};

  // Reflect API state so the promise made by the form matches reality.
  if (input) input.dataset.api = getStatus();

  return () => { offSubmit(); offInput(); };
}
