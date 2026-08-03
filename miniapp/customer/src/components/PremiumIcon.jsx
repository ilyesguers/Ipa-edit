import React from 'react';

// Small local SVG set instead of a full icon library. It keeps the customer
// bundle light on mobile while giving every action one consistent visual cue.
const PATHS = {
  gamepad: <><path d="M7 9.5h10c2.2 0 3.4 1.5 3.9 4.2l.5 2.8c.3 1.8-1.7 2.7-2.7 1.4l-1.6-2H7l-1.6 2c-1 1.3-3 .4-2.7-1.4l.5-2.8C3.6 11 4.8 9.5 7 9.5Z" /><path d="M7.5 12.5v3M6 14h3M16.5 13.2h.01M18.5 14.8h.01" /></>,
  key: <><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12H21M17 12v3M14.5 12v2" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.1 2.3 3.2 5.1 3.2 8.5S14.1 18.2 12 20.5C9.9 18.2 8.8 15.4 8.8 12S9.9 5.8 12 3.5Z" /></>,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z" /><path d="M4 8h13a2 2 0 0 1 2 2v4h-4a2 2 0 1 1 0-4h4" /></>,
  orders: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.4 3-5.5 7-5.5s6.5 2.1 7 5.5" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  support: <><path d="M5 12a7 7 0 0 1 14 0v4a2 2 0 0 1-2 2h-2v-5h4M9 18H7a2 2 0 0 1-2-2v-4" /><path d="M9 20h4" /></>,
  chat: <><path d="M5 5.5h14v10H10l-4 3v-3H5z" /><path d="M8 10.5h8" /></>,
  shopping: <><path d="M4 5h2l1.5 10h9L19 8H7" /><circle cx="9" cy="19" r="1" /><circle cx="16" cy="19" r="1" /></>,
  coin: <><circle cx="12" cy="12" r="8.5" /><path d="M14.7 8.7c-.6-.6-1.5-.9-2.6-.9-1.6 0-2.8.9-2.8 2.1 0 3.2 5.4 1.2 5.4 4.1 0 1.2-1.1 2.1-2.8 2.1-1.1 0-2.2-.4-2.9-1.1M12 6.5v11" /></>,
  copy: <><rect x="8" y="8" width="10" height="11" rx="1.5" /><path d="M6 16H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 4h8.5A1.5 1.5 0 0 1 15 5.5V6" /></>,
  checkmark: <path d="m5 12 4.2 4.2L19 6.8" />,
  cancel: <><path d="m7 7 10 10M17 7 7 17" /><circle cx="12" cy="12" r="8.5" /></>,
  alert: <><path d="M12 4 21 20H3L12 4Z" /><path d="M12 9v4M12 16h.01" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 9.5h16" /></>,
  rocket: <><path d="M14 5c2.5-2.2 5.1-2.2 5.1-2.2S19.2 5.4 17 8l-4.2 4.2-3.4-3.4L14 5Z" /><path d="m9.4 8.8-3.1.3-2.5 2.5 4.4.9M12.8 12.2l-.3 3.1-2.5 2.5-.9-4.4M8.3 15.7l-2.1 2.1M11.6 7.6l4.8 4.8" /></>,
  star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
  box: <><path d="m4 8 8-4 8 4v8l-8 4-8-4V8Z" /><path d="m4 8 8 4 8-4M12 12v8" /></>,
  left: <path d="m14.5 5-7 7 7 7" />,
  right: <path d="m9.5 5 7 7-7 7" />,
  down: <path d="m5 9 7 7 7-7" />,
  admin: <><path d="m4 9 3-5 5 3 5-3 3 5-8 8-8-8Z" /><path d="M7 17v3h10v-3" /></>,
  help: <><circle cx="12" cy="12" r="8.5" /><path d="M9.5 9.5a2.6 2.6 0 1 1 4.1 2.1c-1.1.8-1.6 1.3-1.6 2.4M12 16.5h.01" /></>,
  bolt: <path d="m13.5 3-7 10h5l-1 8 7-10h-5l1-8Z" />
};

const ALIASES = {
  controller: 'gamepad', games: 'gamepad', shop: 'shopping', gem: 'key', diamond: 'key',
  fire: 'bolt', flame: 'bolt', explosion: 'alert', ghost: 'alert', crown: 'admin',
  trophy: 'star', shield: 'checkmark', safe: 'checkmark', success: 'checkmark',
  back: 'left', profile: 'user', users: 'user', money: 'coin', cash: 'coin',
  mobile: 'rocket', megaphone: 'support', settings: 'admin', gear: 'admin'
};

export default function PremiumIcon({ name = 'gamepad', size = '1em', className = '', style = {} }) {
  const normalized = String(name || 'gamepad').toLowerCase().trim();
  const iconName = PATHS[normalized] ? normalized : (ALIASES[normalized] || 'gamepad');
  return (
    <svg
      aria-hidden="true"
      className={`premium-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, ...style }}
    >
      {PATHS[iconName] || PATHS.gamepad}
    </svg>
  );
}

export { PATHS as ICONS };
