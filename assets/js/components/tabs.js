/**
 * TRL — The Right Lifestyle
 * components/tabs.js — accessible tab groups.
 *
 *   <div class="tabs" data-tabs>
 *     <button class="tab-btn" role="tab" data-tab="a" aria-controls="panel-a">A</button>
 *   </div>
 *   <div class="tab-panel" id="panel-a" role="tabpanel" data-panel="a">…</div>
 */

import { qsa } from '../core/dom.js';

export function initTabs(root = document) {
  qsa('[data-tabs]', root).forEach((group) => {
    const buttons = qsa('[data-tab]', group);
    if (!buttons.length) return;

    const panels = buttons
      .map((btn) => document.getElementById(btn.dataset.tab) || document.querySelector(`[data-panel="${btn.dataset.tab}"]`))
      .filter(Boolean);

    const select = (button) => {
      buttons.forEach((btn) => {
        const active = btn === button;
        btn.setAttribute('aria-selected', String(active));
        btn.setAttribute('tabindex', active ? '0' : '-1');
      });
      panels.forEach((panel) => {
        panel.hidden = panel.id !== button.dataset.tab && panel.dataset.panel !== button.dataset.tab;
      });
      group.dispatchEvent(new CustomEvent('tabchange', { detail: { tab: button.dataset.tab } }));
    };

    buttons.forEach((button, index) => {
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(index === 0));
      button.setAttribute('tabindex', index === 0 ? '0' : '-1');
      button.addEventListener('click', () => select(button));
      button.addEventListener('keydown', (event) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
        if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = buttons.length - 1;
        buttons[next].focus();
        select(buttons[next]);
      });
    });

    const initial = buttons.find((btn) => btn.getAttribute('aria-selected') === 'true') || buttons[0];
    select(initial);
  });
}
