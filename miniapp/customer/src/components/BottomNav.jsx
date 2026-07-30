import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import { t } from '../i18n';
import PremiumIcon from './PremiumIcon';

const TABS = [
  { id: 'products', icon: 'gamepad', key: 'navProducts' },
  { id: 'keys', icon: 'key', key: 'navKeys' },
  { id: 'history', icon: 'shopping', key: 'navHistory' },
  { id: 'profile', icon: 'profile', key: 'navProfile' },
  { id: 'support', icon: 'support', key: 'navSupport' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, reset, locale } = useStore();

  const navigate = (tab) => {
    setActiveTab(tab);
    // A single navigation action also closes any old shop path/sheet.
    if (tab !== 'products') reset();
  };

  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-[#1a1a1a]" aria-label={t(locale, 'navProducts')}>
      <div className="mobile-nav-inner flex items-center justify-around px-2 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              aria-label={t(locale, tab.key)}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => navigate(tab.id)}
              whileTap={{ scale: 0.88 }}
              className={`mobile-nav-item flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all relative ${isActive ? 'text-neon' : 'text-muted'}`}
            >
              {isActive && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-neon/10 border border-neon/20" />}
              <motion.span className="relative z-10 text-xl" animate={{ scale: isActive ? 1.16 : 1, y: isActive ? -2 : 0 }}>
                <PremiumIcon name={tab.icon} />
              </motion.span>
              <span className="text-[9px] font-bold relative z-10">{t(locale, tab.key)}</span>
              {isActive && <motion.div layoutId="nav-dot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-neon" style={{ boxShadow: '0 0 8px #00ff88' }} />}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
