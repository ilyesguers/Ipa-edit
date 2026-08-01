import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import { t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';

const TABS = [
  { id: 'products', icon: 'rocket', key: 'navProducts', label: 'PLAY', color: '#10b981' },
  { id: 'keys', icon: 'gem', key: 'navKeys', label: 'KEYS', color: '#3b82f6' },
  { id: 'history', icon: 'crown', key: 'navHistory', label: 'ORDERS', color: '#fbbf24' },
  { id: 'profile', icon: 'fire', key: 'navProfile', label: 'PROFILE', color: '#f97316' },
  { id: 'support', icon: 'explosion', key: 'navSupport', label: 'SUPPORT', color: '#ef4444' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, reset, locale } = useStore();

  const navigate = (tab) => {
    haptic.light();
    setActiveTab(tab);
    if (tab !== 'products') reset();
  };

  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-[#0d0f12]/95 to-transparent pointer-events-none" />
      <div className="mobile-nav-inner flex items-center justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] relative">
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              aria-label={t(locale, tab.key)}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => navigate(tab.id)}
              whileTap={{ scale: 0.8 }}
              whileHover={{ y: -2 }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 300 }}
              className={`mobile-nav-item flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all relative group ${isActive ? 'active' : 'text-muted hover:text-white'}`}
            >
              {isActive && (
                <>
                  <motion.div 
                    layoutId="nav-pill" 
                    className="absolute inset-0 rounded-2xl border" 
                    style={{ 
                      background: `linear-gradient(135deg, ${tab.color}15, ${tab.color}05)`,
                      borderColor: `${tab.color}30`,
                      boxShadow: `0 0 20px ${tab.color}20, inset 0 0 10px ${tab.color}10`
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                  <motion.div 
                    layoutId="nav-glow"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                    style={{ background: tab.color, boxShadow: `0 0 10px ${tab.color}` }}
                  />
                </>
              )}
              
              <motion.span 
                className="relative z-10 text-[22px]" 
                animate={{ 
                  scale: isActive ? 1.25 : 1, 
                  y: isActive ? -3 : 0,
                  rotate: isActive ? [0, -10, 10, 0] : 0
                }}
                transition={{ 
                  scale: { type: 'spring', stiffness: 400 },
                  rotate: { duration: 0.5 }
                }}
                style={{ 
                  color: isActive ? tab.color : undefined,
                  filter: isActive ? `drop-shadow(0 0 8px ${tab.color})` : undefined
                }}
              >
                <PremiumIcon name={tab.icon} />
              </motion.span>
              
              <span className={`text-[9px] font-black tracking-widest relative z-10 transition-all font-[Orbitron] ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} style={{ color: isActive ? tab.color : undefined }}>
                {tab.label}
              </span>
              
              {isActive && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                  style={{ background: tab.color, boxShadow: `0 0 8px ${tab.color}` }} 
                />
              )}
            </motion.button>
          );
        })}
      </div>
      
      {/* Gaming accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon/30 to-transparent" />
    </nav>
  );
}
