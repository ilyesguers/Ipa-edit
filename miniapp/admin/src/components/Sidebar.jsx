import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  { id: 'dashboard', icon: '📊', label: 'الإحصائيات' },
  { id: 'categories', icon: '📂', label: 'الأقسام والألعاب' },
  { id: 'products', icon: '🔑', label: 'المنتجات' },
  { id: 'inventory', icon: '📦', label: 'المخزون' },
  { id: 'orders', icon: '🛒', label: 'الطلبات' },
  { id: 'users', icon: '👥', label: 'المستخدمون' },
  { id: 'coupons', icon: '🎫', label: 'الكوبونات' },
  { id: 'broadcast', icon: '📢', label: 'الإذاعة' },
  { id: 'settings', icon: '⚙️', label: 'الإعدادات' },
];

export default function Sidebar({ activePage, setActivePage, user, sidebarOpen, setSidebarOpen }) {
  const content = (
    <div className="flex flex-col h-full bg-panel border-l border-border w-64">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center text-xl">🔑</div>
          <div>
            <p className="font-black text-white text-sm">Digital Keys</p>
            <p className="text-neon text-[10px] font-semibold">ADMIN PANEL</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => { setActivePage(item.id); setSidebarOpen(false); }}
            className={`sidebar-item w-full text-right ${activePage === item.id ? 'active' : ''}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
            {activePage === item.id && (
              <motion.div layoutId="sidebar-indicator" className="mr-auto w-1.5 h-5 rounded-full bg-neon" style={{ boxShadow: '0 0 8px #00d4ff' }} />
            )}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
          <div className="w-8 h-8 rounded-lg bg-neon/10 flex items-center justify-center text-neon text-sm">👑</div>
          <div>
            <p className="text-white text-xs font-bold">{user?.firstName}</p>
            <p className="text-neon text-[10px]">Super Admin</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex">{content}</div>

      {/* Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 z-40 lg:hidden"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
