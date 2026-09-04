export const ROLE_TABS = {
  admin: [
    { id: 'overview', label: 'Mapitio ya Mfumo', icon: 'fas fa-chart-pie' },
    { id: 'users', label: 'Watumiaji', icon: 'fas fa-users-cog' },
  ],
  farmer: [
    { id: 'overview', label: 'Mapitio', icon: 'fas fa-chart-pie' },
    { id: 'mycrops', label: 'Mazao Yangu', icon: 'fas fa-seedling' },
    { id: 'products', label: 'Bidhaa Zangu', icon: 'fas fa-industry' },
    { id: 'orders', label: 'Maagizo', icon: 'fas fa-shopping-cart', badgeKey: 'orders' },
    { id: 'analytics', label: 'Takwimu', icon: 'fas fa-chart-line' },
  ],
  buyer: [
    { id: 'overview', label: 'Mapitio', icon: 'fas fa-chart-pie' },
    { id: 'marketplace', label: 'Soko la Mazao', icon: 'fas fa-store' },
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
  ],
};

export const REPORT_LABELS = {
  admin: { label: 'Ripoti', icon: 'fas fa-chart-bar' },
  farmer: { label: 'Ripoti', icon: 'fas fa-file-alt' },
  buyer: { label: 'Ripoti', icon: 'fas fa-file-alt' },
  expert: { label: 'Ripoti', icon: 'fas fa-chart-bar' },
};

/**
 * Shared navSections zile zile kwa dashboard na reports.
 * activeTab inaweza kuwa tab id ('overview', ...), 'profile', au 'reports'.
 * onTab: optional. Kwa dashboard inapita setActiveTab; bila hiyo ina-navigate kwenda dashboard?tab=id.
 */
export function getRoleNavSections({ role, navigate, activeTab, badges = {}, onTab }) {
  const base = `/${role}-dashboard`;
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
