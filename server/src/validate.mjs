/**
 * TRL — The Right Lifestyle
 * server/src/validate.mjs — input validation and normalisation.
 */

export const LIMITS = {
  text: 8000,
  short: 200,
  email: 254,
  phone: 40,
  name: 120
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function asString(value, max = LIMITS.short) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
}

export function asEmail(value) {
  const email = asString(value, LIMITS.email).toLowerCase();
  return EMAIL_RE.test(email) ? email : '';
}

export function asPhone(value) {
  const phone = asString(value, LIMITS.phone);
  return /^[+()\d\s.-]{6,40}$/.test(phone) ? phone : '';
}

export function validateLead(body = {}) {
  const errors = [];
  const lead = {
    name: asString(body.name, LIMITS.name),
    business: asString(body.business, LIMITS.name),
    email: asEmail(body.email),
    phone: asPhone(body.phone),
    service: asString(body.service, 80),
    timeline: asString(body.timeline, 80),
    budget: asString(body.budget, 80),
    message: asString(body.message, LIMITS.text)
  };

  if (!lead.message || lead.message.length < 10) errors.push('message must be at least 10 characters');
  if (!lead.email && !lead.phone) errors.push('an email address or phone number is required');
  if (body.email && !lead.email) errors.push('email address is not valid');
  if (body.phone && !lead.phone) errors.push('phone number is not valid');

  return { valid: errors.length === 0, errors, lead };
}

export function validateTriage(body = {}) {
  const text = asString(body.text, LIMITS.text);
  if (!text) return { valid: false, errors: ['text is required'], text };
  if (text.length < 3) return { valid: false, errors: ['text is too short to classify'], text };
  return { valid: true, errors: [], text };
}

/** Search query: capped so a very long string cannot be used as a DoS vector. */
export function validateSearch(body = {}) {
  const q = asString(body.q ?? body.query ?? '', LIMITS.short);
  const limit = Math.min(50, Math.max(1, Number(body.limit) || 12));
  const group = asString(body.group, 24) || null;
  return { valid: true, errors: [], q, limit, group };
}

/** Assistant question. */
export function validateAsk(body = {}) {
  const question = asString(body.question ?? body.text ?? '', LIMITS.text);
  if (!question) return { valid: false, errors: ['question is required'], question };
  const limit = Math.min(10, Math.max(1, Number(body.limit) || 3));
  return { valid: true, errors: [], question, limit };
}

/** Opportunity-model input. Numbers are clamped, not rejected, so a rough
 *  estimate from a visitor still produces a usable result. */
export function validateRoi(body = {}) {
  const num = (value, fallback, min, max) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  };

  const tasks = Array.isArray(body.tasks) ? body.tasks.slice(0, 25) : [];
  const cleanTasks = tasks.map((task) => ({
    name: asString(task?.name, LIMITS.name) || 'Unnamed task',
    hours: num(task?.hours, 0, 0, 200),
    repetitiveness: num(task?.repetitiveness, 3, 1, 5),
    complexity: num(task?.complexity, 3, 1, 5),
    errorRate: num(task?.errorRate, 0.1, 0, 1)
  }));

  const input = {
    teamSize: num(body.teamSize, 4, 1, 5000),
    hoursPerWeek: num(body.hoursPerWeek, 20, 0, 400),
    hourlyCost: num(body.hourlyCost, 1200, 0, 1_000_000),
    errorRate: num(body.errorRate, 0.12, 0, 1),
    currency: asString(body.currency, 8) || 'PKR',
    tasks: cleanTasks
  };

  const errors = cleanTasks.length ? [] : ['at least one task is required'];
  return { valid: errors.length === 0, errors, input };
}

/** Scope-brief answers: a flat map of question id → answer. */
export function validateBrief(body = {}) {
  const source = body.answers && typeof body.answers === 'object' ? body.answers : body;
  const answers = {};
  for (const [key, value] of Object.entries(source)) {
    if (key === 'answers') continue;
    if (value === null || value === undefined) continue;
    answers[asString(key, 40)] = asString(value, LIMITS.text);
  }
  if (!Object.keys(answers).length) return { valid: false, errors: ['no answers supplied'], answers };
  return { valid: true, errors: [], answers };
}

export function validateNewsletter(body = {}) {
  const errors = [];
  const email = asEmail(body.email);
  if (!email) errors.push('a valid email address is required');
  return {
    valid: errors.length === 0,
    errors,
    subscriber: { email, topic: asString(body.topic, 80) || 'general' }
  };
}
