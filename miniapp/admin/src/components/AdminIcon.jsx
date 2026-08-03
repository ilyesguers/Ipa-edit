import React from 'react';

// A compact local SVG set for the admin shell. It avoids a heavyweight icon
// package and keeps actions visually consistent without decorative emoji.
const PATHS = {
  dashboard: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 20v-6h6v6" /></>,
  categories: <><path d="M4 7.5 12 4l8 3.5L12 11 4 7.5Z" /><path d="M4 12 12 15.5 20 12M4 16.5 12 20l8-3.5" /></>,
  product: <><path d="M4 7.5 12 4l8 3.5v8L12 20l-8-4.5v-8Z" /><path d="m4 7.5 8 4 8-4M12 11.5V20" /></>,
  inventory: <><path d="M4 8h16v11H4z" /><path d="M7 8V5h10v3M9 12h6M12 12v4" /></>,
  orders: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  users: <><circle cx="9" cy="9" r="3" /><path d="M3.5 20c.5-3.2 2.4-5 5.5-5s5 1.8 5.5 5M16 8a2.5 2.5 0 1 1 0 5M17 15c2.1.2 3.4 1.8 3.7 4" /></>,
  coupon: <><path d="M5 8a2 2 0 0 0 0 4v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4a2 2 0 0 0 0-4V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v1Z" /><path d="M12 7.5v9" /></>,
  broadcast: <><path d="m4 13 14-7v12L4 11v2Z" /><path d="M8 14.5 9.5 19h3L12 13" /><path d="M20 9.5v5" /></>,
  media: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m5 17 4.5-4 3 2.5 2.5-3 4 4.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.5v-3l-2-.7a5.6 5.6 0 0 0-.7-1.6l.9-1.9-2.1-2.1-1.9.9a5.6 5.6 0 0 0-1.6-.7L11 2h-3l-.7 2.2a5.6 5.6 0 0 0-1.6.7l-1.9-.9-2.1 2.1.9 1.9a5.6 5.6 0 0 0-.7 1.6L0 10.5v3l2 .7c.2.6.4 1.1.7 1.6l-.9 1.9 2.1 2.1 1.9-.9c.5.3 1 .5 1.6.7L8 22h3l.7-2.2c.6-.2 1.1-.4 1.6-.7l1.9.9 2.1-2.1-.9-1.9c.3-.5.5-1 .7-1.6l2-.7Z" transform="scale(.92) translate(1 1)" /></>,
  store: <><path d="M4 10h16v10H4z" /><path d="M3 10 5 4h14l2 6M8 20v-6h8v6" /><path d="M4 10c0 1.4 1.2 2.5 2.7 2.5S9.5 11.4 9.5 10c0 1.4 1.2 2.5 2.7 2.5s2.8-1.1 2.8-2.5c0 1.4 1.2 2.5 2.7 2.5S20 11.4 20 10" /></>,
  refresh: <><path d="M19 8V4l-2 2a7 7 0 1 0 1.4 8.7" /><path d="M17 4h-4" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  chevronLeft: <path d="m14.5 5-7 7 7 7" />,
  chevronRight: <path d="m9.5 5 7 7-7 7" />,
  check: <path d="m5 12 4.2 4.2L19 6.8" />,
  warning: <><path d="M12 4 21 20H3L12 4Z" /><path d="M12 9v4M12 16h.01" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z" /><path d="M4 8h13a2 2 0 0 1 2 2v4h-4a2 2 0 1 1 0-4h4" /></>,
  chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3-4 3 2 5-6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4.5 4.5" /></>,
  shield: <path d="M12 3 19 6v5c0 4.5-2.8 7.5-7 10-4.2-2.5-7-5.5-7-10V6l7-3Z" />
};

const ALIASES = { home: 'dashboard', products: 'product', keys: 'inventory', user: 'users', image: 'media', gear: 'settings', edit: 'settings' };

export default function AdminIcon({ name = 'dashboard', size = '1em', className = '', style = {} }) {
  const normalized = String(name).trim();
  const icon = PATHS[normalized] ? normalized : (ALIASES[normalized] || 'dashboard');
  return (
    <svg
      aria-hidden="true"
      className={`admin-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, ...style }}
    >
      {PATHS[icon]}
    </svg>
  );
}
