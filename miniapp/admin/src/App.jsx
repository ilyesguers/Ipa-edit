import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import api from './utils/api';
import Sidebar from './components/Sidebar';
import LoadingScreen from './components/LoadingScreen';

// Code-split every page — only the visited page is downloaded & mounted,
// so the admin portal opens fast and switching pages doesn't jank.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Categories = lazy(() => import('./pages/Categories'));
const Products = lazy(() => import('./pages/Products'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Users = lazy(() => import('./pages/Users'));
const Orders = lazy(() => import('./pages/Orders'));
const Coupons = lazy(() => import('./pages/Coupons'));
const Settings = lazy(() => import('./pages/Settings'));
const Broadcast = lazy(() => import('./pages/Broadcast'));

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
  const [authError, setAuthError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [unreadOrders, setUnreadOrders] = useState(0);

  // Real-time order notifications via socket.io
  useEffect(() => {
    if (!user?.isAdmin) return undefined;
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('connect', () => socket.emit('admin_join'));
    socket.on('new_order', (data) => {
      setUnreadOrders((n) => n + 1);
      toast(
        <div dir="rtl" className="space-y-0.5 cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('admin-navigate', { detail: 'orders' }))}>
          <p className="font-black text-white text-[13px]">{data.type === 'payment_proof' ? '💳 إثبات دفع جديد!' : '🛒 طلب جديد وصل!'}</p>
          <p className="text-xs text-muted">{data.productName}{data.durationName ? ` - ${data.durationName}` : ''}</p>
          <p className="text-[11px] text-neon font-bold">💰 ${Number(data.amount || 0).toFixed(2)} · @{data.username || data.telegramId}</p>
        </div>,
        { duration: 8000 }
      );
    });
    return () => socket.close();
  }, [user?.isAdmin]);

  useEffect(() => {
    if (activePage === 'orders') setUnreadOrders(0);
  }, [activePage]);

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
          setAuthError('⛔ غير مصرح لك بالوصول');
          setLoading(false);
          return;
        }
        localStorage.setItem('admin_token', res.data.token);
        setUser(res.data.user);
        setLoading(false);
      })
      .catch((err) => {
        // Never fall back to a fake admin account — show a clear error instead
        setAuthError(err.response?.status === 401
          ? '🔐 تعذر التحقق من الهوية - افتح اللوحة من داخل تيليجرام'
          : '🔌 تعذر الاتصال بالسيرفر - تأكد من اتصالك وحاول مجدداً');
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

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-center p-6">
        <div className="text-6xl mb-5">🛡️</div>
        <h1 className="text-white font-black text-xl mb-3">أمم... مشكلة في الدخول</h1>
        <p className="text-muted text-sm mb-6 max-w-xs leading-6">{authError}</p>
        <button
          onClick={() => window.location.reload()}
          className="neon-btn px-6 py-3 rounded-xl font-bold text-sm"
        >
          🔄 إعادة المحاولة
        </button>
        <p className="text-[10px] text-muted mt-6">افتح اللوحة من زر WebApp داخل البوت أو من تطبيق تيليجرام</p>
      </div>
    );
  }

  const pageMeta = PAGES[activePage] || PAGES.dashboard;
  const ActivePage = pageMeta.component;

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Toaster position="top-left" toastOptions={{ style: { background: '#161922', color: '#fff', border: '1px solid #1f2430', fontFamily: 'Cairo' } }} />

      <Sidebar activePage={activePage} setActivePage={setActivePage} setRouteQuery={setRouteQuery} user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} unreadOrders={unreadOrders} />

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel sticky top-0 z-20">
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-4 max-w-6xl mx-auto"
            >
              <Suspense fallback={<div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>}>
                <ActivePage setActivePage={setActivePage} routeQuery={routeQuery} setRouteQuery={setRouteQuery} currentUser={user} />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
