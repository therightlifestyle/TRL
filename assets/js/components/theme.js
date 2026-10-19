/**
 * TRL — The Right Lifestyle
 * components/theme.js — light / dark appearance with system preference.
 *
 * Three states: "dark", "light" and "auto" (follow the OS). The choice is
 * persisted; "auto" re-evaluates whenever the OS preference changes, so a
 * laptop switching to night mode takes the site with it.
 *
 * The initial paint is handled by the inline script in every page <head>, so
 * there is no flash of the wrong theme before this module loads.
 */

const KEY = 'trl-theme';

export function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

/** The stored preference: 'dark' | 'light' | 'auto'. */
export function getPreference() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === 'light' || saved === 'auto' ? saved : 'dark';
  } catch {
    return 'dark';
  }
}

/** The theme actually painted on the document right now. */
export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function paint(theme) {
  const root = document.documentElement;
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else root.removeAttribute('data-theme');

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    const isLight = theme === 'light';
    toggle.setAttribute('aria-pressed', String(isLight));
    const label = `Switch to ${isLight ? 'dark' : 'light'} theme`;
    toggle.setAttribute('aria-label', label);
    toggle.setAttribute('title', label);
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#F7F9FC' : '#040B14');

  document.dispatchEvent(new CustomEvent('trl:theme', { detail: { theme, preference: getPreference() } }));
}

/** Resolve the stored preference to a concrete theme and paint it. */
export function applyPreference() {
  const preference = getPreference();
  paint(preference === 'auto' ? systemTheme() : preference);
  return getTheme();
}

/**
 * Set and persist a theme. Accepts 'dark', 'light' or 'auto'.
 * @returns {string} the theme now painted
 */
export function setTheme(next) {
  const value = next === 'light' || next === 'auto' ? next : 'dark';
  try { localStorage.setItem(KEY, value); } catch { /* private mode */ }
  paint(value === 'auto' ? systemTheme() : value);
  return getTheme();
}

/** Cycle dark → light → auto → dark. Used by long-press and the palette. */
export function cycleTheme() {
  const order = ['dark', 'light', 'auto'];
  const next = order[(order.indexOf(getPreference()) + 1) % order.length];
  return setTheme(next);
}

export function initTheme() {
  applyPreference();

  // Follow the OS while the visitor is on "auto".
  try {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const listener = () => { if (getPreference() === 'auto') paint(systemTheme()); };
    if (media.addEventListener) media.addEventListener('change', listener);
    else if (media.addListener) media.addListener(listener);
  } catch { /* matchMedia unavailable */ }

  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    setTheme(getTheme() === 'light' ? 'dark' : 'light');
  });

  // Long-press (or right-click) opts into "follow the system".
  let timer = null;
  toggle.addEventListener('pointerdown', () => {
    timer = setTimeout(() => {
      setTheme('auto');
      toggle.dispatchEvent(new CustomEvent('trl:auto-applied', { bubbles: true }));
    }, 620);
  });
  const cancel = () => clearTimeout(timer);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => {
    toggle.addEventListener(type, cancel);
  });
}
