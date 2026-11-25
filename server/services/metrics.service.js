const logger = require('../utils/logger');

const startedAt = Date.now();
const counters = new Map();
const routes = new Map();
const statusBuckets = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };

// Cardinality guard: unmatched URLs (scanners, broken clients) must not grow
// the route table without bound.
const MAX_ROUTES = 300;

const ALERT_THRESHOLD = 10;
const ALERT_WINDOW_MS = 60 * 1000;
const ALERT_COOLDOWN_MS = 60 * 1000;
let recentErrors = [];
let lastAlertAt = 0;

const inc = (name, labels = {}, value = 1) => {
  const labelText = Object.entries(labels)
    .map(([key, label]) => `${key}="${label}"`)
    .join(',');
  const key = labelText ? `${name}{${labelText}}` : name;
  counters.set(key, (counters.get(key) || 0) + value);
};

// Optional external alerting: set ALERT_WEBHOOK_URL (Slack/Discord/generic).
// Failures are ignored so alerting can never take the API down.
const sendAlert = (payload) => {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((error) => {
    logger.warn('Alert webhook failed', { error: error.message });
  });
};

const checkErrorBurst = () => {
  const now = Date.now();
  recentErrors = recentErrors.filter((at) => now - at < ALERT_WINDOW_MS);
  if (recentErrors.length < ALERT_THRESHOLD) return;
  if (now - lastAlertAt < ALERT_COOLDOWN_MS) return;

  lastAlertAt = now;
  const payload = {
    text: `Katavi E-Kilimo: ${recentErrors.length} server errors in the last minute`,
    errorsLastMinute: recentErrors.length,
    time: new Date(now).toISOString(),
  };
  logger.error('Alert: error burst detected', payload);
  sendAlert(payload);
};

const observeRequest = ({ method = '', route = '', status = 0, durationMs = 0 }) => {
  const bucket = `${Math.floor(status / 100)}xx`;
  if (statusBuckets[bucket] !== undefined) statusBuckets[bucket] += 1;

  inc('http_requests_total', { method, status: bucket });

  const key = `${method} ${route}`;
  let stat = routes.get(key);
  if (!stat) {
    if (routes.size >= MAX_ROUTES) return;
    stat = { method, route, count: 0, totalMs: 0, maxMs: 0, errors: 0 };
    routes.set(key, stat);
  }
  stat.count += 1;
  stat.totalMs += durationMs;
  stat.maxMs = Math.max(stat.maxMs, durationMs);
  if (status >= 500) {
    stat.errors += 1;
    recentErrors.push(Date.now());
    checkErrorBurst();
  }
};

const round = (value) => Math.round(value * 10) / 10;

const snapshot = () => {
  const requestCounters = [...counters.entries()].map(([key, value]) => ({ key, value }));
  const slowest = [...routes.values()]
    .sort((a, b) => b.totalMs / b.count - a.totalMs / a.count)
    .slice(0, 10)
    .map((stat) => ({
      route: `${stat.method} ${stat.route}`,
      count: stat.count,
      avgMs: round(stat.totalMs / stat.count),
      maxMs: round(stat.maxMs),
      errors: stat.errors,
    }));

  const memory = process.memoryUsage();
  return {
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    status: statusBuckets,
    requests: requestCounters,
    slowest,
    memory: {
      rssMb: round(memory.rss / 1024 / 1024),
      heapUsedMb: round(memory.heapUsed / 1024 / 1024),
    },
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
  };
};

const reset = () => {
  counters.clear();
  routes.clear();
  Object.keys(statusBuckets).forEach((key) => { statusBuckets[key] = 0; });
  recentErrors = [];
};

module.exports = { inc, observeRequest, snapshot, reset };
