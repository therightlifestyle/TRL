/**
 * TRL — The Right Lifestyle
 * server/src/security.mjs — headers, CORS and rate limiting.
 */

export function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
}

export function applyCors(req, res, { allowedOrigins = [], allowCredentials = false } = {}) {
  const origin = req.headers.origin;
  if (!origin) return;
  const allowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins.includes('*') ? '*' : origin);
    res.setHeader('Vary', 'Origin');
    if (allowCredentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}

/** Fixed-window rate limiter, keyed by client IP. */
export function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  const buckets = new Map();

  return function check(key = 'global') {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: max - 1, resetAt: now + windowMs };
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
    }
    return { allowed: true, remaining: max - bucket.count, resetAt: bucket.resetAt };
  };
}

export function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
