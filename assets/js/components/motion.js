/**
 * TRL — The Right Lifestyle
 * components/motion.js — the pointer- and scroll-driven effect layer.
 *
 * Every effect here follows the same contract:
 *   · JavaScript measures and writes CSS custom properties.
 *   · CSS (motion.css) does all the drawing.
 *   · Nothing runs when the visitor asked for reduced motion.
 *   · Nothing runs when the pointer cannot hover (touch), unless the effect
 *     is scroll-based and therefore still meaningful.
 *
 * All listeners are registered once, on the document, with rAF throttling, so
 * the cost is independent of how many elements opt in.
 */

import { on, qsa, rafThrottle, prefersReducedMotion } from '../core/dom.js';

/** Can this device hover, and did the visitor allow motion? */
const canAnimate = () => !prefersReducedMotion();

function canHover() {
  try {
    return window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  } catch {
    return true;
  }
}

/* ------------------------------------------------------------------ scroll progress
   Writes --scroll (0..1) on <html>. Consumed by .progress-bar and .totop. */
export function initScrollProgress() {
  const root = document.documentElement;

  const update = rafThrottle(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    root.style.setProperty('--scroll', ratio.toFixed(4));
  });

  update();
  on(window, 'scroll', update, { passive: true });
  on(window, 'resize', update, { passive: true });
  return update;
}

/* ------------------------------------------------------------------ cursor spotlight
   Writes --mx/--my relative to the hovered element, in pixels. */
export function initSpotlight() {
  if (!canHover() || !canAnimate()) return () => {};

  const move = rafThrottle((event, node) => {
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--mx', `${Math.round(event.clientX - rect.left)}px`);
    node.style.setProperty('--my', `${Math.round(event.clientY - rect.top)}px`);
  });

  return on(document, 'pointermove', (event) => {
    const node = event.target.closest?.('[data-spot]');
    if (node) move(event, node);
  }, { passive: true });
}

/* ------------------------------------------------------------------ tilt
   Cards opt in with data-tilt and an optional data-tilt-max (degrees). */
