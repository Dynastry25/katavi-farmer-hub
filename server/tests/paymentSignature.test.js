const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const mongoose = require('mongoose');

const { verifyCallbackSignature } = require('../services/paymentSignature.service');
const { paymentReference, refundReference } = require('../services/ledger.service');

const hmac = (secret, payload) =>
  'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');

test('accepts a valid HMAC signature over the raw body', () => {
  const rawBody = Buffer.from(JSON.stringify({ transactionId: 'TX1', status: 'paid' }));
  const result = verifyCallbackSignature({
    hmacSecret: 'whsec_test',
    legacySecret: 'legacy',
    legacyProvided: '',
    rawBody,
    body: { transactionId: 'TX1', status: 'paid' },
    signature: hmac('whsec_test', rawBody),
  });
  assert.deepStrictEqual(result, { ok: true, configured: true, method: 'hmac' });
});

test('rejects a tampered body or a wrong secret', () => {
  const rawBody = Buffer.from(JSON.stringify({ transactionId: 'TX1' }));
  const signature = hmac('whsec_test', rawBody);

  const wrongBody = verifyCallbackSignature({
    hmacSecret: 'whsec_test',
    rawBody: Buffer.from(JSON.stringify({ transactionId: 'TX2' })),
    body: {},
    signature,
  });
  assert.strictEqual(wrongBody.ok, false);

  const wrongSecret = verifyCallbackSignature({
    hmacSecret: 'other',
    rawBody,
    body: {},
    signature,
  });
  assert.strictEqual(wrongSecret.ok, false);
});

test('legacy shared secret works only while no HMAC secret is configured', () => {
  const legacy = (hmacSecret) => verifyCallbackSignature({
    hmacSecret,
    legacySecret: 'legacy-secret',
    legacyProvided: 'legacy-secret',
    rawBody: Buffer.from('{}'),
    body: {},
    signature: '',
  });

  assert.deepStrictEqual(legacy(''), { ok: true, configured: true, method: 'shared-secret' });
  assert.strictEqual(legacy('whsec_test').ok, false);
});

test('unconfigured callback returns configured:false', () => {
  const result = verifyCallbackSignature({
    hmacSecret: '',
    legacySecret: '',
    legacyProvided: 'anything',
    rawBody: Buffer.from('{}'),
    body: {},
    signature: '',
  });
  assert.deepStrictEqual(result, { ok: false, configured: false, method: '' });
});

test('ledger references are stable per order and transaction', () => {
  const orderId = new mongoose.Types.ObjectId();
  const params = { transactionId: 'TXABC', orderType: 'order', orderId };

  assert.strictEqual(
    paymentReference(params),
    `payment:TXABC:order:${orderId}`
  );
  assert.strictEqual(
    paymentReference(params),
    paymentReference(params),
    'the same capture must reuse one reference so posting stays idempotent'
  );
  assert.strictEqual(
    refundReference({ refundId: 'RF1', transactionId: 'TXABC', orderType: 'order', orderId }),
    `refund:RF1:order:${orderId}`
  );
  assert.strictEqual(
    refundReference({ refundId: '', transactionId: 'TXABC', orderType: 'input', orderId }),
    `refund:TXABC:input:${orderId}`
  );
});
