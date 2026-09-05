const africastalkingConfig = require('../config/africastalking');

const toE164 = (phone) => {
  if (!phone) return '';
  let p = String(phone).replace(/[^\d]/g, '');
  if (p.startsWith('0')) p = '255' + p.slice(1);
  if (!p.startsWith('255')) p = '255' + p;
  return `+${p}`;
};

const sendSms = async (phone, message) => {
  const cfg = africastalkingConfig();
  if (!cfg.configured) {
    // Mock mode — no Africa's Talking keys set, just log.
    console.log(`[SMS][MOCK] To ${toE164(phone)}: ${message}`);
    return { mock: true, success: true, to: toE164(phone) };
  }

  try {
    const response = await fetch(`${cfg.baseUrl}/version1/messaging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ApiKey: cfg.apiKey,
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        username: cfg.username,
        to: toE164(phone),
        message,
        ...(cfg.shortCode ? { from: cfg.shortCode } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));
    const recipient = data.SMSMessageData?.Recipients?.[0];
    return {
      success: recipient?.status === 'Success',
      status: recipient?.status || 'queued',
      messageId: recipient?.messageId || null,
      to: toE164(phone),
    };
  } catch (error) {
    console.error('[SMS] Error:', error.message);
    return { success: false, error: error.message, to: toE164(phone) };
  }
};

const sendBulkSms = async (phones, message) => {
  const unique = [...new Set((phones || []).filter(Boolean))];
  const results = [];
  for (const phone of unique) {
    // Sequential to keep it simple and avoid burst limits in mock/real mode.
    results.push(await sendSms(phone, message));
  }
  return {
    successCount: results.filter(r => r.success).length,
    attempted: unique.length,
    results,
  };
};

module.exports = { sendSms, sendBulkSms, toE164 };