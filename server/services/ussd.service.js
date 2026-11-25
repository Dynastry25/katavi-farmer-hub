const MAIN_MENU = 'Karibu Katavi E-Kilimo\n1. Bei za mazao\n2. Akaunti yangu\n3. Msaada\n0. Toka';

const parseUssdText = (text) => String(text || '')
  .split('*')
  .map((part) => part.trim())
  .filter(Boolean);

// Africa's Talking sends +255..., 255..., or 07... depending on the handset.
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('255')) return `+${digits}`;
  if (digits.startsWith('0')) return `+255${digits.slice(1)}`;
  if (digits.length === 9) return `+255${digits}`;
  return `+${digits}`;
};

const phoneVariants = (value) => {
  const normalized = normalizePhone(value);
  if (!normalized) return [];
  const national = `0${normalized.slice(4)}`;
  const bare = normalized.slice(1);
  return [...new Set([normalized, bare, national, national.slice(1)])];
};

const end = (body) => ({ body, end: true });
const keep = (body) => ({ body, end: false });

const priceLine = (item) => `${item.cropName}: ${item.pricePerUnit} ${item.currency || 'TZS'}/${item.unit || 'kg'}`
  + `${item.district || item.region ? `\n${item.district || item.region}` : ''}`;

// Stateless USSD flow: the gateway re-sends the full "*"-joined input each time,
// so no session document is needed between keypresses.
const handleUssd = async ({ text = '', phone = '', deps = {} } = {}) => {
  const steps = parseUssdText(text);
  if (!steps.length) return keep(MAIN_MENU);

  const [choice, ...rest] = steps;
  if (choice === '0') return end('Asante kwa kutumia Katavi E-Kilimo.');

  if (choice === '1') {
    const prices = (await deps.listPrices?.()) || [];
    if (!prices.length) return end('Hakuna bei za soko zilizowekwa kwa sasa.');
    if (!rest.length) {
      const menu = prices.slice(0, 5).map((item, index) => `${index + 1}. ${item.cropName}`).join('\n');
      return keep(`Bei za soko\n${menu}`);
    }
    const item = prices[Number(rest[0]) - 1];
    if (!item) return end('Chaguo si sahihi. Jaribu tena.');
    return end(priceLine(item));
  }

  if (choice === '2') {
    const user = await deps.getUserByPhone?.(normalizePhone(phone) || phone);
    if (!user) {
      return end('Namba hii haijasajiliwa. Jisajili kupitia app au kwa wakala wa karibu.');
    }
    return end(`Jina: ${user.name}\nNafasi: ${user.role}\nWilaya: ${user.district || '-'}`);
  }

  if (choice === '3') {
    return end(`Piga ${deps.supportPhone || '0800 000 000'} au tumia app kwa msaada zaidi.`);
  }

  return keep(`Chaguo si sahihi.\n${MAIN_MENU}`);
};

module.exports = {
  MAIN_MENU,
  parseUssdText,
  normalizePhone,
  phoneVariants,
  priceLine,
  handleUssd,
};
