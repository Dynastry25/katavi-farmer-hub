const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;

// Receipt numbers are prefixed by direction so paper stubs are easy to sort.
const RECEIPT_PREFIX = { in: 'GR', out: 'GD', loss: 'HP' };

const makeReceiptNumber = ({ type, date = new Date(), rand = Math.random } = {}) => {
  const when = date instanceof Date ? date : new Date(date);
  const year = String(when.getUTCFullYear()).slice(-2);
  const month = String(when.getUTCMonth() + 1).padStart(2, '0');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[Math.floor(rand() * alphabet.length)];
  }
  return `${RECEIPT_PREFIX[type] || 'WM'}-${year}${month}-${suffix}`;
};

const balanceFor = (movements = []) => {
  const totals = { in: 0, out: 0, loss: 0 };
  for (const movement of movements) {
    if (totals[movement.type] !== undefined) {
      totals[movement.type] += Number(movement.bags) || 0;
    }
  }
  return {
    bagsIn: round1(totals.in),
    bagsOut: round1(totals.out),
    bagsLost: round1(totals.loss),
    balance: round1(totals.in - totals.out - totals.loss),
  };
};

// Withdrawals and losses may never exceed what is physically in the store.
const validateMovement = ({ type, bags, balance = 0 }) => {
  if (!['in', 'out', 'loss'].includes(type)) return 'Aina ya harakati si sahihi';
  const quantity = Number(bags);
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Weka idadi sahihi ya gunia';
  const available = Number(balance) || 0;
  if ((type === 'out' || type === 'loss') && quantity > available) {
    return `Ghala lina gunia ${available} tu zilizosalia`;
  }
  return null;
};

module.exports = {
  MOVEMENT_TYPES: ['in', 'out', 'loss'],
  makeReceiptNumber,
  balanceFor,
  validateMovement,
};
