const ORG_TYPES = ['cooperative', 'ngo', 'company', 'government', 'financial', 'other'];
const ORG_ROLES = ['owner', 'manager', 'member'];

const slugify = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

// Appends -2, -3... until the caller's slug check reports it is free.
const withSuffix = (base, attempt) => (attempt <= 1 ? base : `${base}-${attempt}`);

const memberRole = (organization = {}, userId) => {
  if (!userId || !Array.isArray(organization.members)) return '';
  const member = organization.members.find((row) => String(row.user) === String(userId));
  return member?.role || '';
};

const isMember = (organization, userId) => Boolean(memberRole(organization, userId));

const canManageMembers = (role) => role === 'owner' || role === 'manager';

// Owners may appoint managers; managers may only add plain members.
const canAssignRole = (actorRole, targetRole) => (
  actorRole === 'owner'
  || (actorRole === 'manager' && targetRole === 'member')
);

// Managers cannot remove peers or the owner; the owner cannot be removed.
const canRemoveMember = (actorRole, targetRole) => {
  if (targetRole === 'owner') return false;
  if (actorRole === 'owner') return true;
  return actorRole === 'manager' && targetRole === 'member';
};

const roleCounts = (members = []) => {
  const counts = { owner: 0, manager: 0, member: 0 };
  for (const member of members) {
    if (counts[member.role] !== undefined) counts[member.role] += 1;
  }
  return { ...counts, total: members.length };
};

module.exports = {
  ORG_TYPES,
  ORG_ROLES,
  slugify,
  withSuffix,
  memberRole,
  isMember,
  canManageMembers,
  canAssignRole,
  canRemoveMember,
  roleCounts,
};
