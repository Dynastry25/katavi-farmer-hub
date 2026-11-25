// Roles a single account can hold and switch between. Staff roles are managed
// separately and are not self-switchable.
const ALL_ROLES = [
  'farmer',
  'buyer',
  'seller',
  'expert',
  'logistics',
  'warehouse',
  'admin',
  'support',
  'content_moderator',
  'finance_officer',
];

const SWITCHABLE_ROLES = ['farmer', 'buyer', 'seller', 'expert', 'logistics', 'warehouse'];

const uniqueRoles = (roles) => [...new Set(roles.filter(Boolean))];

// The active role is always allowed; roles cleared through KYC join it.
const authorizedRoles = (user = {}) => uniqueRoles([user.role, ...(user.verifiedRoles || [])])
  .filter((role) => ALL_ROLES.includes(role));

const switchableRoles = (user = {}) => authorizedRoles(user)
  .filter((role) => SWITCHABLE_ROLES.includes(role));

const canSwitchRole = (user, role) => Boolean(role)
  && authorizedRoles(user).includes(role);

module.exports = {
  ALL_ROLES,
  SWITCHABLE_ROLES,
  authorizedRoles,
  switchableRoles,
  canSwitchRole,
};
