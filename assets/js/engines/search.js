/**
 * TRL — The Right Lifestyle
 * engines/search.js — the unified site search and command-palette index.
 *
 * Pure module: no DOM, no network, no timers. The browser imports it for the
 * ⌘K palette, the API imports the *same file* for GET /api/search, and the
 * test suite asserts on it directly — so search cannot rank differently in
 * the browser than it does in production.
 *
 * Scoring is deliberately boring and deterministic: field weights, term
 * frequency and an ordered-subsequence fuzzy score. No randomness, no
 * external index, nothing to keep in sync.
 */

export const VERSION = '1.0.0';

/**
 * Field weights. A term in a title is worth far more than the same term
 * buried in an article body.
 */
export const FIELD_WEIGHTS = {
  title: 100,
  keywords: 42,
  tags: 34,
  group: 22,
  subtitle: 18,
  summary: 10,
  body: 3
};

/** Group ordering — decides how results are bucketed in the palette UI. */
export const GROUPS = ['navigate', 'service', 'work', 'insight', 'faq', 'action'];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'with', 'is',
  'are', 'be', 'do', 'does', 'how', 'what', 'can', 'i', 'we', 'you', 'my', 'me'
]);

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

/** Lowercase and split on anything that is not a letter or digit. */
export function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/gi)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/** Collapse whitespace and strip control characters. */
export function normalize(text = '') {
  return String(text).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * A document is { id, title, group, url, subtitle?, summary?, keywords?, tags?, body? }.
 * `buildIndex` pre-computes the token sets so a search never re-tokenises the
 * whole corpus.
 */
export function buildIndex(docs = []) {
  return docs
    .filter((doc) => doc && doc.id && doc.title)
    .map((doc) => {
      const title = normalize(doc.title);
      const keywords = normalize([doc.keywords, doc.tags].flat().filter(Boolean).join(' '));
      const group = normalize(doc.group || 'navigate');
      const subtitle = normalize(doc.subtitle || '');
      const summary = normalize(doc.summary || '');
      const body = normalize(doc.body || '').slice(0, 4000);
      return {
        ...doc,
        title,
        keywords,
        group,
        subtitle,
        summary,
        body,
        _title: tokenize(title),
        _keywords: tokenize(keywords),
        _group: tokenize(group),
        _subtitle: tokenize(subtitle),
        _summary: tokenize(summary),
        _body: tokenize(body),
        _hay: `${title} ${keywords} ${group} ${subtitle} ${summary} ${body}`.toLowerCase()
      };
    });
}

const FIELDS = [
  ['_title', 'title'],
  ['_keywords', 'keywords'],
  ['_group', 'group'],
  ['_subtitle', 'subtitle'],
  ['_summary', 'summary'],
  ['_body', 'body']
];

/**
 * Ordered-subsequence match: "svc" matches "services", "auom" matches
 * "automation". Returns a 0..1 quality score or 0 when the order breaks.
 */
export function subsequenceScore(needle, haystack = '') {
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
  if (!n || n.length < 2) return 0;
  let at = 0;
  let gaps = 0;
  for (const ch of n) {
    const found = h.indexOf(ch, at);
    if (found === -1) return 0;
    gaps += found - at;
    at = found + 1;
  }
  const compact = 1 - Math.min(1, gaps / Math.max(1, h.length));
  return (n.length / Math.max(n.length, h.length)) * 0.55 + compact * 0.45;
}

/** True when every query term appears somewhere in the document. */
function coversAll(doc, tokens) {
  return tokens.every((token) => doc._hay.includes(token));
}

/**
 * Score one document against the query tokens.
 * @returns {{score:number, matched:string[]}}
 */
export function scoreDoc(doc, tokens) {
  if (!tokens.length) return { score: 0, matched: [] };

  let score = 0;
  const matched = [];
  const joined = tokens.join(' ');

  for (const [field, name] of FIELDS) {
    const weight = FIELD_WEIGHTS[name];
    const list = doc[field];
    if (!list || !list.length) continue;

    let hits = 0;
    for (const token of tokens) {
      const exact = list.includes(token);
      const prefix = !exact && list.some((word) => word.startsWith(token));
      const partial = !exact && !prefix && list.some((word) => word.includes(token));
      if (exact) hits += 1;
      else if (prefix) hits += 0.7;
      else if (partial) hits += 0.35;
      if (exact || prefix) matched.push(token);
    }

    if (hits > 0) {
      // Diminishing returns per extra hit in the same field, so one very
      // strong match beats five weak ones.
      score += weight * (1 + Math.log(hits));
    }
  }

  // Exact phrase in the title is the strongest possible signal.
  const title = doc.title.toLowerCase();
  if (joined && title.includes(joined)) score += 140;
  else if (title === tokens[0]) score += 120;

  // Fuzzy rescue: when nothing matched but the letters are all there in order.
  if (score === 0) {
    const fuzzy = subsequenceScore(tokens.join(''), doc.title);
    if (fuzzy > 0.34) score += fuzzy * 60;
  }

  // A document must mention every term to rank at all — otherwise a search
  // for "ai audit" returns everything that merely mentions "ai".
  if (!coversAll(doc, tokens)) score *= 0.12;

  if (doc.boost) score *= doc.boost;

  return { score, matched: [...new Set(matched)] };
}

/**
 * Rank the corpus against a query.
 * @param {string} query
 * @param {Array} docs  output of buildIndex()
 * @param {{limit?:number, group?:string}} options
 */
export function search(query, docs = [], { limit = 12, group = null } = {}) {
  const started = Date.now();
  const tokens = tokenize(query);
  const clean = normalize(query);

  if (!clean || tokens.length === 0) {
    // Empty query: return the highest-priority entries as suggestions.
    const suggestions = docs
      .filter((doc) => !group || doc.group === group)
      .filter((doc) => doc.priority)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, limit)
      .map((doc) => strip(doc, 0, []));
    return { query: clean, tokens, total: suggestions.length, tookMs: 0, results: suggestions };
  }

  const scored = [];
  for (const doc of docs) {
    if (group && doc.group !== group) continue;
    const { score, matched } = scoreDoc(doc, tokens);
    if (score <= 0) continue;
    scored.push(strip(doc, score, matched));
  }

  scored.sort((a, b) => (
    b.score - a.score
    || (a.group === 'navigate' ? -1 : 0) - (b.group === 'navigate' ? -1 : 0)
    || a.title.localeCompare(b.title)
  ));

  return {
    query: clean,
    tokens,
    total: scored.length,
    tookMs: Date.now() - started,
    results: scored.slice(0, limit)
  };
}