export function initTilt() {
  if (!canHover() || !canAnimate()) return () => {};

  const apply = rafThrottle((node, rx, ry) => {
    node.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.015)`;
  });

  const offs = [];

  offs.push(on(document, 'pointermove', (event) => {
    const node = event.target.closest?.('[data-tilt]');
    if (!node) return;
    const max = Number(node.dataset.tiltMax || 6);
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    const py = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    node.classList.add('is-tilting');
    apply(node, (-py * max).toFixed(2), (px * max).toFixed(2));
  }, { passive: true }));

  offs.push(on(document, 'pointerleave', (event) => {
    const node = event.target.closest?.('[data-tilt]');
    if (!node) return;
    node.classList.remove('is-tilting');
    node.style.transform = '';
  }, { passive: true }));

  return () => offs.forEach((off) => off());
}

/* ------------------------------------------------------------------ magnetic buttons
   Primary CTAs pull gently toward the cursor inside a small radius. */
export function initMagnetic() {
  if (!canHover() || !canAnimate()) return () => {};

  const nodes = qsa('[data-magnetic]');
  if (!nodes.length) return () => {};

  const STRENGTH = 0.28;
  const RADIUS = 90;
  const offs = [];

  for (const node of nodes) {
    offs.push(on(node, 'pointermove', rafThrottle((event) => {
      const rect = node.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      if (Math.hypot(dx, dy) > rect.width / 2 + RADIUS) {
        node.style.setProperty('--mag-x', '0px');
        node.style.setProperty('--mag-y', '0px');
        return;
      }
      node.style.setProperty('--mag-x', `${(dx * STRENGTH).toFixed(2)}px`);
      node.style.setProperty('--mag-y', `${(dy * STRENGTH).toFixed(2)}px`);
    }), { passive: true }));

    offs.push(on(node, 'pointerleave', () => {
      node.style.setProperty('--mag-x', '0px');
      node.style.setProperty('--mag-y', '0px');
    }));
  }

  return () => offs.forEach((off) => off());
}

/* ------------------------------------------------------------------ ripple
   Click feedback on buttons, injected as a short-lived span. */
export function initRipple() {
  if (!canAnimate()) return () => {};

  return on(document, 'pointerdown', (event) => {
    const node = event.target.closest?.('.btn');
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.1;
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.width = `${size}px`;
    span.style.height = `${size}px`;
    span.style.left = `${event.clientX - rect.left}px`;
    span.style.top = `${event.clientY - rect.top}px`;
    node.append(span);
    setTimeout(() => span.remove(), 640);
  }, { passive: true });
}

/* ------------------------------------------------------------------ parallax
   data-parallax="0.12" moves the element at a fraction of the scroll delta
   relative to its own position in the document. */
export function initParallax() {
  const nodes = qsa('[data-parallax]');
  if (!nodes.length || !canAnimate()) return () => {};

  const update = rafThrottle(() => {
    const mid = window.innerHeight / 2;
    for (const node of nodes) {
      const rate = Number(node.dataset.parallax || 0.1);
      const rect = node.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) continue;
      const offset = (rect.top + rect.height / 2 - mid) * -rate;
      node.style.transform = `translate3d(0,${offset.toFixed(1)}px,0)`;
    }
  });

  update();
  const off = on(window, 'scroll', update, { passive: true });
  return () => { off(); update(); };
}

/* ------------------------------------------------------------------ stagger index
   Children of [data-stagger] receive --i so CSS can offset their reveals.
   Idempotent, and re-run when the DOM changes, because most grids on this site
   are rendered by an app module after boot. */
export function initStagger() {
  for (const group of qsa('[data-stagger]')) {
    const children = Array.from(group.children);
    children.forEach((child, index) => {
      child.style.setProperty('--i', String(index));
      if (!child.classList.contains('rv')) child.classList.add('rv');
    });
    group.dataset.staggerReady = String(children.length);
  }
}

/** Re-run the stagger pass only for groups whose child count changed. */
function refreshStagger() {
  for (const group of qsa('[data-stagger]')) {
    if (group.dataset.staggerReady === String(group.children.length)) continue;
    Array.from(group.children).forEach((child, index) => {
      child.style.setProperty('--i', String(index));
      if (!child.classList.contains('rv')) child.classList.add('rv');
    });
    group.dataset.staggerReady = String(group.children.length);
  }
}

let staggerWatcher = null;

function watchStagger() {
  if (staggerWatcher) staggerWatcher.disconnect();
  if (typeof MutationObserver === 'undefined' || !document.body) return;
  staggerWatcher = new MutationObserver(() => refreshStagger());
  staggerWatcher.observe(document.body, { childList: true, subtree: true });
}

/* ------------------------------------------------------------------ line masks
   Wraps each direct child of .lines in an overflow-hidden line container so
   the text can slide up from behind a mask. Idempotent. */
export function initLineMasks() {
  for (const block of qsa('.lines')) {
    if (block.dataset.split === 'done') continue;
    block.dataset.split = 'done';
    Array.from(block.children).forEach((child, index) => {
      if (child.classList.contains('line')) return;
      const inner = document.createElement('span');
      inner.style.setProperty('--i', String(index));
      while (child.firstChild) inner.append(child.firstChild);
      child.classList.add('line');
      child.append(inner);
    });
  }
}

/* ------------------------------------------------------------------ character reveal
   .chars splits its own text into .ch spans. Markup is preserved by only
   splitting text nodes, so existing <em> and <span> children survive. */
export function initCharReveal() {
  if (!canAnimate()) {
    for (const block of qsa('.chars')) block.classList.add('in');
    return;
  }
  for (const block of qsa('.chars')) {
    if (block.dataset.split === 'done') continue;
    block.dataset.split = 'done';
    let counter = 0;
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.nodeValue;
          if (!text || !text.trim()) continue;
          const frag = document.createDocumentFragment();
          for (const char of text) {
            const span = document.createElement('span');
            span.className = 'ch';
            span.style.setProperty('--i', String(counter++));
            span.textContent = char === ' ' ? '\u00A0' : char;
            frag.append(span);
          }
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      }
    };
    walk(block);
  }
}

/**
 * Boot the whole effect layer. Returns a disposer.
 * Safe to call more than once — each init is idempotent.
 */
export function initMotion() {
  const disposers = [
    initScrollProgress(),
    initSpotlight(),
    initTilt(),
    initMagnetic(),
    initRipple(),
    initParallax()
  ].filter(Boolean);

  initStagger();
  watchStagger();
  initLineMasks();
  initCharReveal();

  document.documentElement.classList.add('motion-ready');
  return () => disposers.forEach((dispose) => { if (typeof dispose === 'function') dispose(); });
}
