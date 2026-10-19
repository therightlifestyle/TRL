/**
 * TRL — The Right Lifestyle
 * core/config.js — runtime configuration.
 *
 * The static site works with no configuration at all. To connect a deployed
 * TRL API, set `apiBase` below (or define window.TRL_CONFIG before this
 * module loads):
 *
 *   <script>window.TRL_CONFIG = { apiBase: 'https://api.example.com' };</script>
 */

export const CONFIG = {
  apiBase: (typeof window !== 'undefined' && window.TRL_CONFIG?.apiBase) || '',
  brand: 'TRL — The Right Lifestyle',
  email: 'officialtrlservice@gmail.com',
  whatsapp: '923190091457',
  hours: 'Mon–Sat · 10:30–18:30 PKT',
  location: 'Islamabad, Pakistan',
  storeVersion: 3
};

/**
 * Merge the canonical facts from assets/data/config.json into CONFIG.
 * The JSON file is the single source of truth for brand, contact and
 * commercial details; the values above are the offline fallback.
 */
export function applySiteConfig(data) {
  if (!data) return CONFIG;
  const brand = data.brand || {};
  Object.assign(CONFIG, {
    brand: brand.fullName || CONFIG.brand,
    email: brand.email || CONFIG.email,
    whatsapp: brand.whatsapp || CONFIG.whatsapp,
    hours: brand.hours || CONFIG.hours,
    location: brand.location || CONFIG.location,
    founder: brand.founder || CONFIG.founder,
    auditPrice: data.audit?.price ?? CONFIG.auditPrice,
    auditTurnaroundHours: data.audit?.turnaroundHours ?? CONFIG.auditTurnaroundHours,
    site: data.site || CONFIG.site
  });
  if (typeof window !== 'undefined') {
    window.TRL = Object.assign(window.TRL || {}, { CONFIG });
  }
  return CONFIG;
}

if (typeof window !== 'undefined') {
  window.TRL = Object.assign(window.TRL || {}, { CONFIG });
}
