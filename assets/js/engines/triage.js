/**
 * TRL — The Right Lifestyle
 * engines/triage.js — deterministic enquiry triage & routing engine.
 *
 * Pure module: no DOM, no network, no timers. The same file runs in the
 * browser (Console), in the Node API (server/src) and in the test suite
 * (tests/), so behaviour can never drift between environments.
 *
 * Everything it does is explainable: each extracted field carries the
 * signal that produced it, and every classification returns its runner-up.
 */

export const ENGINE_VERSION = '1.2.0';

/* ------------------------------------------------------------------ taxonomy */

export const INTENTS = [
  {
    id: 'support',
    label: 'Customer support',
    queue: 'Support desk',
    sla: 'within 4 working hours',
    priority: 'P2',
    phrases: [
      ['issue with my order', 3], ['not working', 2], ['problem with', 2], ['warranty', 2],
      ['how do i', 2], ['how to use', 2], ['reset', 1], ['login', 1], ['password', 1],
      ['not received', 2], ['damaged', 2], ['refund', 3], ['replace', 2], ['help', 1]
    ]
  },
  {
    id: 'order',
    label: 'Order / delivery',
    queue: 'Order fulfilment',
    sla: 'within 2 working hours',
    priority: 'P2',
    phrases: [
      ['place an order', 3], ['new order', 3], ['order', 2], ['delivery', 2], ['shipment', 2],
      ['tracking', 2], ['courier', 2], ['stock', 1], ['bulk order', 3], ['dispatch', 2]
    ]
  },
  {
    id: 'pricing',
    label: 'Pricing / quotation',
    queue: 'Commercial desk',
    sla: 'within 1 working day',
    priority: 'P2',
    phrases: [
      ['price', 3], ['pricing', 3], ['quotation', 3], ['quote', 3], ['cost', 2],
      ['rate card', 2], ['charges', 2], ['how much', 3], ['per month', 2], ['subscription', 2]
    ]
  },
  {
    id: 'automation',
    label: 'Automation / systems enquiry',
    queue: 'Systems desk',
    sla: 'within 1 working day',
    priority: 'P2',
    phrases: [
      ['automate', 3], ['automation', 3], ['workflow', 2], ['integrate', 2], ['integration', 2],
      ['crm', 2], ['ai ', 2], ['ai-', 2], ['bot', 1], ['report', 1], ['spreadsheet', 2],
      ['manual process', 3], ['repeat work', 2]
    ]
  },
  {
    id: 'website',
    label: 'Website / digital product',
    queue: 'Delivery desk',
    sla: 'within 1 working day',
    priority: 'P3',
    phrases: [
      ['website', 4], ['web site', 4], ['landing page', 4], ['redesign', 3], ['portfolio', 2],
      ['e-commerce', 4], ['ecommerce', 4], ['store', 1], ['seo', 3], ['hosting', 2],
      ['appointment', 2], ['booking', 2], ['web app', 3], ['portal', 2]
    ]
  },
  {
    id: 'partnership',
    label: 'Partnership / collaboration',
    queue: 'Founder desk',
    sla: 'within 2 working days',
    priority: 'P3',
    phrases: [
      ['partnership', 3], ['partner', 2], ['collaborate', 3], ['collaboration', 3],
      ['joint', 2], ['refer', 1], ['agency', 2], ['reseller', 3], ['white label', 3]
    ]
  },
  {
    id: 'complaint',
    label: 'Complaint / escalation',
    queue: 'Founder desk (escalated)',
    sla: 'within 1 working hour',
    priority: 'P1',
    phrases: [
      ['complaint', 3], ['unacceptable', 3], ['third time', 3], ['very disappointed', 3],
      ['poor service', 3], ['worst', 2], ['terrible', 2], ['escalate', 3], ['legal', 2],
      ['not acceptable', 3], ['ignored', 2]
    ]
  },
  {
    id: 'hiring',
    label: 'Careers / hiring',
    queue: 'People desk',
    sla: 'within 3 working days',
    priority: 'P3',
    phrases: [
      ['job', 2], ['hiring', 3], ['career', 3], ['vacancy', 3], ['vacancies', 3],
      ['apply', 2], ['internship', 3], ['freelance', 2], ['portfolio', 1]
    ]
  },
  {
    id: 'general',
    label: 'General enquiry',
    queue: 'Front desk',
    sla: 'within 1 working day',
    priority: 'P3',
    phrases: [['enquiry', 1], ['enquiry', 1], ['question', 1], ['information', 1], ['details', 1]]
  }
];