/** Remove the private pre-computed fields from a result. */
function strip(doc, score, matched) {
  return {
    id: doc.id,
    title: doc.title,
    group: doc.group,
    url: doc.url || '',
    subtitle: doc.subtitle || '',
    summary: (doc.summary || '').slice(0, 160),
    keywords: doc.keywords || '',
    score: Math.round(score * 100) / 100,
    matched
  };
}

/**
 * Wrap query terms in <b> for the palette UI. Input is escaped, so this is
 * safe to inject as HTML.
 */
export function highlight(text = '', tokens = []) {
  const safe = escapeHtml(text);
  if (!tokens.length) return safe;
  const pattern = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return safe.replace(pattern, '<b>$1</b>');
}

/**
 * Turn the site's data files into one searchable corpus.
 * Accepts partial input — a missing file simply contributes nothing, which is
 * what lets the palette work offline from whatever is cached.
 */
export function indexFromData({
  services = null, insights = null, work = null, faq = null, knowledge = null,
  pages = [], actions = []
} = {}) {
  const docs = [];

  for (const page of pages) {
    docs.push({
      id: `page:${page.id || page.url}`,
      group: 'navigate',
      title: page.title,
      subtitle: page.subtitle || '',
      summary: page.summary || '',
      keywords: page.keywords || '',
      url: page.url,
      priority: page.priority || 1,
      boost: 1.25
    });
  }

  for (const action of actions) {
    docs.push({
      id: `action:${action.id}`,
      group: 'action',
      title: action.title,
      subtitle: action.hint || '',
      keywords: (action.keywords || []).join(' '),
      url: action.url || '',
      action: action.id,
      priority: action.priority || 0
    });
  }

  for (const item of services?.services || []) {
    docs.push({
      id: `service:${item.id}`,
      group: 'service',
      title: item.title,
      subtitle: item.short || '',
      summary: item.summary || '',
      keywords: [item.deliverables, item.tools, item.outcomes].flat().join(' '),
      tags: [],
      url: `services.html#${item.id}`,
      priority: 3
    });
  }

  for (const item of work?.items || []) {
    docs.push({
      id: `work:${item.id}`,
      group: 'work',
      title: item.title,
      subtitle: item.discipline || '',
      summary: item.problem || item.approach || '',
      keywords: (item.tags || []).join(' '),
      url: `work.html#${item.id}`,
      priority: 2
    });
  }

  for (const item of insights?.articles || []) {
    docs.push({
      id: `insight:${item.id}`,
      group: 'insight',
      title: item.title,
      subtitle: item.category || '',
      summary: item.summary || '',
      keywords: (item.tags || []).join(' '),
      body: item.body || '',
      url: `insights.html#${item.id}`,
      priority: item.featured ? 3 : 1
    });
  }

  for (const item of faq?.items || []) {
    docs.push({
      id: `faq:${item.id}`,
      group: 'faq',
      title: item.question,
      subtitle: 'Frequently asked',
      summary: item.answer || '',
      body: item.answer || '',
      url: 'index.html#faq',
      priority: 1
    });
  }

  for (const item of knowledge?.entries || []) {
    docs.push({
      id: `knowledge:${item.id}`,
      group: 'faq',
      title: item.title || item.question,
      // `starter` is a boolean flag ("show as a starter question"), not text —
      // the phrased question is the useful subtitle here.
      subtitle: item.question || '',
      summary: item.answer || '',
      keywords: (item.keywords || []).join(' '),
      tags: item.tags || [],
      body: item.answer || '',
      url: item.url || 'console/index.html',
      priority: 0
    });
  }

  return buildIndex(docs);
}

export default { VERSION, search, buildIndex, indexFromData, highlight, tokenize };
