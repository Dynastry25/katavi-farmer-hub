const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 10;

const isUnsafeKey = (key) =>
  key.startsWith('$') || key.includes('.') || BLOCKED_KEYS.has(key);

const sanitizeValue = (value, depth = 0) => {
  if (depth > MAX_DEPTH) return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (value && typeof value === 'object') {
    const clean = {};
    let kept = false;
    for (const [key, item] of Object.entries(value)) {
      if (isUnsafeKey(key)) continue;
      const sanitized = sanitizeValue(item, depth + 1);
      if (sanitized !== undefined) {
        clean[key] = sanitized;
        kept = true;
      }
    }
    // An object that only carried operator keys is dropped entirely instead of
    // reaching Mongoose as a meaningless `{}` filter.
    if (!kept && Object.keys(value).length > 0) return undefined;
    return clean;
  }
  return value;
};

const MAX_QUERY_VALUE = 500;

// The query parser can hand back arrays (`?search=a&search=b`); routes expect a
// single scalar, so keep the first string and drop the rest.
const sanitizeQuery = (query = {}) => {
  const clean = {};
  for (const [key, value] of Object.entries(query)) {
    if (isUnsafeKey(key)) continue;
    if (typeof value === 'string') {
      clean[key] = value.slice(0, MAX_QUERY_VALUE);
    } else if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === 'string');
      if (typeof first === 'string') clean[key] = first.slice(0, MAX_QUERY_VALUE);
    }
  }
  return clean;
};

// Express 5 exposes `req.query` as a prototype getter, so it is replaced with an
// own property instead of assigned.
const setQuery = (req, value) => {
  Object.defineProperty(req, 'query', {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
};

// Strips operator keys ($ne, $gt, $where...) and dotted keys from every request
// payload. Server-built filters are never passed through here, so legitimate
// operators keep working while client input cannot inject query selectors.
const mongoSanitize = (req, res, next) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req.body = sanitizeValue(req.body) ?? {};
  }
  if (req.query && typeof req.query === 'object') {
    setQuery(req, sanitizeQuery(req.query));
  }
  if (req.params && typeof req.params === 'object') {
    for (const key of Object.keys(req.params)) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = req.params[key].slice(0, MAX_QUERY_VALUE);
      }
    }
  }
  next();
};

module.exports = { mongoSanitize, sanitizeValue, sanitizeQuery, isUnsafeKey };