export const URGENCY_MARKERS = [
  ['urgent', 3], ['asap', 3], ['as soon as possible', 3], ['immediately', 3], ['right now', 2],
  ['today', 2], ['by end of day', 3], ['eod', 2], ['deadline', 2], ['final notice', 3],
  ['last chance', 3], ['closing', 1], ['expiring', 2], ['expires', 2], ['time sensitive', 3],
  ['need this', 2], ['waiting for', 1], ['no reply', 2], ['second time', 2]
];

export const NEGATIVE_MARKERS = [
  ['unacceptable', 2], ['angry', 2], ['frustrated', 2], ['frustrating', 2], ['worst', 2],
  ['terrible', 2], ['poor', 1], ['ignored', 2], ['still waiting', 2], ['third time', 2]
];

export const TIMELINE_PATTERNS = [
  /\b(today|tonight|tomorrow|day after tomorrow)\b/i,
  /\bthis (week|weekend|month)\b/i,
  /\bnext (week|month|quarter|year)\b/i,
  /\b(end of (day|week|month)|eod|eow|eom)\b/i,
  /\bwithin (\d+)\s*(hours?|hrs?|days?|weeks?|months?)\b/i,
  /\bin (\d+)\s*(hours?|hrs?|days?|weeks?|months?)\b/i,
  /\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i,
  /\b(a|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(days?|weeks?|months?)\b/i
];

/* ------------------------------------------------------------------ helpers */

const lower = (value = '') => String(value).toLowerCase();

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function findPhrases(text, phrases) {
  const found = [];
  for (const [phrase, weight] of phrases) {
    const hits = countOccurrences(text, phrase);
    if (hits > 0) found.push({ phrase, weight, hits, score: weight * Math.min(hits, 3) });
  }
  return found;
}

const TITLE_STOP = new Set(['hello', 'hi', 'hey', 'dear', 'sir', 'madam', 'team', 'good', 'morning', 'evening', 'please', 'thanks', 'thank', 'you']);

/** Words that end a name or company phrase. */
const BREAKERS = new Set([
  'and', 'but', 'so', 'because', 'from', 'at', 'with', 'for', 'who', 'which', 'that', 'need',
  'want', 'would', 'like', 'about', 'after', 'before', 'when', 'while', 'since', 'although',
  'though', 'however', 'we', 'i', 'my', 'our', 'your', 'is', 'was', 'am', 'are', 'it', 'this',
  'to', 'in', 'on', 'of', 'as', 'if', 'or', 'not', 'no', 'they', 'he', 'she', 'his', 'her',
  'their', 'work', 'works', 'working', 'looking', 'trying', 'hoping', 'there', 'here', 'then',
  'also', 'just', 'very', 'really', 'currently', 'recently', 'yesterday', 'today'
]);

const COMPANY_SUFFIX = /\b(pvt|private|ltd|limited|llc|inc|incorporated|llp|sons|traders|enterprises|solutions|services|group|company|co|industries|international|technologies|lab|labs|studio|agency|associates|consultant|consultants|hospital|clinic|school|academy|foundation|trust|hotel|restaurant|resort|factory|distributor|distributors|pharma|electronics|textile|textiles|mill|mills|properties|construction|developer|developers|bank|insurance)\b/i;

function titleCaseLocal(value) {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (COMPANY_SUFFIX.test(word) ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

/** Split a message into sentences so extractors never read across one. */
function splitSentences(text) {
  return String(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function cutAtBreaker(words) {
  const index = words.findIndex((word) => {
    const key = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!BREAKERS.has(key)) return false;
    if (key === 'and') {
      const next = (words[words.indexOf(word) + 1] || '').toLowerCase();
      if (next.includes('son')) return false;
    }
    return true;
  });
  return index > 0 ? words.slice(0, index) : words;
}

function cleanName(value) {
  if (!value) return null;
  const words = String(value)
    .replace(/[^\p{L}\p{M}\s.'-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return null;

  let kept = cutAtBreaker(words);
  kept = kept.filter((word) => !TITLE_STOP.has(word.toLowerCase().replace(/[.'-]/g, '')));
  if (!kept.length) return null;
  if (kept.length > 3) kept = kept.slice(0, 3);

  const name = kept.join(' ');
  if (name.length < 2 || name.length > 60) return null;
  return titleCaseLocal(name);
}

function cleanCompany(value) {
  if (!value) return null;
  const words = String(value)
    .replace(/[^\p{L}\p{M}\s.&'()-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return null;

  let kept = cutAtBreaker(words);
  kept = kept.filter((word) => !TITLE_STOP.has(word.toLowerCase().replace(/[.'()-]/g, '')));
  if (!kept.length) return null;

  const company = kept.join(' ').replace(/[.,]+$/, '').trim();
  if (company.length < 2 || company.length > 60) return null;
  if (TITLE_STOP.has(company.toLowerCase())) return null;

  const capitalised = company.split(' ').filter((word) => /^[A-ZÀ-ɏ]/.test(word)).length;
  const looksLikeACompany = COMPANY_SUFFIX.test(company) || capitalised >= 2 || /^[A-ZÀ-ɏ][a-zà-ɏ'’-]{2,}$/.test(company);
  if (!looksLikeACompany) return null;

  return titleCaseLocal(company);
}

/* ------------------------------------------------------------------ extractors */

export function extractContact(text) {
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]?\d{4}/);
  const whatsappMatch = text.match(/\b(?:whatsapp|wa)\b/i);
  const channel = emailMatch ? 'email' : phoneMatch ? (whatsappMatch ? 'whatsapp' : 'phone') : 'unknown';
  return {
    email: emailMatch ? emailMatch[0].toLowerCase() : null,
    phone: phoneMatch ? phoneMatch[0].trim() : null,
    channel
  };
}

export function extractName(text) {
  const patterns = [
    /\b(?:my name is|i am|i'm|this is|myself|regards|regard|sincerely|mr|mrs|ms|dr)\.?\s+([A-Za-zÀ-ɏ][A-Za-zÀ-ɏ' .-]{1,40})/i,
    /\bname\s*[:\-]\s*([A-Za-zÀ-ɏ][A-Za-zÀ-ɏ' .-]{1,40})/i
  ];

  for (const sentence of splitSentences(text)) {
    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (!match) continue;
      const name = cleanName(match[1]);
      if (name) return name;
    }
  }

  const standalone = String(text).match(/^\s*([A-ZÀ-ɏ][a-zà-ɏ'’-]{1,20}(?:\s+[A-ZÀ-ɏ][a-zà-ɏ'’-]{1,20}){0,2})\s*$/m);
  if (standalone) {
    const name = cleanName(standalone[1]);
    if (name) return name;
  }
  return null;
}

export function extractBusiness(text) {
  const patterns = [
    /\b(?:from|at|representing|working at|we are|we're|i work at|i'm from)\s+([A-Za-zÀ-ɏ0-9][A-Za-zÀ-ɏ0-9&'.,()\s-]{1,50})/i,
    /\b([A-ZÀ-ɏ][A-Za-zÀ-ɏ0-9&'.-]+(?:\s+[A-ZÀ-ɏ][A-Za-zÀ-ɏ0-9&'.-]+){0,3}\s+(?:Pvt\.?\s*Ltd\.?|Ltd\.?|Limited|LLC|Inc\.?|LLP|Traders|Enterprises|Solutions|Services|Group|Industries|Company|Co\.?))\b/
  ];

  for (const sentence of splitSentences(text)) {
    for (const pattern of patterns) {
      const match = sentence.match(pattern);
      if (!match) continue;
      const company = cleanCompany(match[1]);
      if (company && !/^(we|i|it|they|he|she)$/i.test(company)) return company;
    }
  }
  return null;
}

export function extractOrderRef(text) {
  const patterns = [
    /\b(?:order|ord|ref|reference|ticket|invoice|job|batch|case|lead)\s*(?:no\.?|number|id|#)?\s*[:#-]?\s*([A-Z]{0,4}[-_]?\d{3,10}[A-Z0-9-]*)\b/i,
    /\b#\s*([A-Z]{1,6}[-_]?\d{3,10})\b/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(/[_-]+$/, '').toUpperCase();
  }
  return null;
}

export function extractBudget(text) {
  const match = text.match(/(?<![\w])(PKR|Rs\.?|Rs|₨|USD|\$|EUR|€|AED)\s?([\d,]+(?:\.\d+)?)\s?(k|m|million|thousand|lakh|lac)?(?![a-z])/i);
  if (!match) return null;
  const currencyRaw = match[1].toUpperCase().replace(/\./g, '');
  const currency = currencyRaw.startsWith('PKR') || currencyRaw === 'RS' || currencyRaw === '₨'
    ? 'PKR' : currencyRaw === 'USD' || currencyRaw === '$' ? 'USD'
      : currencyRaw === 'EUR' || currencyRaw === '€' ? 'EUR' : currencyRaw;
  let value = parseFloat(match[2].replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;
  const scale = (match[3] || '').toLowerCase();
  if (scale === 'k' || scale === 'thousand') value *= 1_000;
  else if (scale === 'm' || scale === 'million' || scale === 'lakh' || scale === 'lac') value *= 1_000_000;
  return { value, currency, raw: match[0].trim() };
}

export function extractQuantity(text) {
  const match = text.match(/\b(\d{1,6})\s*(units?|pieces?|pcs|boxes?|cartons?|items?|sets?|pairs?|kg|kgs?|litres?|liters?|litre|liter)\b/i);
  if (!match) return null;
  return { amount: parseInt(match[1], 10), unit: match[2].toLowerCase() };
}

export function extractTimeline(text) {
  for (const pattern of TIMELINE_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}


function scoreIntents(text) {
  const scored = INTENTS.map((intent) => {
    const found = findPhrases(text, intent.phrases);
    const score = found.reduce((sum, f) => sum + f.score, 0);
    return { id: intent.id, label: intent.label, score, matched: found.map((f) => f.phrase) };
  });
  scored.sort((a, b) => b.score - a.score);
  const total = scored.reduce((sum, s) => sum + s.score, 0);
  return scored.map((s) => ({
    ...s,
    confidence: total ? Math.min(0.98, s.score / total) : 0
  }));
}

function scoreUrgency(text) {
  const markers = findPhrases(text, URGENCY_MARKERS);
  const negative = findPhrases(text, NEGATIVE_MARKERS);
  const score = markers.reduce((sum, m) => sum + m.weight, 0) + negative.reduce((sum, m) => sum + m.weight, 0);
  const reasons = [
    ...markers.map((m) => `urgency phrase "${m.phrase}"`),
    ...negative.map((m) => `escalation signal "${m.phrase}"`)
  ];
  let level = 'low';
  if (score >= 5) level = 'high';
  else if (score >= 2) level = 'medium';
  return { level, score, reasons, markers: markers.map((m) => m.phrase) };
}

function scoreQuality(text, fields) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 2);
  const expected = ['name', 'business', 'contact', 'timeline', 'budget'];
  const present = expected.filter((key) => {
    if (key === 'name') return Boolean(fields.name);
    if (key === 'business') return Boolean(fields.business);
    if (key === 'contact') return Boolean(fields.email || fields.phone);
    if (key === 'timeline') return Boolean(fields.timeline);
    if (key === 'budget') return Boolean(fields.budget);
    return false;
  });
  const completeness = present.length / expected.length;
  const lengthScore = words.length >= 25 ? 1 : words.length >= 10 ? 0.7 : words.length >= 4 ? 0.45 : 0.2;
  const structureScore = Math.min(1, sentences.length / 2);
  const score = Math.round((completeness * 0.55 + lengthScore * 0.3 + structureScore * 0.15) * 100);
  const flags = [];
  if (words.length < 8) flags.push('Very short message — confirm intent with the sender.');
  if (!fields.email && !fields.phone) flags.push('No reply channel found — the record cannot be actioned yet.');
  if (!fields.timeline) flags.push('No timeline mentioned — chase a deadline before quoting.');
  return { score, completeness, clarity: lengthScore, flags, wordCount: words.length, sentenceCount: sentences.length };
}

function buildGaps(fields, intentId) {
  const gaps = [];
  if (!fields.name) gaps.push({ field: 'name', label: 'Sender name', severity: 'medium', question: 'Could you confirm your name so we address you correctly?' });
  if (!fields.business) gaps.push({ field: 'business', label: 'Business / company', severity: 'medium', question: 'Which business or team are you contacting us for?' });
  if (!fields.email && !fields.phone) gaps.push({ field: 'contact', label: 'Reply channel', severity: 'high', question: 'What is the best email or number to reply to?' });
  if (!fields.timeline) gaps.push({ field: 'timeline', label: 'Timeline', severity: 'medium', question: 'What is the deadline or timeframe you are working to?' });
  if (!fields.budget) gaps.push({ field: 'budget', label: 'Budget / range', severity: 'low', question: 'Do you have a budget range in mind, so we quote the right option?' });
  if (intentId === 'order' && !fields.orderRef) gaps.push({ field: 'orderRef', label: 'Order reference', severity: 'medium', question: 'Can you share the order or reference number?' });
  if (intentId === 'support' && !fields.orderRef) gaps.push({ field: 'orderRef', label: 'Account / order reference', severity: 'low', question: 'Which order or account is this about?' });
  return gaps;
}

function buildDraft({ fields, intent, urgency, gaps, timeline }) {
  const greeting = fields.name ? `Hi ${fields.name.split(' ')[0]},` : 'Hi,';
  const ref = fields.orderRef ? ` (reference ${fields.orderRef})` : '';
  const subjectPrefix = {
    complaint: 'Escalation received',
    order: 'Your order enquiry',
    pricing: 'Your pricing request',
    support: 'Your support request',
    automation: 'Your systems enquiry',
    website: 'Your website enquiry',
    partnership: 'Partnership enquiry',
    hiring: 'Careers enquiry',
    general: 'Your enquiry'
  }[intent.id] || 'Your enquiry';

  const openers = {
    complaint: 'Thank you for flagging this, and I am sorry it reached this point. I have read your message in full and it is with the founder directly.',
    order: 'Thanks for your order enquiry. I have logged it with the fulfilment desk',
    pricing: 'Thanks for asking about pricing. I have passed this to the commercial desk',
    support: 'Thanks for getting in touch about this. I have passed it to the support desk',
    automation: 'Thanks for the detail. This is exactly the kind of operational problem we work on, and it is with the systems desk',
    website: 'Thanks for reaching out about a website or digital product. It is with the delivery desk',
    partnership: 'Thanks for thinking of us. This is with the founder directly',
    hiring: 'Thanks for your interest. I have forwarded this to the people desk',
    general: 'Thanks for getting in touch. Your message is with the front desk'
  }[intent.id] || 'Thanks for getting in touch';

  const need = [];
  if (fields.timeline) need.push(`You mentioned ${timeline.toLowerCase()}, and we will work to that.`);
  if (fields.budget) need.push(`Noting the ${fields.budget.raw} range you mentioned, so the options we send are realistic.`);
  if (urgency.level === 'high') need.push('We are treating this as urgent and have pulled it forward.');

  const asks = gaps.filter((g) => g.severity !== 'low').slice(0, 2).map((g) => g.question);

  const body = [
    `${greeting} ${openers}${ref}.`,
    fields.topics?.length ? `I have noted the key points: ${fields.topics.join(', ')}.` : null,
    need.length ? need.join(' ') : null,
    asks.length ? `To move this forward, ${asks.join(' ')}` : null,
    'If it is easier, reply to this message or send a WhatsApp to +92 319 0091457 and we will pick it up there.',
    'Best regards,\nTRL — The Right Lifestyle'
  ].filter(Boolean).join('\n\n');

  const nextStep = {
    complaint: 'Founder reviews the escalation personally and responds within 1 working hour.',
    order: 'Fulfilment desk confirms stock and delivery window.',
    pricing: 'Commercial desk returns a written, scoped quotation.',
    support: 'Support desk reproduces the issue and proposes a fix path.',
    automation: 'Systems desk runs a short discovery call to map the workflow.',
    website: 'Delivery desk sends a scope, timeline and fixed quote.',
    partnership: 'Founder reviews fit and replies with a clear next step.',
    hiring: 'People desk confirms current openings and the process.',
    general: 'Front desk routes the message to the right discipline.'
  }[intent.id];

  return { subject: `${subjectPrefix}${ref ? ` ${fields.orderRef}` : ''}`, body, nextStep };
}

function summarise({ fields, intent, urgency }) {
  const who = fields.business || fields.name || 'Unidentified sender';
  const what = intent.label.toLowerCase();
  const when = fields.timeline ? `, timeline ${fields.timeline.toLowerCase()}` : '';
  const urgent = urgency.level === 'high' ? ' [URGENT]' : urgency.level === 'medium' ? ' [time-sensitive]' : '';
  return `${who} — ${what}${when}${urgent}`;
}

/* ------------------------------------------------------------------ public API */

/**
 * Triage a raw enquiry message.
 * @param {string} rawMessage
 * @param {{source?:string, receivedAt?:string}} [meta]
 */
export function triageEnquiry(rawMessage, meta = {}) {
  const text = String(rawMessage ?? '').trim();
  const normalised = lower(text).replace(/\s+/g, ' ');

  if (!text) {
    return {
      version: ENGINE_VERSION,
      receivedAt: meta.receivedAt || new Date().toISOString(),
      source: meta.source || 'unknown',
      empty: true,
      sender: { name: null, business: null, email: null, phone: null, channel: 'unknown' },
      intent: { id: 'general', label: 'General enquiry', confidence: 0, queue: 'Front desk', sla: 'within 1 working day', alternatives: [] },
      urgency: { level: 'low', score: 0, reasons: [] },
      entities: { orderRef: null, budget: null, quantity: null, timeline: null, topics: [], location: null },
      quality: { score: 0, completeness: 0, clarity: 0, flags: ['Empty message received.'] },
      route: { team: 'Front desk', priority: 'P3', sla: 'within 1 working day', reason: 'No content to classify.' },
      draft: { subject: 'Empty enquiry', body: '', nextStep: 'Request the details of the enquiry.' },
      gaps: [{ field: 'message', label: 'Message body', severity: 'high', question: 'Could you describe what you need help with?' }],
      summary: 'Empty message — no action possible until details arrive.',
      signals: []
    };
  }

  const contact = extractContact(text);
  const name = extractName(text);
  const business = extractBusiness(text);
  const orderRef = extractOrderRef(text);
  const budget = extractBudget(text);
  const quantity = extractQuantity(text);
  const timeline = extractTimeline(text);

  const fields = { name, business, ...contact, orderRef, budget, quantity, timeline };

  const ranked = scoreIntents(normalised);
  const top = ranked[0];
  const intentDef = INTENTS.find((i) => i.id === top.id) || INTENTS[INTENTS.length - 1];
  const confidence = top.score === 0 ? 0.2 : Math.max(0.35, Math.min(0.97, top.confidence));

  const urgency = scoreUrgency(normalised);
  const quality = scoreQuality(text, fields);

  const intentId = urgency.level === 'high' && top.id === 'support' ? 'complaint' : top.id;
  const intent = INTENTS.find((i) => i.id === intentId);
  const confidenceAdjusted = intentId === top.id ? confidence : Math.max(0.4, confidence);

  const topics = Array.from(new Set([
    ...ranked.filter((r) => r.id === intent.id).flatMap((r) => r.matched),
    ...urgency.markers
  ])).slice(0, 6);
  fields.topics = topics;

  const gaps = buildGaps(fields, intentId);
  const draft = buildDraft({ fields, intent, urgency, gaps, timeline });

  const priority = urgency.level === 'high' ? 'P1' : intent.priority;
  const team = urgency.level === 'high' ? 'Front desk (priority routing)' : intent.queue;
  const sla = urgency.level === 'high' ? 'within 1 working hour' : intent.sla;

  const signals = [];
  if (name) signals.push({ type: 'name', value: name, matched: 'name pattern' });
  if (business) signals.push({ type: 'business', value: business, matched: 'company pattern' });
  if (contact.email) signals.push({ type: 'email', value: contact.email, matched: 'email pattern' });
  if (contact.phone) signals.push({ type: 'phone', value: contact.phone, matched: 'phone pattern' });
  if (orderRef) signals.push({ type: 'orderRef', value: orderRef, matched: 'reference pattern' });
  if (budget) signals.push({ type: 'budget', value: budget.raw, matched: 'currency pattern' });
  if (quantity) signals.push({ type: 'quantity', value: `${quantity.amount} ${quantity.unit}`, matched: 'quantity pattern' });
  if (timeline) signals.push({ type: 'timeline', value: timeline, matched: 'deadline pattern' });
  for (const alt of ranked.slice(1, 3)) {
    if (alt.score > 0) signals.push({ type: 'intent-signal', value: alt.label, matched: alt.matched.join(', ') });
  }

  return {
    version: ENGINE_VERSION,
    receivedAt: meta.receivedAt || new Date().toISOString(),
    source: meta.source || 'unknown',
    empty: false,
    sender: {
      name,
      business,
      email: contact.email,
      phone: contact.phone,
      channel: contact.channel
    },
    intent: {
      id: intent.id,
      label: intent.label,
      confidence: Number(confidenceAdjusted.toFixed(2)),
      queue: intent.queue,
      sla: intent.sla,
      alternatives: ranked
        .filter((r) => r.score > 0 && r.id !== intent.id)
        .slice(0, 3)
        .map((r) => ({ id: r.id, label: r.label, score: r.score, confidence: Number(r.confidence.toFixed(2)) }))
    },
    urgency: {
      level: urgency.level,
      score: urgency.score,
      reasons: urgency.reasons,
      markers: urgency.markers
    },
    entities: {
      orderRef,
      budget,
      quantity,
      timeline,
      topics,
      location: null
    },
    quality,
    route: {
      team,
      priority,
      sla,
      reason: `Classified as ${intent.label.toLowerCase()} (confidence ${(confidenceAdjusted * 100).toFixed(0)}%) with ${urgency.level} urgency.`
    },
    draft,
    gaps,
    summary: summarise({ fields, intent, urgency }),
    signals
  };
}

/** Sample messages used across the site and the Console demo. */
export const SAMPLE_ENQUIRIES = [
  {
    label: 'Urgent order',
    text: `Hi, my name is Ayesha Noor and I work at Gulberg Foods (Pvt) Ltd. I placed an order this morning, reference #ORD-4471, for 40 boxes of packaging film, and it still has not been dispatched. I need it before Friday. My number is +92 300 1234567. Please sort this out today.`
  },
  {
    label: 'Automation enquiry',
    text: `Hello, I am Bilal from Sattar Textiles. We receive around 300 WhatsApp enquiries every day and someone types the details into a spreadsheet by hand. I want to automate enquiry routing. Budget is around PKR 250,000. We want to start within 6 weeks.`
  },
  {
    label: 'Website quote',
    text: `Good afternoon. This is Sana from Crescent Clinics. We are looking for a new website with an appointment booking flow, plus a way to send lab reports to patients. Could you share a quotation and tell me how long it takes? You can reach me on 0300 9876543.`
  },
  {
    label: 'Escalation',
    text: `I am Farhan from Metro Dealership and this is the third time I am contacting you about the same invoice. The service is unacceptable and I want this escalated to your manager today. Order #INV-99201, PKR 84,000. Nobody has replied.`
  }
];
