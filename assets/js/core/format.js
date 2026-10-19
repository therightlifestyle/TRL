/**
 * TRL — The Right Lifestyle
 * core/format.js — formatting helpers (PKR, dates, numbers, text).
 */

const nf = new Intl.NumberFormat('en-PK');

export const num = (value, digits = 0) =>
  Number.isFinite(value) ? nf.format(Number(value.toFixed(digits))) : '—';

export function pkr(value, { compact = false } = {}) {
  if (!Number.isFinite(value)) return '—';
  if (compact && Math.abs(value) >= 100000) {
    return `PKR ${(value / 1000).toFixed(value >= 1000000 ? 0 : 1)}k`;
  }
  return `PKR ${nf.format(Math.round(value))}`;
}

export const pct = (value, digits = 0) =>
  Number.isFinite(value) ? `${(value * 100).toFixed(digits)}%` : '—';

export const hours = (value, digits = 1) =>
  Number.isFinite(value) ? `${value.toFixed(digits)} h` : '—';

export function dateISO(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function dateShort(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function relativeTime(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return dateShort(d);
}

export function duration(ms) {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

export const slug = (value = '') =>
  String(value).toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const initials = (value = '') =>
  String(value).trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '—';

export const titleCase = (value = '') =>
  String(value).replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1));

export function truncate(value = '', max = 140) {
  const text = String(value).trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export const pluralize = (n, one, many) =>
  `${num(n)} ${n === 1 ? one : many ?? `${one}s`}`;
