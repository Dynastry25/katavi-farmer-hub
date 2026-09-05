const User = require('../models/User');
const Order = require('../models/Order');
const LoanApplication = require('../models/LoanApplication');
const Rating = require('../models/Rating');

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const computeCreditScore = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  let score = 50;
  const factors = [];

  if (user.isVerified) { score += 10; factors.push('Amethibitishwa (+10)'); }

  // Completed orders as farmer or buyer → trading history
  const completedOrders = await Order.countDocuments({
    $or: [{ farmer: userId }, { buyer: userId }],
    status: 'completed',
  });
  let bonus = Math.min(completedOrders * 5, 20);
  if (bonus > 0) { score += bonus; factors.push(`Maagizo yaliyokamilika (+${bonus})`); }

  const cancelledOrders = await Order.countDocuments({
    $or: [{ farmer: userId }, { buyer: userId }],
    status: 'cancelled',
  });
  let penalty = Math.min(cancelledOrders * 3, 12);
  if (penalty > 0) { score -= penalty; factors.push(`Maagizo yaliyoghairiwa (-${penalty})`); }

  // Ratings received → reputation
  const ratingAgg = await Rating.aggregate([
    { $match: { ratedUser: user._id } },
    { $group: { _id: null, avg: { $avg: '$score' }, total: { $sum: 1 } } },
  ]);
  if (ratingAgg[0] && ratingAgg[0].total > 0) {
    const avg = ratingAgg[0].avg;
    const ratingBonus = Math.round((avg - 3) * 5);
    if (ratingBonus !== 0) { score += ratingBonus; factors.push(`Ukadiriaji (${avg.toFixed(1)}) ${ratingBonus > 0 ? '+' : ''}${ratingBonus}`); }
  }

  // Loans history
  const [overdueLoans, paidLoans] = await Promise.all([
    LoanApplication.countDocuments({ user: userId, repaymentStatus: 'overdue' }),
    LoanApplication.countDocuments({ user: userId, repaymentStatus: 'paid' }),
  ]);
  if (overdueLoans > 0) { score -= overdueLoans * 15; factors.push(`Mikopo iliyochelewa (-${overdueLoans * 15})`); }
  if (paidLoans > 0) { score += Math.min(paidLoans * 5, 15); factors.push(`Mikopo iliyolipwa (+${Math.min(paidLoans * 5, 15)})`); }

  // Account age
  const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const ageBonus = Math.min(Math.floor(ageDays / 30) * 2, 10);
  if (ageBonus > 0) { score += ageBonus; factors.push(`Umri wa akaunti (+${ageBonus})`); }

  score = clamp(Math.round(score), 10, 95);

  user.creditScore = score;
  user.creditScoreUpdatedAt = new Date();
  await user.save();

  return { score, factors };
};

const computeTrustScore = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return null;

  let score = 60;
  const factors = [];

  const [completedOrders, cancelledOrders, groupCount, advisoryCount] = await Promise.all([
    Order.countDocuments({ $or: [{ farmer: userId }, { buyer: userId }], status: 'completed' }),
    Order.countDocuments({ $or: [{ farmer: userId }, { buyer: userId }], status: 'cancelled' }),
    require('../models/FarmerGroup').countDocuments({ members: userId }),
    require('../models/AdviceArticle').countDocuments({ author: userId, status: 'approved' }),
  ]);

  if (user.isVerified) { score += 15; factors.push('Akaunti imethibitishwa (+15)'); }
  score += Math.min(completedOrders * 2, 15);
  if (completedOrders > 0) factors.push(`Agizo kamili (+${Math.min(completedOrders * 2, 15)})`);
  score -= cancelledOrders * 5;
  if (cancelledOrders > 0) factors.push(`Agizo ghairi (-${cancelledOrders * 5})`);
  score += Math.min(groupCount * 3, 9);
  if (groupCount > 0) factors.push(`Vikundi (+${Math.min(groupCount * 3, 9)})`);
  score += Math.min(advisoryCount * 2, 8);
  if (advisoryCount > 0) factors.push(`Makala zilizoidhinishwa (+${Math.min(advisoryCount * 2, 8)})`);

  // Blend with credit score to reflect financial behaviour.
  const credit = user.creditScore || 50;
  score = score * 0.65 + credit * 0.35;

  score = clamp(Math.round(score), 10, 98);

  user.trustScore = score;
  user.trustScoreUpdatedAt = new Date();
  await user.save();

  return { score, factors };
};

const refreshCreditData = async (userId) => {
  const [credit, trust] = await Promise.all([
    computeCreditScore(userId),
    computeTrustScore(userId),
  ]);
  const user = await User.findById(userId).select('-password');
  return {
    user,
    creditScore: credit ? credit.score : user?.creditScore,
    creditFactors: credit ? credit.factors : [],
    trustScore: trust ? trust.score : user?.trustScore,
    trustFactors: trust ? trust.factors : [],
  };
};

module.exports = { computeCreditScore, computeTrustScore, refreshCreditData };