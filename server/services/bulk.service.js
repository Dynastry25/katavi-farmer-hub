const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const remainingQuantity = (request = {}, committedKg = request.committedKg) => {
  const target = Number(request.quantityKg) || 0;
  const committed = Number(committedKg) || 0;
  return Math.max(0, round2(target - committed));
};

const progressPct = (request = {}) => {
  const target = Number(request.quantityKg) || 0;
  if (target <= 0) return 0;
  const committed = Number(request.committedKg) || 0;
  return Math.max(0, Math.min(100, Math.round((committed / target) * 100)));
};

// A request past its deadline reads as expired even before a job persists it.
const effectiveBulkStatus = (request = {}, now = new Date()) => {
  if (request.status !== 'open' || !request.deadline) return request.status;
  const deadline = new Date(request.deadline);
  if (Number.isNaN(deadline.getTime())) return request.status;
  return deadline.getTime() <= new Date(now).getTime() ? 'expired' : 'open';
};

// Returns why a farmer cannot commit, or null when the quantity is acceptable.
const commitBlocker = (request = {}, quantityKg, now = new Date()) => {
  const status = effectiveBulkStatus(request, now);
  if (status === 'expired') return 'Muda wa ombi hili umekwisha';
  if (status !== 'open') return 'Ombi hili halipokei ahadi mpya';
  const quantity = Number(quantityKg);
  if (!Number.isFinite(quantity) || quantity <= 0) return 'Weka kiasi sahihi cha kilo';
  const remaining = remainingQuantity(request);
  if (remaining <= 0) return 'Ombi hili limekamilika';
  if (quantity > remaining) return `Kiasi kinachobaki ni kilo ${remaining} tu`;
  return null;
};

module.exports = {
  round2,
  remainingQuantity,
  progressPct,
  effectiveBulkStatus,
  commitBlocker,
};
