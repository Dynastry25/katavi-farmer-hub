const PushSubscription = require('../models/PushSubscription');

// Optional Web Push (VAPID). Without keys, push runs in mock mode.
const hasVapid = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let webpush = null;
if (hasVapid) {
  try {
    webpush = require('web-push');
    webpush.setVapidDetails(
      'mailto:admin@katavi-ekilimo.co.tz',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (e) {
    console.error('[Push] web-push package not installed:', e.message);
    webpush = null;
  }
}

const sendPush = async (subscription, { title, message, link = '', type = 'system' }) => {
  const body = `${title}\n${message}`;

  if (!webpush) {
    console.log(`[PUSH][MOCK] To ${subscription.endpoint?.slice(0, 60)}...: ${body.slice(0, 80)}`);
    return { mock: true, success: true };
  }

  try {
    await webpush.sendNotification({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    }, JSON.stringify({ title, body: message, link, type }));
    return { success: true };
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await PushSubscription.findOneAndUpdate({ endpoint: subscription.endpoint }, { active: false });
      return { success: false, expired: true };
    }
    console.error('[Push] send error:', error.message);
    return { success: false };
  }
};

const sendPushToUsers = async (userIds, payload) => {
  const subscriptions = await PushSubscription.find({ user: { $in: userIds }, active: true });
  const results = [];
  for (const subscription of subscriptions) {
    results.push(await sendPush(subscription, payload));
  }
  return { attempted: subscriptions.length, successCount: results.filter(r => r.success).length, results };
};

module.exports = { sendPush, sendPushToUsers, hasVapid };