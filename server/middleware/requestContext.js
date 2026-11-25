const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const metrics = require('../services/metrics.service');

const SAFE_ID = /^[\w.:-]{1,100}$/;
const HEALTH_PATHS = ['/api/health', '/health'];

// Gives every request a correlation id (accepted from the client when it looks
// safe), echoes it back for support, and writes one structured access line.
const requestContext = (req, res, next) => {
  const incoming = String(req.get('x-request-id') || '').trim();
  req.id = SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const path = String(req.originalUrl || '').split('?')[0];
    const route = req.route
      ? String(req.route.path || '')
      : (res.statusCode === 404 ? 'not-found' : path);

    metrics.observeRequest({
      method: req.method,
      route,
      status: res.statusCode,
      durationMs,
    });

    if (HEALTH_PATHS.includes(req.path)) return;

    const level = res.statusCode >= 500
      ? 'error'
      : res.statusCode >= 400
        ? 'warn'
        : 'info';
    logger[level]('request', {
      requestId: req.id,
      method: req.method,
      url: path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      userId: req.user?._id ? String(req.user._id) : undefined,
      ip: req.ip,
    });
  });

  next();
};

module.exports = { requestContext };
