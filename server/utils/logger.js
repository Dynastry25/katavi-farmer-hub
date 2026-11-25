const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const configured = String(process.env.LOG_LEVEL || '').toLowerCase();
const threshold = LEVELS[configured] || LEVELS.info;

const serialize = (fields) => {
  const out = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (value === undefined) continue;
    out[key] = value instanceof Error
      ? { name: value.name, message: value.message, stack: value.stack }
      : value;
  }
  return out;
};

// One JSON object per line so Render's log stream stays greppable by
// requestId, level or event name.
const write = (level, message, fields) => {
  if (LEVELS[level] < threshold) return;
  const line = {
    time: new Date().toISOString(),
    level,
    message,
    ...serialize(fields),
  };
  const target = level === 'error'
    ? console.error
    : level === 'warn'
      ? console.warn
      : console.log;
  target(JSON.stringify(line));
};

module.exports = {
  debug: (message, fields) => write('debug', message, fields),
  info: (message, fields) => write('info', message, fields),
  warn: (message, fields) => write('warn', message, fields),
  error: (message, fields) => write('error', message, fields),
};
