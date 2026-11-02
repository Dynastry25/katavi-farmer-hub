const { test } = require('node:test');
const assert = require('node:assert');

const Broadcast = require('../models/Broadcast');

test('broadcast accepts every audience offered by the admin push screen', () => {
  for (const audience of ['all', 'farmer', 'buyer', 'expert', 'seller', 'logistics']) {
    const broadcast = new Broadcast({
      title: 'Arifa',
      message: 'Ujumbe',
      audience,
    });
    assert.strictEqual(broadcast.validateSync(), undefined, audience);
  }
});

test('broadcast rejects an unknown audience', () => {
  const broadcast = new Broadcast({
    title: 'Arifa',
    message: 'Ujumbe',
    audience: 'watumiaji',
  });
  const error = broadcast.validateSync();
  assert.ok(error?.errors?.audience, 'audience should fail validation');
});

test('broadcast accepts in-app, sms and push channels', () => {
  const broadcast = new Broadcast({
    title: 'Arifa',
    message: 'Ujumbe',
    channels: ['in_app', 'sms', 'push'],
  });
  assert.strictEqual(broadcast.validateSync(), undefined);
});
