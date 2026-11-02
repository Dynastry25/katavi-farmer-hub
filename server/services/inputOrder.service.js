const INPUT_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

// Sellers advance an order one step at a time; cancelling is only possible
// before the goods leave the shop.
const INPUT_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const isInputStatus = (status) => INPUT_STATUSES.includes(status);

const canTransitionInputOrder = (from, to) =>
  Boolean(INPUT_TRANSITIONS[from]?.includes(to));

const inputPaymentMethod = ({ paymentMethod, paymentProvider } = {}) => {
  if (['mm', 'cod', 'bank'].includes(paymentMethod)) return paymentMethod;
  return paymentProvider ? 'mm' : 'cod';
};

module.exports = {
  INPUT_STATUSES,
  INPUT_TRANSITIONS,
  isInputStatus,
  canTransitionInputOrder,
  inputPaymentMethod,
};
