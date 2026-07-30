import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV = [
  { id: 'dashboard', icon: '🪄', label: 'لوحة التحكم', desc: 'ملخص سريع' },
  { id: 'categories', icon: '🗂️', label: 'الأقسام والألعاب', desc: 'تنظيم البيع' },
  { id: 'products', icon: '🔑', label: 'المنتجات', desc: 'أسعار ومدد' },
  { id: 'inventory', icon: '📦', label: 'المخزون', desc: 'إضافة ومراقبة المفاتيح' },
  { id: 'orders', icon: '🛒', label: 'الطلبات', desc: 'مدفوعات وتسليم' },
  { id: 'users', icon: '👥', label: 'المستخدمون', desc: 'أرصدة ورسائل' },
  { id: 'coupons', icon: '🎟️', label: 'الكوبونات', desc: 'عروض وخصومات' },
  { id: 'broadcast', icon: '📢', label: 'الإذاعة', desc: 'حملات ورسائل' },
  { id: 'settings', icon: '🎛️', label: 'الإعدادات والتصميم', desc: 'هوية وأزرار' },
];

export default function Sidebar({ activePage, setActivePage, setRouteQuery, user, sidebarOpen, setSidebarOpen }) {
  const goTo = (page) => {
    setActivePage(page);
    setRouteQuery?.({});
    setSidebarOpen(false);
  };

  const content = (
    <div className="flex flex-col h-full bg-panel border-l border-border w-72">
      <div className="p-4 border-b border-border">
        <div className="rounded-2xl border border-neon/20 bg-gradient-to-br from-neon/10 to-transparent p-4 neon-glow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-neon/10 border border-neon/20 flex items-center justify-center text-2xl">👑</div>
            <div>
              <p className="font-black text-white text-base">Admin Portal</p>
              <p className="text-neon text-[11px] font-semibold">CONTROL • ORDERS • STOCK</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-[10px]">
            {[
              ['🛒', 'الطلبات'],
              ['📦', 'المخزون'],
              ['🎛️', 'الهوية'],
            ].map(([icon, label]) => (
              <div key={label} className="bg-card/70 border border-border rounded-xl py-2 text-muted">
                <div className="text-base mb-1">{icon}</div>
                <div>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => goTo(item.id)}
            className={`sidebar-item w-full text-right relative ${activePage === item.id ? 'active' : ''}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="flex-1 min-w-0 text-right">
              <span className="block truncate">{item.label}</span>
              <span className="block text-[10px] font-medium opacity-70 truncate">{item.desc}</span>
            </span>
            {activePage === item.id && (
              <motion.div
                layoutId="sidebar-bar"
                className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-neon"
                style={{ boxShadow: '0 0 10px #00d4ff' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="rounded-2xl bg-card border border-border p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-neon/10 flex items-center justify-center text-neon text-lg">🛡️</div>
              <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 bg-green rounded-full border border-card">
                <span className="absolute inset-0 bg-green rounded-full animate-ping opacity-50" />
              </span>
            </div>
            <div>
              <p className="text-white text-sm font-bold">{user?.firstName}</p>
              <p className="text-[10px] text-neon font-semibold">ONLINE ADMIN</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a href="/customer" target="_blank" rel="noreferrer" className="text-center text-xs rounded-xl border border-border bg-bg px-3 py-2 text-muted hover:text-white transition-all">
              📱 المتجر
            </a>
            <button onClick={() => goTo('settings')} className="text-center text-xs rounded-xl border border-neon/20 bg-neon/10 px-3 py-2 text-neon transition-all">
              🎨 التصميم
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:flex">{content}</div>

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
