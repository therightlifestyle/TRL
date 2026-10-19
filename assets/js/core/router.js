/**
 * TRL — The Right Lifestyle
 * core/router.js — hash router used by the Console application shell.
 *
 *   const router = createRouter({ routes: { triage: mountTriage } });
 *   router.start();
 */

export function createRouter({ routes = {}, fallback = null, onChange = null } = {}) {
  let current = null;
  const cleanup = [];

  function parse() {
    const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
    return raw || fallback || Object.keys(routes)[0];
  }

  async function resolve() {
    const name = parse();
    if (name === current) return;

    while (cleanup.length) {
      try { cleanup.pop()(); } catch (err) { console.error('[router] cleanup failed', err); }
    }

    current = name;
    const handler = routes[name];
    if (handler) {
      try {
        const result = await handler({ params: new URLSearchParams(window.location.hash.split('?')[1] || '') });
        if (typeof result === 'function') cleanup.push(result);
      } catch (err) {
        console.error(`[router] failed to mount "${name}"`, err);
      }
    }
    onChange?.(name);
  }

  function start() {
    window.addEventListener('hashchange', resolve);
    if (!window.location.hash) {
      window.location.replace(`#/${fallback || Object.keys(routes)[0]}`);
    }
    return resolve();
  }

  function navigate(name, params = {}) {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `#/${name}${query ? `?${query}` : ''}`;
  }

  return {
    start,
    navigate,
    get current() { return current; },
    stop() {
      window.removeEventListener('hashchange', resolve);
      while (cleanup.length) cleanup.pop()?.();
    }
  };
}
