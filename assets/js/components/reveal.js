/**
 * TRL — The Right Lifestyle
 * components/reveal.js — scroll reveals and anchor scrolling.
 */

import { prefersReducedMotion } from '../core/dom.js';

export function initReveals() {
  const items = document.querySelectorAll('.rv');
  if (!items.length) return;

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        obs.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.06 });

  items.forEach((el) => observer.observe(el));
}

export function initAnchors() {
  const nav = document.getElementById('nav');
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      const navHeight = nav ? nav.offsetHeight : 70;
      const top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      if (history.pushState) history.pushState(null, '', href);
    });
  });
}
