const { test } = require('node:test');
const assert = require('node:assert');

const {
  parseUssdText,
  normalizePhone,
  phoneVariants,
  handleUssd,
} = require('../services/ussd.service');
const {
  validateMutation,
  isValidClientId,
  normalizeClientId,
} = require('../services/sync.service');

const prices = [
  { cropName: 'Mahindi', pricePerUnit: 800, unit: 'kg', currency: 'TZS', district: 'Mpanda' },
  { cropName: 'Mpunga', pricePerUnit: 2600, unit: 'kg', currency: 'TZS', district: 'Sumbawanga' },
];

const deps = {
  listPrices: async () => prices,
  getUserByPhone: async (phone) => (phone === '+255712345678'
    ? { name: 'Amina', role: 'farmer', district: 'Mpanda' }
    : null),
  supportPhone: '0800 111 222',
};

test('parseUssdText splits cumulative gateway input', () => {
  assert.deepStrictEqual(parseUssdText('1*2'), ['1', '2']);
  assert.deepStrictEqual(parseUssdText(''), []);
  assert.deepStrictEqual(parseUssdText(' 1 ** 3 '), ['1', '3']);
});

test('phone variants cover local, national and international formats', () => {
  assert.strictEqual(normalizePhone('0712345678'), '+255712345678');
  assert.strictEqual(normalizePhone('255712345678'), '+255712345678');
  assert.strictEqual(normalizePhone('712345678'), '+255712345678');
  assert.strictEqual(normalizePhone(''), '');
  assert.ok(phoneVariants('0712345678').includes('+255712345678'));
  assert.ok(phoneVariants('0712345678').includes('0712345678'));
});

test('handleUssd shows the main menu for an empty session', async () => {
  const result = await handleUssd({ text: '', phone: '', deps });
  assert.strictEqual(result.end, false);
  assert.match(result.body, /Karibu Katavi E-Kilimo/);
});

test('handleUssd lists crops then answers with the picked price', async () => {
  const menu = await handleUssd({ text: '1', phone: '0712345678', deps });
  assert.strictEqual(menu.end, false);
  assert.match(menu.body, /1\. Mahindi/);
  assert.match(menu.body, /2\. Mpunga/);

  const price = await handleUssd({ text: '1*2', phone: '0712345678', deps });
  assert.strictEqual(price.end, true);
  assert.match(price.body, /Mpunga: 2600 TZS\/kg/);

  const missing = await handleUssd({ text: '1*9', phone: '0712345678', deps });
  assert.strictEqual(missing.end, true);
  assert.match(missing.body, /si sahihi/);
});

test('handleUssd answers account questions only for registered numbers', async () => {
  const known = await handleUssd({ text: '2', phone: '0712345678', deps });
  assert.strictEqual(known.end, true);
  assert.match(known.body, /Amina/);
  assert.match(known.body, /farmer/);

  const unknown = await handleUssd({ text: '2', phone: '0655000000', deps });
  assert.strictEqual(unknown.end, true);
  assert.match(unknown.body, /haijasajiliwa/);
});

test('handleUssd ends on 0 and gives support details on 3', async () => {
  const exit = await handleUssd({ text: '0', phone: '0712345678', deps });
  assert.strictEqual(exit.end, true);

  const support = await handleUssd({ text: '3', phone: '0712345678', deps });
  assert.strictEqual(support.end, true);
  assert.match(support.body, /0800 111 222/);

  const invalid = await handleUssd({ text: '9', phone: '0712345678', deps });
  assert.strictEqual(invalid.end, false);
});

test('handleUssd copes with an empty price list', async () => {
  const result = await handleUssd({
    text: '1',
    phone: '0712345678',
    deps: { ...deps, listPrices: async () => [] },
  });
  assert.strictEqual(result.end, true);
  assert.match(result.body, /Hakuna bei/);
});

test('validateMutation normalizes offline expenses', () => {
  const valid = validateMutation('expense', { category: 'labor', amount: '12000', description: 'Kupalilia' });
  assert.strictEqual(valid.ok, true);
  assert.strictEqual(valid.value.amount, 12000);
  assert.strictEqual(valid.value.category, 'labor');

  const fallback = validateMutation('expense', { category: 'unknown', amount: 500 });
  assert.strictEqual(fallback.value.category, 'other');

  assert.strictEqual(validateMutation('expense', { amount: 0 }).ok, false);
  assert.strictEqual(validateMutation('expense', { amount: -5 }).ok, false);
});

test('validateMutation checks debts and rejects unknown kinds', () => {
  const debt = validateMutation('debt', { creditor: 'Mkulima SACCOS', principal: '250000', type: 'receivable' });
  assert.strictEqual(debt.ok, true);
  assert.strictEqual(debt.value.type, 'receivable');
  assert.strictEqual(debt.value.principal, 250000);

  assert.strictEqual(validateMutation('debt', { creditor: 'X', principal: 100 }).ok, false);
  assert.strictEqual(validateMutation('debt', { creditor: 'Bank', principal: 0 }).ok, false);
  assert.strictEqual(validateMutation('farm', {}).ok, false);
});

test('client ids are stable and bounded', () => {
  assert.strictEqual(normalizeClientId('  abc-123_XYZ '), 'abc-123_XYZ');
  assert.strictEqual(isValidClientId('abc-123_XYZ'), true);
  assert.strictEqual(isValidClientId('abc'), false);
  assert.strictEqual(isValidClientId('bad id with spaces'), false);
});
