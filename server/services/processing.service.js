const SERVICE_LABELS = {
  milling: 'Kusaga',
  drying: 'Kukausha',
  packaging: 'Kufungasha',
  grading: 'Kupanga madaraja',
  oil_pressing: 'Kukamua mafuta',
  shelling: 'Kupukuchua',
  other: 'Huduma nyingine',
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Returns the quoted fee, or the reason the lot cannot be booked.
const quoteProcessing = (offer = {}, quantityKg) => {
  const quantity = Number(quantityKg);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { fee: 0, blocker: 'Weka kiasi sahihi cha kilo' };
  }
  const minimum = Number(offer.minQuantityKg) || 0;
  if (minimum > 0 && quantity < minimum) {
    return { fee: 0, blocker: `Kiwango cha chini ni kilo ${minimum}` };
  }
  const capacity = Number(offer.capacityKgPerDay) || 0;
  if (capacity > 0 && quantity > capacity) {
    return { fee: 0, blocker: `Uwezo wa siku moja ni kilo ${capacity}` };
  }
  const rate = Number(offer.pricePerKg) || 0;
  if (rate <= 0) return { fee: 0, blocker: 'Huduma hii haina bei iliyowekwa' };
  return { fee: round2(quantity * rate), blocker: null };
};

const TRANSITIONS = {
  requested: ['accepted', 'rejected', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: [],
  rejected: [],
  cancelled: [],
};

const canTransitionBooking = (from, to) => Boolean(TRANSITIONS[from]?.includes(to));

// Provider actions drive acceptance/completion; only the customer cancels.
const ACTION_TARGETS = {
  accept: 'accepted',
  reject: 'rejected',
  start: 'in_progress',
  complete: 'completed',
  cancel: 'cancelled',
};

module.exports = {
  SERVICE_LABELS,
  round2,
  quoteProcessing,
  canTransitionBooking,
  ACTION_TARGETS,
};
