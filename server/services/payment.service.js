const PROVIDERS = ['M-Pesa', 'Tigo Pesa', 'Airtel Money'];

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

  if (process.env.PAYMENT_API_URL && process.env.PAYMENT_API_KEY) {
    try {
      const response = await fetch(process.env.PAYMENT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.PAYMENT_API_KEY}`,
        },
        body: JSON.stringify({ provider, phone: toE164(phone), amount: numeric, reference, customerName }),
      });
      if (response.ok) {
        const data = await response.json();
        return { success: true, status: 'pending', transactionId: data.transactionId || transactionId, reference, mock: false, pickupNumber: data.customerMessage || '' };
      }
    } catch (e) {
      console.error('[Payment] API error:', e.message);
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

const getPaymentStatus = async (transactionId) => {
  // Simulate checkout status. Real integrations would query the provider.
  return { transactionId, status: 'pending', message: 'Malipo yako bado yanasubiri uthibitisho.' };
};

module.exports = { initiatePayment, getPaymentStatus, PROVIDERS, toE164 };