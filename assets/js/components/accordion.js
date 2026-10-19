/**
 * TRL — The Right Lifestyle
 * components/accordion.js — disclosure panels with animated height.
 *
 *   <div class="acc" data-acc>
 *     <div class="acc-item">
 *       <button class="acc-head" data-acc-head><b>Question</b><span class="acc-ico"></span></button>
 *       <div class="acc-body" data-acc-body><div class="acc-body-inner">…</div></div>
 *     </div>
 *   </div>
 */

import { qsa, prefersReducedMotion } from '../core/dom.js';

export function initAccordions(root = document) {
  qsa('[data-acc]', root).forEach((acc) => {
    const items = qsa('.acc-item', acc);
    const single = acc.dataset.acc !== 'multi';

    items.forEach((item) => {
      const head = item.querySelector('[data-acc-head]');
      const body = item.querySelector('[data-acc-body]');
      if (!head || !body) return;

      head.setAttribute('aria-expanded', 'false');
      const panelId = body.id || `acc-${Math.random().toString(36).slice(2, 9)}`;
      body.id = panelId;
      head.setAttribute('aria-controls', panelId);

      const toggle = (open) => {
        item.classList.toggle('open', open);
        head.setAttribute('aria-expanded', String(open));
        if (prefersReducedMotion()) {
          body.style.maxHeight = open ? 'none' : '0px';
          return;
        }
        body.style.maxHeight = open ? `${body.scrollHeight}px` : '0px';
        if (open) {
          body.addEventListener('transitionend', function done(event) {
            if (event.propertyName !== 'max-height') return;
            body.style.maxHeight = 'none';
            body.removeEventListener('transitionend', done);
          });
        }
      };

      head.addEventListener('click', () => {
        const open = head.getAttribute('aria-expanded') === 'true';
        if (single && !open) {
          items.forEach((other) => {
            if (other === item) return;
            other.classList.remove('open');
            other.querySelector('[data-acc-head]')?.setAttribute('aria-expanded', 'false');
            const otherBody = other.querySelector('[data-acc-body]');
            if (otherBody) otherBody.style.maxHeight = '0px';
          });
        }
        toggle(!open);
      });
    });
  });
}
