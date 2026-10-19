/**
 * TRL — The Right Lifestyle
 * server/src/logger.mjs — structured, dependency-free logging.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;

function emit(level, message, meta) {
  if (LEVELS[level] < threshold) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(meta && Object.keys(meta).length ? { meta } : {})
  };
  const out = process.env.LOG_FORMAT === 'pretty'
    ? `${line.ts} ${level.toUpperCase().padEnd(5)} ${line.msg}${meta ? ` ${JSON.stringify(meta)}` : ''}`
    : JSON.stringify(line);
  (level === 'error' ? process.stderr : process.stdout).write(`${out}\n`);
}

export const logger = {
  debug: (msg, meta) => emit('debug', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  error: (msg, meta) => emit('error', msg, meta)
};
