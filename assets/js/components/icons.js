/**
 * TRL — The Right Lifestyle
 * components/icons.js — inline SVG icon set (24×24, stroke based).
 * Inline so the site never makes an external request and icons inherit colour.
 */

const P = {
  ai: '<path d="M12 3a4 4 0 0 0-4 4v1a3 3 0 0 0 0 6v1a4 4 0 0 0 8 0v-1a3 3 0 0 0 0-6V7a4 4 0 0 0-4-4Z"/><path d="M8 8h8M8 16h8M12 8v8"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="16" rx="1.6"/><path d="M2.5 9.5h19M6.5 4v5.5M9 20h6"/>',
  search: '<circle cx="11" cy="11" r="7.2"/><path d="m20.4 20.4-4.2-4.2M8.4 11h5.2M11 8.4v5.2"/>',
  doc: '<path d="M14 2.5H7.4A1.9 1.9 0 0 0 5.5 4.4v15.2a1.9 1.9 0 0 0 1.9 1.9h9.2a1.9 1.9 0 0 0 1.9-1.9V7.2z"/><path d="M14 2.5v4.7h4.8M9 13h6M9 16.6h4"/>',
  megaphone: '<path d="M3.5 11 21 3.5l-7.5 17.5-2.4-7.6z"/><path d="M3.5 11v4a2 2 0 0 0 2 2h1.6"/>',
  code: '<path d="m16 18 5.5-6L16 6M8 6l-5.5 6L8 18"/>',
  chat: '<path d="M20.5 14.6a1.8 1.8 0 0 1-1.8 1.8H7.6L3.5 20.4V5.6a1.8 1.8 0 0 1 1.8-1.8h13.4a1.8 1.8 0 0 1 1.8 1.8z"/><path d="M8 9h8M8 12.4h5"/>',
  capture: '<path d="M3 7.5h18v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/><path d="M8 7.5V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1.5"/><path d="M3 12.5h18"/>',
  route: '<circle cx="6" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="M8.6 6H14a3 3 0 0 1 3 3v6.4M15.4 18H10a3 3 0 0 1-3-3V8.6"/>',
  automate: '<path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.3 5.3l2.8 2.8M15.9 15.9l2.8 2.8M18.7 5.3l-2.8 2.8M8.1 15.9l-2.8 2.8"/><circle cx="12" cy="12" r="3.2"/>',
  layers: '<path d="m12 2.8 9 4.6-9 4.6-9-4.6z"/><path d="m3 12.6 9 4.6 9-4.6M3 17.4l9 4.6 9-4.6"/>',
  review: '<path d="M20.5 14.6a1.8 1.8 0 0 1-1.8 1.8H7.6L3.5 20.4V5.6a1.8 1.8 0 0 1 1.8-1.8h13.4a1.8 1.8 0 0 1 1.8 1.8z"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6.8V12l3.4 2"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0M16.5 4.9a3.4 3.4 0 0 1 0 6.4M17.5 14.4A6.2 6.2 0 0 1 21.6 20"/>',
  link: '<path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3"/><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 2.8 4.5 6v6c0 4.4 3.1 8 7.5 9.2 4.4-1.2 7.5-4.8 7.5-9.2V6z"/><path d="m9 12 2 2 4-4"/>',
  mail: '<rect x="2.8" y="5" width="18.4" height="14" rx="2"/><path d="m3.4 6.6 8.6 6 8.6-6"/>',
  phone: '<path d="M20.5 14.6a1.8 1.8 0 0 1-1.8 1.8H7.6L3.5 20.4V5.6a1.8 1.8 0 0 1 1.8-1.8h13.4a1.8 1.8 0 0 1 1.8 1.8z"/><path d="M8 9h8M8 12.4h5"/>',
  whatsapp: '<path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z"/><path d="M8.8 8.4c.3 2.4 2.4 4.5 4.8 4.8l.9-1.2 1.7.8v1.3c-3.9.8-8-3.3-7.2-7.2h1.3l.8 1.7z"/>',
  pin: '<path d="M12 21.5s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10.2" r="2.6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 20h16"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  send: '<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-8-8-4z"/>',
  play: '<path d="M7 4.5 19 12 7 19.5z"/>',
  refresh: '<path d="M20 11.5A8 8 0 1 0 18.4 17"/><path d="M20 5v6h-6"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
  inbox: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5.4 4.6 3 13v5.5A1.5 1.5 0 0 0 4.5 20h15a1.5 1.5 0 0 0 1.5-1.5V13l-2.4-8.4A1.9 1.9 0 0 0 16.8 3H7.2a1.9 1.9 0 0 0-1.8 1.6Z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5z"/><path d="M8 3v18"/>',
  scale: '<path d="M12 3v18M6 21h12M4 8h16M8 8l-3 6h6zM16 8l-3 6h6z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>',
  briefcase: '<rect x="2.8" y="7" width="18.4" height="13" rx="2"/><path d="M8.5 7V5.4A1.9 1.9 0 0 1 10.4 3.5h3.2a1.9 1.9 0 0 1 1.9 1.9V7M2.8 12.5h18.4"/>',
  building: '<path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5V21M14 10h4.5A1.5 1.5 0 0 1 20 11.5V21M2.5 21h19M7 8h4M7 12h4M7 16h4M16.5 14h1.5M16.5 17.5h1.5"/>'
};

/**
 * @param {string} name  key in the icon map
 * @param {number} [size]
 * @param {string} [className]
 */
export function icon(name, size = 20, className = '') {
  const path = P[name] || P.spark;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}"
    class="${className}" aria-hidden="true">${path}</svg>`;
}

export const iconNames = Object.keys(P);
