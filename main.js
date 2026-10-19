/**
 * TRL — The Right Lifestyle
 * Core progressive enhancements: navigation, mobile drawer, scroll reveals,
 * smooth anchor scrolling, theme toggle, and dynamic year.
 * Zero external dependencies.
 */
(function () {
  'use strict';

  // 1. Theme toggle initialization & handling
  var root = document.documentElement;
  var themeToggle = document.getElementById('theme-toggle') || document.querySelector('.theme-toggle');

  function updateThemeUI(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    if (themeToggle) {
      var isLight = theme === 'light';
      themeToggle.setAttribute('aria-pressed', isLight ? 'true' : 'false');
      themeToggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
      themeToggle.setAttribute('title', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    }
  }

  try {
    var savedTheme = localStorage.getItem('trl-theme');
    if (savedTheme) {
      updateThemeUI(savedTheme);
    }
  } catch (e) {
    /* localStorage may be restricted in private browsing */
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('trl-theme', next);
      } catch (e) {}
      updateThemeUI(next);
    });
  }

  // 2. Navigation bar condense on scroll
  var nav = document.getElementById('nav') || document.querySelector('.nav');
  function onScroll() {
    if (!nav) return;
    if (window.scrollY > 20) {
      nav.classList.add('stuck');
    } else {
      nav.classList.remove('stuck');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 3. Mobile burger menu
  var burger = document.getElementById('burger') || document.querySelector('.burger');
  var menu = document.getElementById('menu') || document.querySelector('.nav-links');

  function closeMenu() {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    menu.classList.remove('open');
    document.body.classList.remove('menu-open');
  }

  function openMenu() {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    menu.classList.add('open');
    document.body.classList.add('menu-open');
    var firstLink = menu.querySelector('a');
    if (firstLink) firstLink.focus();
  }

  if (burger && menu) {
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = burger.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        closeMenu();
      }
    });

    document.addEventListener('click', function (e) {
      if (burger.getAttribute('aria-expanded') === 'true' && nav && !nav.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        burger.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) {
        closeMenu();
      }
    }, { passive: true });
  }

  // 4. Scroll reveals with IntersectionObserver
  var reveals = document.querySelectorAll('.rv');
  var prefersReduced = false;
  try {
    prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  if (prefersReduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) {
      el.classList.add('in');
    });
  } else if (reveals.length > 0) {
    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.08
      }
    );

    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  // 5. Smooth anchor scrolling with sticky header offset
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var href = this.getAttribute('href');
      if (!href || href === '#' || href === '#main' || href.length < 2) return;
      var target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        var navHeight = nav ? nav.offsetHeight : 70;
        var top = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
        window.scrollTo({
          top: Math.max(0, top),
          behavior: prefersReduced ? 'auto' : 'smooth'
        });
        if (history.pushState) {
          history.pushState(null, null, href);
        }
      }
    });
  });

  // 6. Dynamic copyright year
  var yr = document.getElementById('yr') || document.querySelector('.foot-yr');
  if (yr) {
    yr.textContent = new Date().getFullYear();
  }
})();
