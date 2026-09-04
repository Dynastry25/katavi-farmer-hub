const ROLE_LABELS = {
  farmer: 'Mkulima',
  buyer: 'Mnunuzi',
  expert: 'Mtaalamu',
  admin: 'Msimamizi',
};

const ROLE_ICONS = {
  farmer: 'fas fa-seedling',
  buyer: 'fas fa-shopping-cart',
  expert: 'fas fa-user-md',
  admin: 'fas fa-shield-alt',
};

const ROLE_COLORS = {
  farmer: '#22c55e',
  buyer: '#3b82f6',
  expert: '#8b5cf6',
  admin: '#ef4444',
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
