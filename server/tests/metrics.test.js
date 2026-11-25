const { test } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');

const metrics = require('../services/metrics.service');
const { requestContext } = require('../middleware/requestContext');

const fakeReq = (overrides = {}) => ({
  method: 'GET',
  ip: '127.0.0.1',
  path: '/api/v1/orders',
  originalUrl: '/api/v1/orders?limit=5',
  get: () => '',
  ...overrides,
});

const fakeRes = (statusCode = 200) => {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  res.headers = {};
  res.setHeader = (key, value) => { res.headers[key] = value; };
  return res;
};

test('metrics aggregate requests per method/status and per route', () => {
  metrics.reset();
  metrics.observeRequest({ method: 'GET', route: '/api/v1/crops', status: 200, durationMs: 10 });
  metrics.observeRequest({ method: 'GET', route: '/api/v1/crops', status: 200, durationMs: 30 });
  metrics.observeRequest({ method: 'POST', route: '/api/v1/orders', status: 400, durationMs: 5 });

  const snap = metrics.snapshot();
  assert.strictEqual(snap.status['2xx'], 2);
  assert.strictEqual(snap.status['4xx'], 1);
  assert.strictEqual(snap.status['5xx'], 0);

  const crops = snap.slowest.find((row) => row.route === 'GET /api/v1/crops');
  assert.strictEqual(crops.count, 2);
  assert.strictEqual(crops.avgMs, 20);

  const getCounts = snap.requests.find((row) => row.key === 'http_requests_total{method="GET",status="2xx"}');
  assert.strictEqual(getCounts.value, 2);
});

test('snapshot exposes uptime, memory and environment', () => {
  metrics.reset();
  const snap = metrics.snapshot();
  assert.strictEqual(typeof snap.uptimeSeconds, 'number');
  assert.ok(snap.uptimeSeconds >= 0);
  assert.strictEqual(typeof snap.memory.rssMb, 'number');
  assert.ok(snap.memory.rssMb > 0);
  assert.strictEqual(typeof snap.environment, 'string');
});

test('requestContext issues an id, echoes it and records the request', () => {
  metrics.reset();
  const req = fakeReq();
  const res = fakeRes(200);
  let nextCalled = false;
  requestContext(req, res, () => { nextCalled = true; });

  assert.ok(nextCalled);
  assert.ok(req.id && req.id.length >= 8);
  assert.strictEqual(res.headers['X-Request-Id'], req.id);

  res.emit('finish');
  const snap = metrics.snapshot();
  assert.strictEqual(snap.status['2xx'], 1);
  assert.ok(snap.slowest.some((row) => row.route === 'GET /api/v1/orders'));
});

test('requestContext keeps a safe client request id and drops unsafe ones', () => {
  const safe = fakeReq({ get: () => 'order-check-123' });
  requestContext(safe, fakeRes(), () => {});

  const unsafe = fakeReq({ get: () => 'bad id with spaces and a very long tail' });
  requestContext(unsafe, fakeRes(), () => {});

  assert.strictEqual(safe.id, 'order-check-123');
  assert.notStrictEqual(unsafe.id, 'bad id with spaces and a very long tail');
  assert.ok(unsafe.id.length >= 8);
});

test('health checks are recorded in metrics but never logged as access lines', () => {
  metrics.reset();
  const logged = [];
  const originalLog = console.log;
  console.log = (...args) => logged.push(args);
  try {
    const req = fakeReq({ path: '/api/health', originalUrl: '/api/health' });
    const res = fakeRes(200);
    requestContext(req, res, () => {});
    res.emit('finish');
  } finally {
    console.log = originalLog;
  }

  assert.strictEqual(logged.length, 0);
  assert.strictEqual(metrics.snapshot().status['2xx'], 1);
});
