/**
 * TRL — The Right Lifestyle
 * apps/services.js — services page behaviour: index scroll-spy, deep links and
 * a live engagement-model selector.
 */

import { qs, qsa, escapeHtml } from '../core/dom.js';

function initScrollSpy() {
  const links = qsa('.svc-nav a');
  if (!links.length) return;
  const sections = links
    .map((link) => {
      const id = link.getAttribute('href')?.replace('#', '');
      const section = id ? document.getElementById(id) : null;
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.classList.remove('active'));
      const match = sections.find((s) => s.section === entry.target);
      match?.link.classList.add('active');
    });
  }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });

  sections.forEach(({ section }) => observer.observe(section));
}

function initEngagementModels() {
  const host = qs('#engagement-models');
  if (!host) return;

  const models = [
    {
      id: 'audit',
      name: 'Rapid AI Opportunity Audit',
      price: 'PKR 3,000',
      unit: 'fixed',
      summary: 'A written diagnostic of where time is actually lost, ranked by impact against effort.',
      includes: ['Friction map of your top time-drains', 'Prioritised automation matrix', 'Tooling recommendations and ROI estimate', '30-minute walkthrough call', 'Delivered within 72 hours'],
      best: 'You are not sure what to fix first.'
    },
    {
      id: 'build',
      name: 'Scoped build',
      price: 'Quoted',
      unit: 'per scope',
      summary: 'A single workflow, website or system — fixed scope, fixed price, staged with visible demos.',
      includes: ['Written scope and deliverables', 'Staged delivery with demos', 'Documentation and runbooks', 'Full ownership transfer at handover', 'No retainer required afterwards'],
      best: 'You already know what you want built.'
    },
    {
      id: 'retainer',
      name: 'Ongoing systems support',
      price: 'Monthly',
      unit: 'retainer',
      summary: 'Monitoring, adjustments and improvements to the systems we built, month to month.',
      includes: ['Monitoring and alerting upkeep', 'Workflow changes and improvements', 'Agreed response time', 'Monthly review of what the automation returned', 'Cancel with 30 days’ notice'],
      best: 'You want the system to keep improving.'
    }
  ];

  host.innerHTML = models.map((model) => `
    <div class="price-card ${model.id === 'audit' ? 'feature' : ''}">
      <span class="label ${model.id === 'audit' ? 'demo' : 'sample'}">${model.id === 'audit' ? 'Published price' : model.id === 'build' ? 'Most common' : 'Optional'}</span>
      <h3>${escapeHtml(model.name)}</h3>
      <b>${escapeHtml(model.price)} <small>${escapeHtml(model.unit)}</small></b>
      <p>${escapeHtml(model.summary)}</p>
      <ul>${model.includes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      <p class="tiny" style="margin-top:auto"><b>Best when:</b> ${escapeHtml(model.best)}</p>
    </div>`).join('');
}

function initDeepLinks() {
  if (!location.hash) return;
  const target = document.querySelector(location.hash);
  if (!target) return;
  window.setTimeout(() => {
    const nav = document.getElementById('nav');
    const top = target.getBoundingClientRect().top + window.pageYOffset - (nav?.offsetHeight || 70) - 20;
    window.scrollTo({ top, behavior: 'smooth' });
  }, 120);
}

export function initServices() {
  initScrollSpy();
  initEngagementModels();
  initDeepLinks();
}
