const { test } = require('node:test');
const assert = require('node:assert');

const { isDeliverableEmail, renderOtpEmail, sendOtpEmail } = require('../services/email.service');

test('isDeliverableEmail accepts real inboxes only', () => {
  assert.strictEqual(isDeliverableEmail('denis@example.co.tz'), true);
  assert.strictEqual(isDeliverableEmail('  Denis@Example.COM '), true);
  assert.strictEqual(isDeliverableEmail('255712345678@phone.katavi.tz'), false);
  assert.strictEqual(isDeliverableEmail('not-an-email'), false);
  assert.strictEqual(isDeliverableEmail(''), false);
  assert.strictEqual(isDeliverableEmail(null), false);
});

test('renderOtpEmail carries the code and purpose copy', () => {
  const register = renderOtpEmail({ code: '123456', purpose: 'register' });
  assert.match(register.subject, /usajili/);
  assert.match(register.html, /123456/);
  assert.match(register.text, /123456/);
  assert.match(register.text, /dakika 5/);

  const reset = renderOtpEmail({ code: '654321', purpose: 'reset', phone: '+255712345678' });
  assert.match(reset.subject, /nenosiri/);
  assert.match(reset.text, /\+255712345678/);

  const cleaned = renderOtpEmail({ code: '12 34-56', purpose: 'login' });
  assert.match(cleaned.text, /123456/);
  assert.doesNotMatch(cleaned.text, /12 34-56/);
});

test('sendOtpEmail mocks when Resend is not configured', async () => {
  const previous = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  try {
    const result = await sendOtpEmail({ to: 'denis@example.co.tz', code: '111222', purpose: 'login' });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.mock, true);
  } finally {
    if (previous !== undefined) process.env.RESEND_API_KEY = previous;
  }
});

test('sendOtpEmail skips placeholder addresses', async () => {
  const result = await sendOtpEmail({
    to: '255712345678@phone.katavi.tz',
    code: '111222',
    purpose: 'login',
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.skipped, true);
});
