const { test } = require('node:test');
const assert = require('node:assert');

const { sanitizeValue, sanitizeQuery, isUnsafeKey } = require('../middleware/sanitize');
const { searchRegex, literalRegex, searchTerm, MAX_SEARCH_LENGTH } = require('../utils/safeRegex');
const { pagination, clampInt } = require('../utils/pagination');
const { assertPublicUrl, isPrivateIp } = require('../utils/safeUrl');

test('sanitizeValue drops operator, dotted and prototype keys', () => {
  const body = JSON.parse(`{
    "email": { "$ne": null },
    "profile.name": "x",
    "__proto__": { "polluted": true },
    "constructor": { "prototype": { "polluted": true } },
    "nested": { "$where": "sleep(1000)", "keep": "yes" },
    "list": [{ "$gt": 1, "price": 5 }]
  }`);
  const clean = sanitizeValue(body);
  assert.deepStrictEqual(clean, {
    nested: { keep: 'yes' },
    list: [{ price: 5 }],
  });
  assert.strictEqual({}.polluted, undefined);
});

test('sanitizeValue keeps scalars and stops at depth limit', () => {
  assert.strictEqual(sanitizeValue('hello'), 'hello');
  assert.strictEqual(sanitizeValue(42), 42);
  assert.strictEqual(sanitizeValue(null), null);

  let deep = { value: 'bottom' };
  for (let i = 0; i < 20; i += 1) deep = { child: deep, tag: `level${i}` };
  const clean = sanitizeValue(deep);
  assert.ok(clean);
  assert.ok(JSON.stringify(clean).length < JSON.stringify(deep).length);
});

test('sanitizeQuery keeps the first scalar and caps length', () => {
  const query = sanitizeQuery({
    search: ['first', 'second'],
    page: '2',
    $where: 'x',
    long: 'a'.repeat(900),
    object: { $ne: null },
  });
  assert.deepStrictEqual(query, {
    search: 'first',
    page: '2',
    long: 'a'.repeat(500),
  });
});

test('isUnsafeKey flags operators, dotted paths and prototype names', () => {
  assert.strictEqual(isUnsafeKey('$where'), true);
  assert.strictEqual(isUnsafeKey('farmer.name'), true);
  assert.strictEqual(isUnsafeKey('__proto__'), true);
  assert.strictEqual(isUnsafeKey('constructor'), true);
  assert.strictEqual(isUnsafeKey('prototype'), true);
  assert.strictEqual(isUnsafeKey('name'), false);
});

test('searchRegex escapes regex metacharacters instead of compiling them', () => {
  const filter = searchRegex('a.*b');
  assert.deepStrictEqual(filter, { $regex: 'a\\.\\*b', $options: 'i' });
  assert.strictEqual(new RegExp(filter.$regex).test('a.*b'), true);
  assert.strictEqual(new RegExp(filter.$regex).test('aXXb'), false);
  assert.strictEqual(searchRegex('   '), null);
  assert.strictEqual(searchRegex(undefined), null);
});

test('searchTerm truncates very long input', () => {
  const term = searchTerm('x'.repeat(MAX_SEARCH_LENGTH + 50));
  assert.strictEqual(term.length, MAX_SEARCH_LENGTH);
});

test('literalRegex anchors and escapes exact matches', () => {
  const pattern = literalRegex('Mahindi (mabichi)');
  assert.ok(pattern instanceof RegExp);
  assert.strictEqual(pattern.test('mahindi (mabichi)'), true);
  assert.strictEqual(pattern.test('Mahindi (mabichi) extra'), false);
  assert.strictEqual(pattern.test('Mahindi mabichi'), false);
  assert.strictEqual(literalRegex(''), null);
});

test('clampInt falls back, floors and caps values', () => {
  assert.strictEqual(clampInt('7', { fallback: 1, max: 10 }), 7);
  assert.strictEqual(clampInt('abc', { fallback: 5, max: 10 }), 5);
  assert.strictEqual(clampInt('-4', { fallback: 1, min: 1, max: 10 }), 1);
  assert.strictEqual(clampInt('999', { fallback: 1, max: 100 }), 100);
  assert.strictEqual(clampInt(undefined, { fallback: 20, max: 100 }), 20);
});

test('pagination cannot be amplified by the client', () => {
  assert.deepStrictEqual(pagination({}), { page: 1, limit: 20, skip: 0 });
  assert.deepStrictEqual(
    pagination({ page: '3', limit: '50' }, { defaultLimit: 20, maxLimit: 100 }),
    { page: 3, limit: 50, skip: 100 }
  );
  assert.deepStrictEqual(
    pagination({ page: '-2', limit: '100000' }, { maxLimit: 100 }),
    { page: 1, limit: 100, skip: 0 }
  );
  assert.deepStrictEqual(
    pagination({ page: '999999999' }, { maxLimit: 10 }),
    { page: 10000, limit: 10, skip: 99990 }
  );
});

test('isPrivateIp rejects loopback, private, link-local and mapped addresses', () => {
  assert.strictEqual(isPrivateIp('127.0.0.1'), true);
  assert.strictEqual(isPrivateIp('10.1.2.3'), true);
  assert.strictEqual(isPrivateIp('172.16.5.4'), true);
  assert.strictEqual(isPrivateIp('192.168.0.10'), true);
  assert.strictEqual(isPrivateIp('169.254.169.254'), true);
  assert.strictEqual(isPrivateIp('100.64.0.1'), true);
  assert.strictEqual(isPrivateIp('::1'), true);
  assert.strictEqual(isPrivateIp('fe80::1'), true);
  assert.strictEqual(isPrivateIp('fd00::1'), true);
  assert.strictEqual(isPrivateIp('::ffff:127.0.0.1'), true);
  assert.strictEqual(isPrivateIp('8.8.8.8'), false);
  assert.strictEqual(isPrivateIp('93.184.216.34'), false);
});

test('assertPublicUrl rejects internal targets and non-http schemes', async () => {
  const rejected = [
    'http://localhost/x.png',
    'http://127.0.0.1/x.png',
    'http://10.0.0.5/x.png',
    'http://169.254.169.254/latest/meta-data/',
    'http://192.168.1.20/x.png',
    'http://[::1]/x.png',
    'http://service.internal/x.png',
    'http://user:pass@example.com/x.png',
    'ftp://example.com/x.png',
    'file:///etc/passwd',
    'not a url',
  ];
  for (const url of rejected) {
    await assert.rejects(assertPublicUrl(url), Error, `expected rejection: ${url}`);
  }
});

test('assertPublicUrl accepts a public IP literal', async () => {
  const parsed = await assertPublicUrl('https://93.184.216.34/image.png');
  assert.strictEqual(parsed.hostname, '93.184.216.34');
});
