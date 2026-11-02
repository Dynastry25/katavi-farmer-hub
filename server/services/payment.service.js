const PROVIDERS = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'HaloPesa'];

const crypto = require('crypto');

const toE164 = (phone) => {
  if (!phone) return '';
  let p = String(phone).replace(/[^\d]/g, '');
  if (p.startsWith('0')) p = '255' + p.slice(1);
  if (!p.startsWith('255')) p = '255' + p;
  return `+${p}`;
};

// Mock mobile money gateway. Wire to a real provider (e.g. Daraja / Payment Gateway)
// via PAYMENT_API_URL + PAYMENT_API_KEY when available.
const initiatePayment = async ({ provider, phone, amount, reference, customerName }) => {
  const normalizedProvider = (provider || '').trim();
  if (!PROVIDERS.includes(normalizedProvider)) {
    return { success: false, error: `Chagua mtoa huduma kati ya: ${PROVIDERS.join(', ')}` };
  }
  const numeric = Number(amount);
  if (!phone || isNaN(numeric) || numeric <= 0) {
    return { success: false, error: 'Namba ya simu na kiasi sahihi vinahitajika' };
  }

  const transactionId = 'TX' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();

  const gatewayConfigured = Boolean(process.env.PAYMENT_API_URL || process.env.PAYMENT_API_KEY);
  if (gatewayConfigured && (!process.env.PAYMENT_API_URL || !process.env.PAYMENT_API_KEY)) {
    return { success: false, error: 'Mfumo wa malipo haujasanidiwa vizuri. Wasiliana na msimamizi.' };
  }

  if (gatewayConfigured) {
    try {
      const response = await fetch(process.env.PAYMENT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAYMENT_API_KEY}`,
        },
        body: JSON.stringify({ provider, phone: toE164(phone), amount: numeric, reference, customerName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `Mtoa huduma wa malipo hakukubali ombi (${response.status})`,
        };
      }
      return { success: true, status: 'pending', transactionId: data.transactionId || transactionId, reference, mock: false, pickupNumber: data.customerMessage || '' };
    } catch (e) {
      // A configured gateway that cannot be reached must not silently fall back
      // to mock: the buyer would believe a charge was requested when it was not.
      console.error('[Payment] API error:', e.message);
      return { success: false, error: 'Mtoa huduma wa malipo hapatikani kwa sasa. Jaribu tena.' };
    }
  }

  // Mock: simulate a successful STK push request.
  console.log(`[PAYMENT][MOCK] ${normalizedProvider} → ${toE164(phone)} TZS ${numeric} (${reference || 'no-ref'})`);
  return {
    success: true,
    status: 'pending',
    transactionId,
    reference,
    provider: normalizedProvider,
    mock: true,
    message: 'Ombi la malipo limetumwa kwa simu yako. Thibitisha na PIN ya Mobile Money.',
  };
};

// Reverses a captured mobile-money charge. Uses PAYMENT_REFUND_URL when the
// gateway is configured; otherwise records a mock refund for local development.
const refundPayment = async ({ transactionId, amount, reason }) => {
  const transaction = String(transactionId || '').trim();
  if (!transaction) {
    return { success: false, error: 'Namba ya muamala haipo' };
  }
  const numeric = Number(amount) || 0;

  if (process.env.PAYMENT_REFUND_URL) {
    if (!process.env.PAYMENT_API_KEY) {
      return { success: false, error: 'Ufunguo wa huduma ya malipo haupo' };
    }
    try {
      const response = await fetch(process.env.PAYMENT_REFUND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAYMENT_API_KEY}`,
        },
        body: JSON.stringify({ transactionId: transaction, amount: numeric, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `Marejesho yalikataliwa (${response.status})`,
        };
      }
      return {
        success: true,
        status: 'refunded',
        refundId: data.refundId || data.refund_id || '',
        mock: false,
      };
    } catch (e) {
      console.error('[Payment] Refund API error:', e.message);
      return { success: false, error: 'Huduma ya marejesho hapatikani kwa sasa.' };
    }
  }

  // A live gateway without a refund endpoint must never be recorded as refunded.
  if (process.env.PAYMENT_API_URL) {
    return { success: false, error: 'Marejesho ya malipo hayajasanidiwa kwenye mfumo.' };
  }

  const refundId = 'RF' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(3).toString('hex').toUpperCase();
  console.log(`[PAYMENT][MOCK] refund ${transaction} TZS ${numeric} (${reason || 'no-reason'})`);
  return { success: true, status: 'refunded', refundId, mock: true };
};

module.exports = { initiatePayment, refundPayment, PROVIDERS, toE164 };