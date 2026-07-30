import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import api from './utils/api';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Users from './pages/Users';
import Orders from './pages/Orders';
import Coupons from './pages/Coupons';
import Settings from './pages/Settings';
import Broadcast from './pages/Broadcast';
import LoadingScreen from './components/LoadingScreen';

const PAGES = { dashboard: Dashboard, categories: Categories, products: Products, inventory: Inventory, users: Users, orders: Orders, coupons: Coupons, settings: Settings, broadcast: Broadcast };

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    api.post('/auth/telegram', { initData: tg?.initData || '' })
      .then(res => {
        if (!res.data.user?.isAdmin) {
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#ff3b5c;font-size:20px;font-family:Cairo">⛔ غير مصرح لك بالوصول</div>';
          return;
        }
        localStorage.setItem('admin_token', res.data.token);
        setUser(res.data.user);
        setLoading(false);
      })
      .catch(() => {
        // Dev fallback
        setUser({ firstName: 'Admin', role: 'admin', isAdmin: true, balance: 0 });
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingScreen />;

  const ActivePage = PAGES[activePage] || Dashboard;

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Toaster position="top-left" toastOptions={{ style: { background: '#12121c', color: '#fff', border: '1px solid #1e1e30', fontFamily: 'Cairo' } }} />

      {/* Sidebar (desktop) */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-30 lg:hidden" />
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-card border border-border text-neon">☰</button>
            <h1 className="text-white font-black text-base">Admin Dashboard ⚙️</h1>
          </div>
          <div className="flex items-center gap-2">
            <MaintenanceToggle />
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
              <span className="text-xs text-muted font-semibold">{user?.firstName}</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activePage} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} transition={{ duration: 0.2 }} className="p-4">
              <ActivePage setActivePage={setActivePage} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function MaintenanceToggle() {
  const [maintenance, setMaintenance] = useState(false);
  useEffect(() => {
    api.get('/settings').then(r => setMaintenance(r.data.data?.maintenance_mode || false)).catch(() => {});
  }, []);
  const toggle = async () => {
    const next = !maintenance;
    await api.put('/settings/maintenance_mode', { value: next });
    setMaintenance(next);
  };
  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={toggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
        ${maintenance ? 'bg-warning/10 border-warning/30 text-warning' : 'bg-card border-border text-muted'}`}>
      🔧 {maintenance ? 'الصيانة: مفعّل' : 'الصيانة'}
    </motion.button>
  );
}
