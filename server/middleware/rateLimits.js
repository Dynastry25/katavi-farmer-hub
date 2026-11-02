const crypto = require('crypto');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const handler = (message) => (req, res) => {
  res.status(429).json({ message });
};

// Carriers in Tanzania put many subscribers behind one CGNAT address, so IP
// alone would let one busy network exhaust everyone's budget. Signed-in calls
// are counted per token instead; anonymous calls still fall back to the IP.
const clientKey = (req) => {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    const hash = crypto.createHash('sha256').update(header.slice(7)).digest('hex');
    return `tok:${hash.slice(0, 32)}`;
  }
  return ipKeyGenerator(req.ip);
};

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 900,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  handler: handler('Maombi mengi mno. Jaribu tena baada ya muda mfupi.'),
});

// Unauthenticated auth traffic stays IP-scoped; per-account limits below catch
// password and OTP guessing even when an attacker rotates addresses.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handler('Majaribio mengi ya kuingia. Subiri dakika 15.'),
});

const accountKey = (req) => {
  const source = req.body?.identifier ?? req.body?.email ?? req.body?.phone ?? '';
  const account = typeof source === 'string' ? source.trim().toLowerCase().slice(0, 120) : '';
  return account ? `acct:${account}` : ipKeyGenerator(req.ip);
};

// Login: throttle per account so password guessing is expensive even when the
// attacker rotates IPs.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: accountKey,
  handler: handler('Majaribio mengi ya nenosiri. Subiri dakika 15.'),
});

// OTP request/verify: per phone number, on top of the 30s resend cooldown.
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: accountKey,
  handler: handler('Maombi mengi ya namba ya uthibitisho. Subiri dakika 10.'),
});

// AI and image analysis call paid third-party APIs.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  handler: handler('Umetuma maombi mengi ya AI. Subiri dakika moja.'),
});

// Server-side map rendering proxies a paid API and caches images in memory.
const mapsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  handler: handler('Maombi mengi ya ramani. Subiri dakika moja.'),
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clientKey,
  handler: handler('Upakiaji mwingi wa faili. Subiri dakika 10.'),
});

module.exports = {
  generalLimiter,
  authLimiter,
  loginLimiter,
  otpLimiter,
  aiLimiter,
  mapsLimiter,
  uploadLimiter,
};
