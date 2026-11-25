const test = require('node:test');
const assert = require('node:assert/strict');
const {
  slugify,
  withSuffix,
  memberRole,
  canManageMembers,
  canAssignRole,
  canRemoveMember,
  roleCounts,
} = require('../services/organization.service');

const organization = {
  members: [
    { user: 'u1', role: 'owner' },
    { user: 'u2', role: 'manager' },
    { user: 'u3', role: 'member' },
  ],
};

test('slugs are lowercase and unique candidates get suffixes', () => {
  assert.equal(slugify('Ushirika wa Wakulima Katavi!'), 'ushirika-wa-wakulima-katavi');
  assert.equal(slugify('  '), '');
  assert.equal(withSuffix('taasisi', 1), 'taasisi');
  assert.equal(withSuffix('taasisi', 3), 'taasisi-3');
});

test('membership roles resolve per user', () => {
  assert.equal(memberRole(organization, 'u1'), 'owner');
  assert.equal(memberRole(organization, 'u2'), 'manager');
  assert.equal(memberRole(organization, 'u9'), '');
});

test('owners appoint managers; managers add members only', () => {
  assert.equal(canManageMembers('owner'), true);
  assert.equal(canManageMembers('manager'), true);
  assert.equal(canManageMembers('member'), false);
  assert.equal(canAssignRole('owner', 'manager'), true);
  assert.equal(canAssignRole('manager', 'manager'), false);
  assert.equal(canAssignRole('manager', 'member'), true);
});

test('owners stay in place and managers cannot remove peers', () => {
  assert.equal(canRemoveMember('owner', 'owner'), false);
  assert.equal(canRemoveMember('owner', 'manager'), true);
  assert.equal(canRemoveMember('manager', 'member'), true);
  assert.equal(canRemoveMember('manager', 'manager'), false);
  assert.equal(canRemoveMember('member', 'member'), false);
});

test('role counts include the total', () => {
  assert.deepEqual(roleCounts(organization.members), { owner: 1, manager: 1, member: 1, total: 3 });
});
