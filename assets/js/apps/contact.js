/**
 * TRL — The Right Lifestyle
 * apps/contact.js — the enquiry form.
 *
 * Submits to the TRL API when one is deployed, and falls back to a locally
 * queued enquiry plus a ready-to-send WhatsApp / email message when it is
 * not. A live readout shows how the message will be classified before it is
 * sent, using the same triage engine the Console runs.
 */

import { qs, qsa, escapeHtml, debounce } from '../core/dom.js';
import { CONFIG } from '../core/config.js';
import { api, withFallback } from '../core/api.js';
import { triageEnquiry } from '../engines/triage.js';
import { toast } from '../components/toast.js';

const STORAGE_KEY = 'trl-queued-enquiries';

function queueLocally(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.push({ ...payload, queuedAt: new Date().toISOString() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-20)));
    return existing.length;
  } catch {
    return 0;
  }
}

function updateReadout(message) {
  const host = qs('#contact-readout');
  if (!host) return;
  if (!message || message.trim().length < 12) {
    host.innerHTML = '<p class="tiny">Write a few sentences and this panel shows exactly how the message will be classified, routed and answered.</p>';
    return;
  }
  const result = triageEnquiry(message, { source: 'contact-form' });
  const urgencyClass = { high: 'high', medium: 'med', low: 'low' }[result.urgency.level];
  host.innerHTML = `
    <dl class="kv" style="border-top:0">
      <div><dt>Classified as</dt><dd>${escapeHtml(result.intent.label)}<span class="sub">${Math.round(result.intent.confidence * 100)}% confidence</span></dd></div>
      <div><dt>Priority</dt><dd><span class="pill ${urgencyClass}">${escapeHtml(result.urgency.level)}</span> <span class="pill info">${escapeHtml(result.route.priority)}</span></dd></div>
      <div><dt>Routed to</dt><dd>${escapeHtml(result.route.team)}<span class="sub">${escapeHtml(result.route.sla)}</span></dd></div>
      <div><dt>We will ask for</dt><dd>${result.gaps.length ? escapeHtml(result.gaps.map((g) => g.label).join(', ')) : 'Nothing — the message is complete'}</dd></div>
    </dl>
    <p class="tiny" style="margin-top:.9rem">This runs entirely in your browser. The message is not sent until you press send.</p>`;
}

function buildWhatsAppLink(payload) {
  const text = [
    `Hello TRL Team,`,
    ``,
    `My name is ${payload.name || '[Your Name]'}${payload.business ? `, representing ${payload.business}` : ''}.`,
    ``,
    `I would like to discuss: ${payload.message}`,
    ``,
    payload.service ? `Service of interest: ${payload.service}` : '',
    payload.timeline ? `Timeline: ${payload.timeline}` : '',
    payload.budget ? `Budget range: ${payload.budget}` : '',
    ``,
    `Reply channel: ${payload.email || payload.phone || '[email or number]'}`,
    ``,
    `Thank you.`
  ].filter((line) => line !== undefined).join('\n');
  return `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function initContact() {
  const form = qs('#enquiry-form');
  if (!form) return;

  const messageField = qs('#eq-message');
  messageField?.addEventListener('input', debounce(() => updateReadout(messageField.value), 320));

  const status = qs('#form-status');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      name: (data.name || '').trim(),
      business: (data.business || '').trim(),
      email: (data.email || '').trim(),
      phone: (data.phone || '').trim(),
      service: data.service || '',
      timeline: data.timeline || '',
      budget: data.budget || '',
      message: (data.message || '').trim()
    };

    if (!payload.message || payload.message.length < 10) {
      status.className = 'form-msg err show';
      status.textContent = 'Please describe the problem in a sentence or two so we can reply usefully.';
      return;
    }
    if (!payload.email && !payload.phone) {
      status.className = 'form-msg err show';
      status.textContent = 'Please leave an email address or a phone number so we can reply.';
      return;
    }

    const submit = form.querySelector('button[type="submit"]');
    const original = submit?.innerHTML;
    if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }

    const { data: result, remote } = await withFallback(
      '/api/leads',
      () => {
        const count = queueLocally(payload);
        return { queued: true, count, id: `local-${Date.now().toString(36)}` };
      },
      { method: 'POST', body: payload }
    );

    if (submit) { submit.disabled = false; submit.innerHTML = original; }

    status.className = 'form-msg ok show';
    const wa = buildWhatsAppLink(payload);
    status.innerHTML = remote
      ? `Received — reference <b>${escapeHtml(result?.id || '—')}</b>. We reply Monday to Saturday, 10:30–18:30 PKT. If it is urgent, <a href="${wa}" target="_blank" rel="noopener">send the same message on WhatsApp</a>.`
      : `Saved locally and ready to send. This site is running without the API, so nothing was transmitted — <a href="${wa}" target="_blank" rel="noopener">send it on WhatsApp</a> or email <b>officialtrlservice@gmail.com</b>.`;

    form.reset();
    updateReadout('');
    toast(remote ? 'Enquiry sent to the TRL API.' : 'Enquiry queued locally.', { type: 'ok' });
  });
}
