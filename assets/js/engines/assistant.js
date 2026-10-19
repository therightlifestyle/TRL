/**
 * TRL — The Right Lifestyle
 * engines/assistant.js — retrieval assistant over the TRL knowledge base.
 *
 * Fully local and deterministic: it scores the knowledge base with a simple
 * weighted term model and composes an answer from the winning entries. No
 * external calls, no data leaves the browser, and every answer cites the
 * source entry it came from.
 */

export const ENGINE_VERSION = '1.1.0';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does', 'for', 'from',
  'get', 'has', 'have', 'how', 'i', 'if', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or',
  'our', 'so', 'that', 'the', 'their', 'them', 'then', 'there', 'they', 'this', 'to', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would',
  'you', 'your', 'am', 'any', 'about', 'need', 'want', 'please', 'help', 'tell', 'know',
  'much', 'many', 'just', 'also', 'more', 'most', 'some', 'than', 'then'
]);

export function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9₨$€£%+\s.-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function scoreEntry(queryTokens, entry) {
  let score = 0;
  const haystack = `${entry.title} ${entry.keywords.join(' ')} ${entry.tags.join(' ')}`.toLowerCase();
  const body = String(entry.answer).toLowerCase();

  for (const token of queryTokens) {
    if (entry.keywords.some((kw) => kw === token)) score += 6;
    else if (entry.keywords.some((kw) => kw.includes(token) || token.includes(kw))) score += 3.5;
    if (haystack.includes(token)) score += 1.2;
    if (body.includes(token)) score += 0.8;
  }
  if (queryTokens.length && entry.keywords.some((kw) => queryTokens.includes(kw))) score += 2.5;
  return score;
}

/**
 * Ask the knowledge base.
 * @param {string} question
 * @param {Array} knowledge  knowledge base entries
 * @param {{limit?:number, threshold?:number}} [options]
 */
export function ask(question, knowledge = [], options = {}) {
  const { limit = 3, threshold = 5 } = options;
  const queryTokens = tokenize(question);

  if (!queryTokens.length) {
    return {
      version: ENGINE_VERSION,
      question,
      answer: 'Ask me about TRL services, pricing, the working process, timelines or how an engagement starts.',
      confidence: 0,
      sources: [],
      suggestions: defaultSuggestions(knowledge)
    };
  }

  const scored = knowledge
    .map((entry) => ({ entry, score: scoreEntry(queryTokens, entry) }))
    .filter((scoredEntry) => scoredEntry.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < threshold) {
    return {
      version: ENGINE_VERSION,
      question,
      answer:
        'I do not have a confident answer for that yet — and I would rather say so than guess. '
        + 'I can speak to: the seven service disciplines, pricing and the fixed-fee audit, the four-stage process, '
        + 'turnaround times, what you own at handover, or how to start a conversation.',
      confidence: 0.2,
      sources: [],
      suggestions: defaultSuggestions(knowledge)
    };
  }

  const chosen = scored.slice(0, limit);
  const body = chosen
    .filter((item) => item.score >= best.score * 0.55)
    .map((item) => item.entry.answer)
    .join('\n\n');

  const confidence = Math.max(0.3, Math.min(0.98, best.score / (best.score + 6)));

  return {
    version: ENGINE_VERSION,
    question,
    answer: body,
    confidence: Number(confidence.toFixed(2)),
    sources: chosen.map((item) => ({
      id: item.entry.id,
      title: item.entry.title,
      url: item.entry.url || null,
      score: Math.round(item.score)
    })),
    suggestions: chosen[0].entry.followUps?.length
      ? chosen[0].entry.followUps
      : defaultSuggestions(knowledge)
  };
}

function defaultSuggestions(knowledge = []) {
  const defaults = [
    'What does the fixed-fee audit include?',
    'How long does a typical engagement take?',
    'Who owns the work at handover?',
    'What does TRL not do?'
  ];
  const fromKb = knowledge.flatMap((entry) => entry.followUps || []).slice(0, 4);
  return Array.from(new Set([...fromKb, ...defaults])).slice(0, 4);
}

/** Suggested starter questions shown under the chat input. */
export function starterQuestions(knowledge = []) {
  const starters = knowledge
    .filter((entry) => entry.starter)
    .map((entry) => entry.question || entry.title);
  return starters.length
    ? starters
    : [
        'What services does TRL provide?',
        'How much does the audit cost?',
        'How does an engagement start?',
        'What do I own at handover?'
      ];
}
