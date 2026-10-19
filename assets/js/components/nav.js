/**
 * TRL — The Right Lifestyle
 * components/nav.js — sticky navigation, mobile drawer, active link tracking.
 */

export function initNav() {
  const nav = document.getElementById('nav') || document.querySelector('.nav');
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');

  if (nav) {
    const onScroll = () => nav.classList.toggle('stuck', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (!burger || !menu) return;

  const close = () => {
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    menu.classList.remove('open');
    document.body.classList.remove('menu-open');
  };
  const open = () => {
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    menu.classList.add('open');
    document.body.classList.add('menu-open');
    menu.querySelector('a')?.focus();
  };

  burger.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = burger.getAttribute('aria-expanded') === 'true';
    isOpen ? close() : open();
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });

  document.addEventListener('click', (event) => {
    if (burger.getAttribute('aria-expanded') === 'true' && nav && !nav.contains(event.target)) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      close();
      burger.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) close();
  }, { passive: true });
}

/** Mark the nav link that matches the current file. */
export function markActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http')) return;
    if (href === path) link.setAttribute('aria-current', 'page');
  });
}
