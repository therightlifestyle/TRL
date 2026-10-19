/**
 * TRL — The Right Lifestyle
 * core/store.js — observable state store with optional persistence.
 *
 *   const store = createStore({ key: 'trl-pipeline', initial: { cards: [] } });
 *   store.update(s => ({ cards: [...s.cards, card] }));
 *   store.subscribe(state => render(state));
 */

const memory = new Map();

function readLS(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function createStore({ key = null, initial = {}, version = 1 } = {}) {
  let state = { ...initial };
  let persistOk = true;

  if (key) {
    const saved = readLS(key);
    if (saved && saved.__v === version) {
      state = { ...state, ...saved.state };
    } else {
      memory.set(key, state);
    }
  }

  const listeners = new Set();

  function notify(reason) {
    listeners.forEach((fn) => {
      try { fn(state, reason); } catch (err) { console.error('[store] listener failed', err); }
    });
  }

  function persist() {
    if (!key) return;
    persistOk = writeLS(key, { __v: version, state, savedAt: Date.now() });
  }

  return {
    get state() { return state; },
    get persistent() { return persistOk; },
    get(keyPath, fallback) {
      if (keyPath === undefined) return state;
      return keyPath.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), state) ?? fallback;
    },
    set(patch, reason = 'set') {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      persist();
      notify(reason);
      return state;
    },
    update(fn, reason = 'update') {
      const next = fn(state);
      if (next && typeof next === 'object') state = { ...state, ...next };
      persist();
      notify(reason);
      return state;
    },
    replace(nextState, reason = 'replace') {
      state = { ...nextState };
      persist();
      notify(reason);
      return state;
    },
    reset(reason = 'reset') {
      state = { ...initial };
      persist();
      notify(reason);
      return state;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}

/** In-memory session store (not persisted) for transient UI state. */
export function createMemoryStore(initial = {}) {
  return createStore({ initial });
}
