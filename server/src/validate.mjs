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
