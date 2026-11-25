const { test } = require('node:test');
const assert = require('node:assert');

const cache = require('../services/cache.service');

test('cache stores, reads and deletes a value', async () => {
  await cache.set('test:demo', { a: 1 }, 30);
  assert.deepStrictEqual(await cache.get('test:demo'), { a: 1 });

  await cache.del('test:demo');
  assert.strictEqual(await cache.get('test:demo'), null);
});

test('remember loads once and then serves from cache', async () => {
  let calls = 0;
  const loader = async () => {
    calls += 1;
    return ['mahindi'];
  };

  assert.deepStrictEqual(await cache.remember('test:remember', 30, loader), ['mahindi']);
  assert.deepStrictEqual(await cache.remember('test:remember', 30, loader), ['mahindi']);
  assert.strictEqual(calls, 1);
});

test('delByPrefix removes every key with the prefix only', async () => {
  await cache.set('test:prefix:a', 1, 30);
  await cache.set('test:prefix:b', 2, 30);
  await cache.set('test:other', 3, 30);

  await cache.delByPrefix('test:prefix');

  assert.strictEqual(await cache.get('test:prefix:a'), null);
  assert.strictEqual(await cache.get('test:prefix:b'), null);
  assert.strictEqual(await cache.get('test:other'), 3);
});

test('health reports the fallback backend without leaking credentials', async () => {
  const state = await cache.health();
  assert.strictEqual(state.configured, Boolean(process.env.REDIS_URL));
  assert.ok(['memory', 'redis'].includes(state.backend));
  assert.strictEqual(typeof state.ready, 'boolean');
  assert.strictEqual(typeof state.maxKeys, 'number');
});

test('redis urls are masked before they reach logs or health output', () => {
  assert.strictEqual(
    cache.maskRedisUrl('rediss://user:secret@redis.example.com:6379'),
    'rediss://***@redis.example.com:6379',
  );
  assert.strictEqual(
    cache.maskRedisUrl('redis://cache.internal:6380'),
    'redis://cache.internal:6380',
  );
  assert.strictEqual(cache.maskRedisUrl('not a url'), 'configured');
});
