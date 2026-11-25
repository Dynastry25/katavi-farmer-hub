const { test } = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const mongoose = require('mongoose');

const AuditLog = require('../models/AuditLog');
const { audit, auditRoute } = require('../services/audit.service');

const stubWriter = () => {
  const calls = [];
  AuditLog.create = async (doc) => {
    calls.push(doc);
    return doc;
  };
  return calls;
};

const tick = () => new Promise((resolve) => setImmediate(resolve));

const fakeReq = (overrides = {}) => ({
  ip: '127.0.0.1',
  params: {},
  get: () => 'node-test-agent',
  ...overrides,
});

const fakeRes = (statusCode = 200) => {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  return res;
};

test('audit records the signed-in actor, target and request context', async () => {
  const calls = stubWriter();
  const userId = new mongoose.Types.ObjectId();
  const targetId = new mongoose.Types.ObjectId();

  audit(fakeReq({ user: { _id: userId, name: 'Asha', role: 'farmer' } }), {
    action: 'create_order',
    category: 'order',
    targetType: 'Order',
    targetId,
    details: { quantity: 10 },
  });
  await tick();

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(String(calls[0].user), String(userId));
  assert.strictEqual(calls[0].userName, 'Asha');
  assert.strictEqual(calls[0].userRole, 'farmer');
  assert.strictEqual(calls[0].action, 'create_order');
  assert.strictEqual(calls[0].category, 'order');
  assert.strictEqual(String(calls[0].targetId), String(targetId));
  assert.deepStrictEqual(calls[0].details, { quantity: 10 });
  assert.strictEqual(calls[0].ipAddress, '127.0.0.1');
  assert.strictEqual(calls[0].userAgent, 'node-test-agent');
});

test('audit supports system actors such as the payment gateway', async () => {
  const calls = stubWriter();

  audit(fakeReq(), {
    action: 'payment_callback',
    category: 'payment',
    actorName: 'payment-gateway',
    actorRole: 'system',
  });
  await tick();

  assert.strictEqual(calls[0].user, null);
  assert.strictEqual(calls[0].userName, 'payment-gateway');
  assert.strictEqual(calls[0].userRole, 'system');
});

test('auditRoute logs only successful responses', async () => {
  const calls = stubWriter();
  const orderId = new mongoose.Types.ObjectId();
  const middleware = auditRoute({ action: 'approve_order', category: 'order', targetType: 'Order' });

  const okRes = fakeRes(200);
  middleware(fakeReq({ params: { id: String(orderId) } }), okRes, () => {});
  okRes.emit('finish');
  await tick();

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(String(calls[0].targetId), String(orderId));

  const badRes = fakeRes(400);
  middleware(fakeReq({ params: { id: String(orderId) } }), badRes, () => {});
  badRes.emit('finish');
  await tick();

  assert.strictEqual(calls.length, 1);
});

test('auditRoute ignores non-ObjectId targets such as payment transaction ids', async () => {
  const calls = stubWriter();
  const middleware = auditRoute({ action: 'confirm_payment', category: 'payment', targetType: 'Order' });

  const res = fakeRes(200);
  middleware(fakeReq({ params: { id: 'TXABC123' } }), res, () => {});
  res.emit('finish');
  await tick();

  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].targetId, undefined);
});
