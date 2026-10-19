/**
 * TRL — The Right Lifestyle
 * core/events.js — minimal pub/sub bus for cross-module messaging.
 */

const channels = new Map();

export function on(channel, handler) {
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel).add(handler);
  return () => off(channel, handler);
}

export function off(channel, handler) {
  channels.get(channel)?.delete(handler);
}

export function emit(channel, payload) {
  const handlers = channels.get(channel);
  if (!handlers) return;
  handlers.forEach((fn) => {
    try { fn(payload); } catch (err) { console.error(`[events] handler failed for "${channel}"`, err); }
  });
}

export const bus = { on, off, emit };
