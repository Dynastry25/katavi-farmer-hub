export const ROLE_TABS = {
  admin: [
    { id: 'overview', label: 'Dashibodi', icon: 'fas fa-chart-pie' },
    { id: 'users', label: 'Watumiaji', icon: 'fas fa-users-cog' },
    { id: 'products', label: 'Mazao', icon: 'fas fa-leaf' },
    { id: 'market-prices', label: 'Bei za Soko', icon: 'fas fa-chart-line' },
    { id: 'loans', label: 'Mikopo', icon: 'fas fa-hand-holding-usd' },
    { id: 'groups', label: 'Vikundi', icon: 'fas fa-users' },
    { id: 'advisory', label: 'Ushauri', icon: 'fas fa-book-medical' },
    { id: 'news', label: 'Habari', icon: 'fas fa-newspaper' },
    { id: 'weather', label: 'Hali ya Hewa', icon: 'fas fa-cloud-sun' },
    { id: 'notifications', label: 'Arifa', icon: 'fas fa-bell' },
    { id: 'ratings', label: 'Ukadiriaji', icon: 'fas fa-star' },
    { id: 'disputes', label: 'Migogoro', icon: 'fas fa-exclamation-triangle' },
    { id: 'audit-logs', label: 'Rodi za Ukaguzi', icon: 'fas fa-clipboard-list' },
    { id: 'forecast', label: 'Matokeo ya Baadaye', icon: 'fas fa-chart-line' },
    { id: 'settings', label: 'Mipangilio', icon: 'fas fa-cog' },
  ],
  farmer: [
    { id: 'overview', label: 'Mapitio', icon: 'fas fa-chart-pie' },
    { id: 'mycrops', label: 'Mazao Yangu', icon: 'fas fa-seedling' },
    { id: 'products', label: 'Bidhaa Zangu', icon: 'fas fa-industry' },
    { id: 'orders', label: 'Maagizo', icon: 'fas fa-shopping-cart', badgeKey: 'orders' },
    { id: 'prices', label: 'Bei ya Soko', icon: 'fas fa-chart-line' },
    { id: 'finance', label: 'Kifedha (Faida/Hasara)', icon: 'fas fa-wallet' },
    { id: 'assistant', label: 'Shamba Assistant', icon: 'fas fa-seedling' },
    { id: 'chat', label: 'Barua na Ushauri', icon: 'fas fa-comments' },
    { id: 'groups', label: 'Vikundi Vyangu', icon: 'fas fa-users' },
    { id: 'loans', label: 'Mikopo Yangu', icon: 'fas fa-hand-holding-usd' },
    { id: 'analytics', label: 'Takwimu', icon: 'fas fa-chart-line' },
  ],
  buyer: [
    { id: 'overview', label: 'Mapitio', icon: 'fas fa-chart-pie' },
    { id: 'marketplace', label: 'Soko la Mazao', icon: 'fas fa-store' },
    { id: 'statistics', label: 'Takwimu za Biashara', icon: 'fas fa-chart-column' },
    { id: 'orders', label: 'Maagizo Yangu', icon: 'fas fa-shopping-cart', badgeKey: 'orders' },
    { id: 'farmers', label: 'Wakulima', icon: 'fas fa-users' },
    { id: 'analytics', label: 'Takwimu', icon: 'fas fa-chart-line' },
  ],
  expert: [
    { id: 'overview', label: 'Mapitio', icon: 'fas fa-chart-pie' },
    { id: 'articles', label: 'Makala Yangu', icon: 'fas fa-newspaper' },
    { id: 'consultations', label: 'Maswali', icon: 'fas fa-comments', badgeKey: 'consultations' },
    { id: 'earnings', label: 'Mapato', icon: 'fas fa-chart-line' },
    { id: 'schedule', label: 'Ratiba', icon: 'fas fa-calendar' },
    { id: 'statistics', label: 'Takwimu za Utaalam', icon: 'fas fa-chart-column' },
  ],
  support: [
    { id: 'overview', label: 'Dashibodi', icon: 'fas fa-chart-pie' },
    { id: 'users', label: 'Watumiaji', icon: 'fas fa-users-cog' },
    { id: 'disputes', label: 'Migogoro', icon: 'fas fa-exclamation-triangle' },
  ],
  content_moderator: [
    { id: 'overview', label: 'Dashibodi', icon: 'fas fa-chart-pie' },
    { id: 'products', label: 'Mazao', icon: 'fas fa-leaf' },
    { id: 'market-prices', label: 'Bei za Soko', icon: 'fas fa-chart-line' },
    { id: 'advisory', label: 'Ushauri', icon: 'fas fa-book-medical' },
    { id: 'news', label: 'Habari', icon: 'fas fa-newspaper' },
  ],
  finance_officer: [
    { id: 'overview', label: 'Dashibodi', icon: 'fas fa-chart-pie' },
    { id: 'market-prices', label: 'Bei za Soko', icon: 'fas fa-chart-line' },
    { id: 'loans', label: 'Mikopo', icon: 'fas fa-hand-holding-usd' },
  ],
};

export const REPORT_LABELS = {
  admin: { label: 'Ripoti', icon: 'fas fa-chart-bar' },
  farmer: { label: 'Ripoti', icon: 'fas fa-file-alt' },
  buyer: { label: 'Ripoti', icon: 'fas fa-file-alt' },
  expert: { label: 'Ripoti', icon: 'fas fa-chart-bar' },
  support: { label: 'Ripoti', icon: 'fas fa-file-alt' },
  content_moderator: { label: 'Ripoti', icon: 'fas fa-file-alt' },
  finance_officer: { label: 'Ripoti', icon: 'fas fa-chart-line' },
};

const ADMIN_DASHBOARD_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];

export function getRoleNavSections({ role, navigate, activeTab, badges = {}, onTab }) {
  const base = ADMIN_DASHBOARD_ROLES.includes(role) ? '/admin-dashboard' : `/${role}-dashboard`;
  const tabs = (ROLE_TABS[role] || ROLE_TABS.farmer).map((t) => ({
    id: t.id,
    label: t.label,
    icon: t.icon,
    badge: t.badgeKey ? (badges[t.badgeKey] || 0) : undefined,
    active: activeTab === t.id,
    onClick: () => {
      if (onTab) onTab(t.id);
      else navigate(`${base}?tab=${t.id}`);
    },
  }));

  const rep = REPORT_LABELS[role] || REPORT_LABELS.farmer;

  return [
    {
      label: 'Kuabiri',
      links: tabs,
    },
    {
      label: 'Akaunti',
      links: [
        {
          id: 'profile',
          label: 'Wasifu',
          icon: 'fas fa-user-cog',
          active: activeTab === 'profile',
          onClick: () => navigate('/profile'),
        },
        {
          id: 'reports',
          label: rep.label,
          icon: rep.icon,
          active: activeTab === 'reports',
          onClick: () => navigate('/my-reports'),
        },
      ],
    },
  ];
}
