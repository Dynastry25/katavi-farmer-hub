const { test } = require('node:test');
const assert = require('node:assert');
const {
  authorizedRoles,
  switchableRoles,
  canSwitchRole,
} = require('../services/role.service');

test('authorizedRoles merges the active role with verified roles', () => {
  assert.deepStrictEqual(authorizedRoles({ role: 'farmer' }), ['farmer']);
  assert.deepStrictEqual(
    authorizedRoles({ role: 'farmer', verifiedRoles: ['buyer', 'seller'] }),
    ['farmer', 'buyer', 'seller'],
  );
  assert.deepStrictEqual(
    authorizedRoles({ role: 'farmer', verifiedRoles: ['farmer', 'buyer', 'unknown'] }),
    ['farmer', 'buyer'],
  );
});

test('switchableRoles excludes staff roles', () => {
  assert.deepStrictEqual(
    switchableRoles({ role: 'admin', verifiedRoles: ['farmer', 'warehouse'] }),
    ['farmer', 'warehouse'],
  );
  assert.deepStrictEqual(switchableRoles({ role: 'support' }), []);
});

test('canSwitchRole only accepts authorized roles', () => {
  const user = { role: 'farmer', verifiedRoles: ['buyer'] };
  assert.strictEqual(canSwitchRole(user, 'buyer'), true);
  assert.strictEqual(canSwitchRole(user, 'farmer'), true);
  assert.strictEqual(canSwitchRole(user, 'seller'), false);
  assert.strictEqual(canSwitchRole(user, ''), false);
});
