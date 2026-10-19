/**
 * TRL — The Right Lifestyle
 * components/theme.js — light / dark theme with persistence.
 */

const KEY = 'trl-theme';

function apply(theme) {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const isLight = theme === 'light';
    toggle.setAttribute('aria-pressed', String(isLight));
    toggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    toggle.setAttribute('title', isLight ? 'Switch to dark theme' : 'Switch to light theme');
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F7F9FC' : '#040B14');
}

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function initTheme() {
  apply(getTheme());

  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const next = getTheme() === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(KEY, next); } catch { /* private mode */ }
    apply(next);
  });
}
