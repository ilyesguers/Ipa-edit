import React from 'react';
import useStore from '../store/useStore';
import { t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';

// Four clear destinations fit comfortably on narrow Telegram webviews. Support
// remains available from the store landing card and the account section.
const TABS = [
  { id: 'products', icon: 'gamepad', key: 'navProducts' },
  { id: 'keys', icon: 'key', key: 'navKeys' },
  { id: 'history', icon: 'orders', key: 'navHistory' },
  { id: 'profile', icon: 'user', key: 'navProfile' }
];

export default function BottomNav() {
  const { activeTab, setActiveTab, reset, locale } = useStore();

  const navigate = (tab) => {
    haptic.light();
    setActiveTab(tab);
    if (tab !== 'products') reset();
  };

  return (
    <nav className="mobile-nav" aria-label="Primary navigation">
      <div className="mobile-nav-inner">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-label={t(locale, tab.key)}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.id)}
              className={`mobile-nav-item ${active ? 'active' : ''}`}
            >
              <PremiumIcon name={tab.icon} size="1.2rem" />
              <span>{t(locale, tab.key)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
