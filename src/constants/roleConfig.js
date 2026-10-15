const ROLE_LABELS = {
  farmer: 'Mkulima',
  buyer: 'Mnunuzi',
  seller: 'Muuzaji',
  expert: 'Mtaalamu',
  admin: 'Msimamizi',
  support: 'Msaidizi',
  content_moderator: 'Msimamizi wa Maudhui',
  finance_officer: 'Afisa Fedha',
};

const ROLE_ICONS = {
  farmer: 'fas fa-seedling',
  buyer: 'fas fa-shopping-cart',
  seller: 'fas fa-store',
  expert: 'fas fa-user-md',
  admin: 'fas fa-shield-alt',
  support: 'fas fa-headset',
  content_moderator: 'fas fa-newspaper',
  finance_officer: 'fas fa-coins',
};

const ROLE_COLORS = {
  farmer: '#22c55e',
  buyer: '#3b82f6',
  seller: '#f59e0b',
  expert: '#8b5cf6',
  admin: '#ef4444',
  support: '#0ea5e9',
  content_moderator: '#14b8a6',
  finance_officer: '#eab308',
};

const NOTIFICATION_TYPES = {
  order: 'Maagizo',
  loan: 'Mikopo',
  weather: 'Hali ya Hewa',
  price: 'Bei za Soko',
  system: 'Mfumo',
  chat: 'Mazungumzo',
  group: 'Vikundi',
  advisory: 'Ushauri',
};

const CROP_CATEGORIES = [
  { value: 'cereals', label: 'Nafaka' },
  { value: 'legumes', label: 'Mahunzi' },
  { value: 'vegetables', label: 'Mboga' },
  { value: 'fruits', label: 'Matunda' },
  { value: 'tubers', label: 'Mizizi' },
  { value: 'oilseeds', label: 'Mafuta' },
];

const REGIONS = [
  'Katavi', 'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza',
  'Mbeya', 'Tabora', 'Kigoma', 'Shinyanga', 'Rukwa',
  'Sumbawanga', 'Mpanda', 'Mlele', 'Nsimbo', 'Ikube',
];

export {
  ROLE_LABELS,
  ROLE_ICONS,
  ROLE_COLORS,
  NOTIFICATION_TYPES,
  CROP_CATEGORIES,
  REGIONS,
};
