import React from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';

const TABS = [
  { id: 'products', icon: '🛍️', label: 'المنتجات' },
  { id: 'keys', icon: '🔑', label: 'مفاتيحي' },
  { id: 'history', icon: '📋', label: 'تاريخ' },
  { id: 'profile', icon: '👤', label: 'حسابي' },
  { id: 'support', icon: '👩‍💼', label: 'سارة' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, reset } = useStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-[#1a1a1a]">
      <div className="flex items-center justify-around px-2 py-1 pb-safe">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== 'products') reset(); }}
              whileTap={{ scale: 0.85 }}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all relative"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 rounded-xl bg-neon/10 border border-neon/20"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <motion.span
                className="text-xl relative z-10"
                animate={{ scale: isActive ? 1.2 : 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {tab.icon}
              </motion.span>
              <span className={`text-[9px] font-semibold relative z-10 transition-colors ${isActive ? 'text-neon' : 'text-muted'}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon"
                  style={{ boxShadow: '0 0 6px #00ff88' }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
