const PriceAlert = require('../models/PriceAlert');
const MarketPrice = require('../models/MarketPrice');
const { sendNotification } = require('./notification.service');
const { sendSms } = require('./sms.service');
const { sendPushToUsers } = require('./push.service');

// Called after a new market price is recorded. Fires SMS/push/in-app alerts
// for farmers following that crop when the move exceeds their threshold.
const checkPriceAlerts = async (newPrice) => {
  const crop = String(newPrice.cropName || '').trim().toLowerCase();
  if (!crop) return { checked: 0, sent: 0 };

  const subscriptions = await PriceAlert.find({ active: true })
    .where('crop').regex(new RegExp(`^${crop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

  let sent = 0;
  for (const sub of subscriptions) {
    try {
      const prev = await MarketPrice.findOne({
        _id: { $ne: newPrice._id },
        cropName: new RegExp(`^${crop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        dateRecorded: { $lte: new Date() },
      })
        .where('_id').ne(newPrice._id)
        .sort({ dateRecorded: -1 });

      if (!prev || !prev.pricePerUnit) continue;

      const changePct = (Math.abs(newPrice.pricePerUnit - prev.pricePerUnit) / prev.pricePerUnit) * 100;
      const baseline = sub.lastNotifiedPrice || prev.pricePerUnit;
      const moveSinceLast = (Math.abs(newPrice.pricePerUnit - baseline) / baseline) * 100;

      if (changePct >= sub.thresholdPct && moveSinceLast >= sub.thresholdPct) {
        const direction = newPrice.pricePerUnit > prev.pricePerUnit ? 'imepanda' : 'imeshuka';
        const title = `Tahadhari ya Bei (${String(newPrice.cropName).trim()})`;
        const message = `Bei ya ${String(newPrice.cropName).trim()} ${direction} hadi TZS ${newPrice.pricePerUnit.toLocaleString()} kwa ${newPrice.unit || 'kg'} — mabadiliko ya ${changePct.toFixed(1)}%.`;

        await sendNotification(sub.user, {
          title, message, type: 'price', sentVia: ['in_app', 'sms', 'push'],
        });

        const user = await require('../models/User').findById(sub.user).select('phone').lean();
        if (user?.phone) {
          try { await sendSms(user.phone, `Katavi E-Kilimo: ${message}`); } catch (e) { /* best effort */ }
        }
        try { await sendPushToUsers([sub.user], { title, message, type: 'price' }); } catch (e) { /* best effort */ }

        sub.lastNotifiedPrice = newPrice.pricePerUnit;
        await sub.save();
        sent += 1;
      }
    } catch (err) {
      console.error('[PriceAlert] check error:', err.message);
    }
  }

  return { checked: subscriptions.length, sent };
};

module.exports = { checkPriceAlerts };