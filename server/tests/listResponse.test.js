const { test } = require('node:test');
const assert = require('node:assert');

const {
  buildListEnvelope,
  addListMeta,
  listEnvelope,
  wantsEnvelope,
} = require('../services/listResponse.service');

const rows = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

test('buildListEnvelope defaults to one page containing every item', () => {
  const envelope = buildListEnvelope(rows, {});
  assert.strictEqual(envelope.items.length, 5);
  assert.strictEqual(envelope.total, 5);
  assert.strictEqual(envelope.page, 1);
  assert.strictEqual(envelope.limit, 5);
  assert.strictEqual(envelope.pages, 1);
  assert.strictEqual(envelope.hasMore, false);
});

test('buildListEnvelope slices by page and limit', () => {
  const second = buildListEnvelope(rows, { page: '2', limit: '2' });
  assert.deepStrictEqual(second.items.map((row) => row.id), [3, 4]);
  assert.strictEqual(second.total, 5);
  assert.strictEqual(second.pages, 3);
  assert.strictEqual(second.hasMore, true);

  const last = buildListEnvelope(rows, { page: '3', limit: '2' });
  assert.deepStrictEqual(last.items.map((row) => row.id), [5]);
  assert.strictEqual(last.hasMore, false);
});

test('buildListEnvelope clamps hostile paging input', () => {
  const result = buildListEnvelope(rows, { page: '-4', limit: '99999' });
  assert.strictEqual(result.page, 1);
  assert.strictEqual(result.limit, 200);
  assert.strictEqual(result.items.length, 5);
});

test('addListMeta completes an existing paginated envelope', () => {
  const result = addListMeta({ items: rows.slice(0, 2), total: 5, page: 1 }, { limit: 2 });
  assert.strictEqual(result.limit, 2);
  assert.strictEqual(result.pages, 3);
  assert.strictEqual(result.hasMore, true);
  assert.strictEqual(result.total, 5);
});

test('addListMeta derives totals from items when the service omits them', () => {
  const result = addListMeta({ items: rows });
  assert.strictEqual(result.total, 5);
  assert.strictEqual(result.pages, 1);
});

const runMiddleware = (query, header) => new Promise((resolve) => {
  const req = {
    query,
    get: (name) => (String(name).toLowerCase() === 'x-list-format' ? header : undefined),
  };
  const res = {
    json(body) {
      resolve(body);
      return this;
    },
  };
  listEnvelope(req, res, () => res.json(rows));
});

test('listEnvelope leaves legacy array responses untouched', async () => {
  const body = await runMiddleware({}, undefined);
  assert.ok(Array.isArray(body));
  assert.strictEqual(body.length, 5);
});

test('listEnvelope wraps arrays when the client opts in via header', async () => {
  const body = await runMiddleware({ page: '2', limit: '2' }, 'envelope');
  assert.strictEqual(body.total, 5);
  assert.strictEqual(body.page, 2);
  assert.deepStrictEqual(body.items.map((row) => row.id), [3, 4]);
  assert.strictEqual(body.hasMore, true);
});

test('listEnvelope also accepts ?format=envelope', async () => {
  const body = await runMiddleware({ format: 'envelope' }, undefined);
  assert.ok(!Array.isArray(body));
  assert.strictEqual(body.items.length, 5);
});

test('listEnvelope never wraps object responses', async () => {
  const req = { query: {}, get: () => 'envelope' };
  let received;
  const res = {
    json(body) {
      received = body;
      return this;
    },
  };
  listEnvelope(req, res, () => res.json({ message: 'ok' }));
  assert.deepStrictEqual(received, { message: 'ok' });
});

test('wantsEnvelope recognises header and query opt-ins only', () => {
  assert.strictEqual(wantsEnvelope({ get: () => 'envelope', query: {} }), true);
  assert.strictEqual(wantsEnvelope({ get: () => '', query: { format: 'envelope' } }), true);
  assert.strictEqual(wantsEnvelope({ get: () => '', query: {} }), false);
});
