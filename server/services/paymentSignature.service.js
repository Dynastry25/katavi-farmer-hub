const crypto = require('crypto');

const safeEqual = (left, right) => {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Gateways that sign callbacks send `x-payment-signature: sha256=<hex hmac>`.
// The legacy shared-secret header is only honoured while no HMAC secret is
// configured, so enabling PAYMENT_WEBHOOK_SECRET switches the old path off.
const verifyCallbackSignature = ({
  hmacSecret,
  legacySecret,
  legacyProvided,
  rawBody,
  body,
  signature,
}) => {
  const hasHmac = Boolean(hmacSecret);
  const hasLegacy = Boolean(legacySecret);
  if (!hasHmac && !hasLegacy) return { ok: false, configured: false, method: '' };

  if (hasHmac) {
    const provided = String(signature || '').replace(/^sha256=/i, '').trim();
    if (!provided) return { ok: false, configured: true, method: '' };
    const payload = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(JSON.stringify(body || {}));
    const expected = crypto.createHmac('sha256', hmacSecret).update(payload).digest('hex');
    return safeEqual(provided, expected)
      ? { ok: true, configured: true, method: 'hmac' }
      : { ok: false, configured: true, method: '' };
  }

  return safeEqual(legacyProvided, legacySecret)
    ? { ok: true, configured: true, method: 'shared-secret' }
    : { ok: false, configured: true, method: '' };
};

module.exports = { verifyCallbackSignature, safeEqual };
