import React, { useEffect, useMemo, useState } from 'react';
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

const PAGES = {
  dashboard: { component: Dashboard, title: 'لوحة التحكم', subtitle: 'نظرة سريعة على الأداء والاختصارات المهمة', icon: '🪄' },
  categories: { component: Categories, title: 'الأقسام والألعاب', subtitle: 'تنظيم الأقسام والألعاب ومسارات البيع', icon: '🗂️' },
  products: { component: Products, title: 'المنتجات', subtitle: 'إدارة المنتجات والمدد والأسعار والتفاصيل', icon: '🔑' },
  inventory: { component: Inventory, title: 'المخزون', subtitle: 'إضافة المفاتيح ومراقبة التوفر بشكل مباشر', icon: '📦' },
  orders: { component: Orders, title: 'الطلبات', subtitle: 'متابعة المدفوعات وحالة التسليم بدقة', icon: '🛒' },
  users: { component: Users, title: 'المستخدمون', subtitle: 'بحث سريع، أرصدة، رسائل، وحظر/فك حظر', icon: '👥' },
  coupons: { component: Coupons, title: 'الكوبونات', subtitle: 'إطلاق خصومات مرنة وعروض مستهدفة', icon: '🎟️' },
  broadcast: { component: Broadcast, title: 'الإذاعة', subtitle: 'إرسال رسائل منسقة للجمهور المناسب', icon: '📢' },
  settings: { component: Settings, title: 'الإعدادات والتصميم', subtitle: 'إدارة الهوية البصرية والأزرار والنصوص والإعدادات العامة', icon: '🎛️' },
};

const parseLocationState = () => {
  const raw = (window.location.hash || '#dashboard').replace(/^#/, '');
  const [pageRaw, searchRaw = ''] = raw.split('?');
  const page = PAGES[pageRaw] ? pageRaw : 'dashboard';
  const params = new URLSearchParams(searchRaw);
  const query = Object.fromEntries(params.entries());
  return { page, query };
};

export default function App() {
  const initialRoute = useMemo(() => parseLocationState(), []);
  const [activePage, setActivePage] = useState(initialRoute.page);
  const [routeQuery, setRouteQuery] = useState(initialRoute.query);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    const handleNav = (e) => {
      const nextPage = e.detail?.page || e.detail;
      const nextQuery = e.detail?.query || {};
      if (PAGES[nextPage]) {
        setActivePage(nextPage);
        setRouteQuery(nextQuery);
      }
    };

    const syncFromHash = () => {
      const next = parseLocationState();
      setActivePage(next.page);
      setRouteQuery(next.query);
    };

    window.addEventListener('admin-navigate', handleNav);
    window.addEventListener('hashchange', syncFromHash);
    return () => {
      window.removeEventListener('admin-navigate', handleNav);
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(routeQuery);
    const nextHash = params.toString() ? `#${activePage}?${params.toString()}` : `#${activePage}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [activePage, routeQuery]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    api.post('/auth/telegram', { initData: tg?.initData || '' })
      .then((res) => {
        if (!res.data.user?.isAdmin) {
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#ff3b5c;font-size:20px;font-family:Cairo">⛔ غير مصرح لك بالوصول</div>';
          return;
        }
        localStorage.setItem('admin_token', res.data.token);
        setUser(res.data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser({ firstName: 'Admin', role: 'admin', isAdmin: true, balance: 0 });
        setLoading(false);
      });

    api.get('/settings').then((r) => setMaintenance(r.data.data?.maintenance_mode || false)).catch(() => {});
  }, []);

  const toggleMaintenance = async () => {
    const next = !maintenance;
    try {
      await api.put('/settings/maintenance_mode', { value: next });
      setMaintenance(next);
    } catch (err) {
      console.error('Failed to toggle maintenance:', err);
    }
  };

  if (loading) return <LoadingScreen />;

  const pageMeta = PAGES[activePage] || PAGES.dashboard;
  const ActivePage = pageMeta.component;

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Toaster position="top-left" toastOptions={{ style: { background: '#12121c', color: '#fff', border: '1px solid #1e1e30', fontFamily: 'Cairo' } }} />

      <Sidebar activePage={activePage} setActivePage={setActivePage} setRouteQuery={setRouteQuery} user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel/95 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-card border border-border text-neon">☰</button>
            <div className="w-11 h-11 rounded-2xl border border-neon/20 bg-neon/10 flex items-center justify-center text-xl shrink-0">{pageMeta.icon}</div>
            <div className="min-w-0">
              <h1 className="text-white font-black text-base truncate">{pageMeta.title}</h1>
              <p className="text-muted text-[11px] truncate">{pageMeta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a href="/customer" target="_blank" rel="noreferrer" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-muted hover:text-white text-xs font-bold transition-all">
              📱 المتجر
            </a>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMaintenance}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${maintenance ? 'bg-warning/10 border-warning/30 text-warning' : 'bg-card border-border text-muted hover:text-white'}`}
            >
              🔧 {maintenance ? 'الصيانة ON' : 'الصيانة'}
            </motion.button>
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5">
              <span className="relative">
                <span className="w-2 h-2 rounded-full bg-green inline-block" />
                <span className="absolute inset-0 w-2 h-2 rounded-full bg-green animate-ping opacity-50" />
              </span>
              <span className="text-xs text-muted font-semibold">{user?.firstName}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activePage}-${JSON.stringify(routeQuery)}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.2 }}
              className="p-4 max-w-6xl mx-auto"
            >
              <ActivePage setActivePage={setActivePage} routeQuery={routeQuery} setRouteQuery={setRouteQuery} currentUser={user} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
