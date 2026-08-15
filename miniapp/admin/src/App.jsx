import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import api from './utils/api';
import { canViewPage } from './utils/permissions';
import Sidebar from './components/Sidebar';
import LoadingScreen from './components/LoadingScreen';
import AdminIcon from './components/AdminIcon';
import AdminLogin from './components/AdminLogin';

// Load each workspace only when it is opened. The dashboard remains responsive
// on Telegram WebView and on slower Railway connections.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Categories = lazy(() => import('./pages/Categories'));
const Products = lazy(() => import('./pages/Products'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Users = lazy(() => import('./pages/Users'));
const Orders = lazy(() => import('./pages/Orders'));
const Coupons = lazy(() => import('./pages/Coupons'));
const Settings = lazy(() => import('./pages/Settings'));
const Broadcast = lazy(() => import('./pages/Broadcast'));
const Media = lazy(() => import('./pages/Media'));
const Wheel = lazy(() => import('./pages/Wheel'));

const PAGES = {
  dashboard: { component: Dashboard, title: 'لوحة التحكم', subtitle: 'نظرة مركزة على ما يحتاج المتابعة', icon: 'dashboard' },
  categories: { component: Categories, title: 'الأقسام والألعاب', subtitle: 'تنظيم مسار العرض والبيع', icon: 'categories' },
  products: { component: Products, title: 'المنتجات والأكواد', subtitle: 'المنتج والمدة والمخزون في مكان واحد', icon: 'product' },
  inventory: { component: Inventory, title: 'المخزون المتقدم', subtitle: 'مراجعة الأكواد وحالاتها', icon: 'inventory' },
  wheel: { component: Wheel, title: 'عجلة الحظ', subtitle: 'الجوائز والألعاب التفاعلية', icon: 'gift' },
  orders: { component: Orders, title: 'الطلبات', subtitle: 'المدفوعات والتسليم', icon: 'orders' },
  users: { component: Users, title: 'المستخدمون', subtitle: 'الحسابات والأرصدة والدعم', icon: 'users' },
  coupons: { component: Coupons, title: 'الكوبونات', subtitle: 'العروض والخصومات', icon: 'coupon' },
  broadcast: { component: Broadcast, title: 'الإذاعة', subtitle: 'رسائل مدروسة للجمهور المناسب', icon: 'broadcast' },
  media: { component: Media, title: 'الوسائط', subtitle: 'الصور وصورة البانر', icon: 'media' },
  settings: { component: Settings, title: 'الإعدادات', subtitle: 'هوية المتجر والبوت', icon: 'settings' }
};

const parseLocationState = () => {
  const raw = (window.location.hash || '#dashboard').replace(/^#/, '');
  const [pageRaw, searchRaw = ''] = raw.split('?');
  const page = PAGES[pageRaw] ? pageRaw : 'dashboard';
  return { page, query: Object.fromEntries(new URLSearchParams(searchRaw).entries()) };
};

// Login has its own clean URL and full-page layout. The built Express fallback
// serves both /admin/ and /admin/login, so refresh/deep links stay reliable.
const showLoginPath = () => {
  if (window.location.pathname !== '/admin/login') window.history.replaceState(null, '', '/admin/login');
  document.title = 'تسجيل دخول الإدارة | Gamer Store';
};
const showPanelPath = (page = 'dashboard') => {
  if (window.location.pathname !== '/admin/' && window.location.pathname !== '/admin') {
    window.history.replaceState(null, '', `/admin/#${page}`);
  }
  document.title = 'لوحة الإدارة | Gamer Store';
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
  const [loginGateEnabled, setLoginGateEnabled] = useState(true);
  const [loginGateBusy, setLoginGateBusy] = useState(false);
  const [unreadOrders, setUnreadOrders] = useState(0);

  useEffect(() => {
    const expireSession = () => {
      setUser(null);
      setAuthError(false);
      setLoading(false);
      showLoginPath();
      toast.error('انتهت جلسة الإدارة — سجّل الدخول من جديد');
    };
    window.addEventListener('admin-auth-expired', expireSession);
    return () => window.removeEventListener('admin-auth-expired', expireSession);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!user?.isAdmin) return undefined;
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('admin_token') || '' }
    });
    socket.on('new_order', (data) => {
      setUnreadOrders((count) => count + 1);
      toast(
        <button type="button" dir="rtl" className="admin-toast" onClick={() => window.dispatchEvent(new CustomEvent('admin-navigate', { detail: 'orders' }))}>
          <span><AdminIcon name={data.type === 'payment_proof' ? 'wallet' : 'orders'} /></span>
          <span>
            <strong>{data.type === 'payment_proof' ? 'إثبات دفع جديد' : 'طلب جديد'}</strong>
            <small>{data.productName}{data.durationName ? ` · ${data.durationName}` : ''}</small>
          </span>
        </button>,
        { duration: 8000 }
      );
    });
    return () => socket.close();
  }, [user?.isAdmin]);

  useEffect(() => {
    if (activePage === 'orders') setUnreadOrders(0);
  }, [activePage]);

  useEffect(() => {
    const handleNav = (event) => {
      const nextPage = event.detail?.page || event.detail;
      const nextQuery = event.detail?.query || {};
      if (PAGES[nextPage] && canViewPage(user, nextPage)) {
        setActivePage(nextPage);
        setRouteQuery(nextQuery);
      }
    };
    const syncFromHash = () => {
      const next = parseLocationState();
      setActivePage(canViewPage(user, next.page) ? next.page : 'dashboard');
      setRouteQuery(canViewPage(user, next.page) ? next.query : {});
    };
    window.addEventListener('admin-navigate', handleNav);
    window.addEventListener('hashchange', syncFromHash);
    return () => {
      window.removeEventListener('admin-navigate', handleNav);
      window.removeEventListener('hashchange', syncFromHash);
    };
  }, [user]);

  useEffect(() => {
    if (user && !canViewPage(user, activePage)) {
      setActivePage('dashboard');
      setRouteQuery({});
    }
  }, [user, activePage]);

  useEffect(() => {
    const params = new URLSearchParams(routeQuery);
    const nextHash = params.toString() ? `#${activePage}?${params.toString()}` : `#${activePage}`;
    if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash);
  }, [activePage, routeQuery]);

  const acceptAdmin = (nextUser) => {
    if (!nextUser?.isAdmin) {
      setAuthError('هذا الحساب لا يملك صلاحية الوصول إلى لوحة الإدارة.');
      setUser(null);
      showLoginPath();
    } else {
      setAuthError(false);
      setUser(nextUser);
      showPanelPath(activePage);
    }
    setLoading(false);
  };

  const loginWithTelegram = async () => {
    const initData = window.Telegram?.WebApp?.initData || '';
    if (!initData) return setLoading(false);
    setLoading(true);
    try {
      const response = await api.post('/auth/telegram', { initData });
      if (!response.data.user?.isAdmin) return acceptAdmin(null);
      localStorage.setItem('admin_token', response.data.token);
      acceptAdmin(response.data.user);
    } catch (error) {
      setAuthError(error.response?.status >= 500 ? 'تعذر الاتصال بالسيرفر. تحقق من الشبكة وحاول مرة أخرى.' : false);
      showLoginPath();
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const storedToken = localStorage.getItem('admin_token');
      if (storedToken) {
        try {
          const response = await api.get('/auth/me');
          if (active && response.data.user?.isAdmin) return acceptAdmin(response.data.user);
        } catch (_) {
          localStorage.removeItem('admin_token');
        }
      }
      if (active && window.Telegram?.WebApp?.initData) return loginWithTelegram();
      if (active) {
        showLoginPath();
        setLoading(false);
      }
    };
    restore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) return;
    api.get('/settings').then((response) => {
      const maintenanceValue = response.data.data?.maintenance_mode;
      setMaintenance(maintenanceValue === true || String(maintenanceValue) === 'true');
      const value = response.data.data?.access_login_enabled;
      setLoginGateEnabled(value !== false && String(value) !== 'false');
    }).catch(() => {});
  }, [user?.isAdmin]);

  const toggleMaintenance = async () => {
    const next = !maintenance;
    try {
      await api.put('/settings/maintenance_mode', { value: next });
      setMaintenance(next);
      toast.success(next ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة');
    } catch (_) {
      toast.error('تعذر تعديل وضع الصيانة');
    }
  };

  const toggleLoginGate = async () => {
    if (loginGateBusy) return;
    const next = !loginGateEnabled;
    const message = next
      ? 'سيظهر Login للمستخدمين ولن يدخل أحد دون حساب صادر من الإدارة.'
      : 'ستختفي شاشة Login وسيصبح الدخول متاحاً فقط عبر تحقق تيليجرام. هل تريد المتابعة؟';
    if (!window.confirm(message)) return;
    setLoginGateBusy(true);
    try {
      await api.put('/settings/access_login_enabled', { value: next });
      setLoginGateEnabled(next);
      toast.success(next ? 'تم إظهار Login وتفعيله' : 'تم إخفاء Login — الدخول عبر تيليجرام فقط');
    } catch (_) {
      toast.error('تعذر تغيير حالة Login');
    }
    setLoginGateBusy(false);
  };

  if (loading) return <LoadingScreen />;

  if (authError) {
    return (
      <main className="admin-access-state">
        <span className="admin-access-state__icon"><AdminIcon name="shield" size="2rem" /></span>
        <h1>تعذر فتح اللوحة</h1>
        <p>{authError}</p>
        <button type="button" onClick={() => { setAuthError(false); setLoading(false); }} className="neon-btn inline-flex items-center gap-2"><AdminIcon name="refresh" /> العودة لتسجيل الدخول</button>
        <small>يمكنك الدخول بحساب أدمن صادر من المالك أو عبر تيليجرام.</small>
      </main>
    );
  }

  if (!user) return <AdminLogin onAuthenticated={acceptAdmin} onTelegramLogin={loginWithTelegram} />;

  const pageMeta = PAGES[activePage] || PAGES.dashboard;
  const ActivePage = pageMeta.component;

  return (
    <div className="admin-shell">
      <Toaster position="top-left" toastOptions={{ style: { background: '#161922', color: '#fff', border: '1px solid #2d3748', fontFamily: 'Cairo, Tahoma, Arial, sans-serif', borderRadius: '12px', boxShadow: '0 8px 22px rgba(0,0,0,.28)' } }} />
      <Sidebar activePage={activePage} setActivePage={setActivePage} setRouteQuery={setRouteQuery} user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} unreadOrders={unreadOrders} />
      {sidebarOpen && <button type="button" className="admin-sidebar-overlay lg:hidden" aria-label="إغلاق القائمة" onClick={() => setSidebarOpen(false)} />}

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__title">
            <button type="button" onClick={() => setSidebarOpen((open) => !open)} className={`admin-topbar__menu lg:hidden ${sidebarOpen ? 'is-sidebar-open' : ''}`} aria-label={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}><AdminIcon name={sidebarOpen ? 'close' : 'menu'} /></button>
            <span className="admin-topbar__page-icon"><AdminIcon name={pageMeta.icon} size="1.25rem" /></span>
            <div className="min-w-0">
              <h1>{pageMeta.title}</h1>
              <p>{pageMeta.subtitle}</p>
            </div>
          </div>
          <div className="admin-topbar__actions">
            <span className="admin-topbar__user" title={user?.firstName}><i />{user?.firstName}</span>
            <div className="admin-topbar__action-dock" aria-label="إجراءات سريعة">
              <a href="/customer" target="_blank" rel="noreferrer" className="action-green" title="فتح المتجر" aria-label="فتح المتجر"><AdminIcon name="store" /></a>
              <button type="button" onClick={toggleLoginGate} disabled={loginGateBusy} className={loginGateEnabled ? 'action-orange' : 'action-slate'} title={loginGateEnabled ? 'دخول العملاء مفعّل' : 'دخول العملاء مخفي'} aria-label="تبديل دخول العملاء"><AdminIcon name="lock" /></button>
              <button type="button" onClick={toggleMaintenance} className={maintenance ? 'action-amber is-active' : 'action-slate'} title={maintenance ? 'إيقاف وضع الصيانة' : 'تفعيل وضع الصيانة'} aria-label="وضع الصيانة"><AdminIcon name="refresh" /></button>
              <button type="button" className="action-red" title="تسجيل الخروج" aria-label="تسجيل الخروج" onClick={() => { localStorage.removeItem('admin_token'); setUser(null); setAuthError(false); showLoginPath(); }}><AdminIcon name="logout" /></button>
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Suspense fallback={<div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl skeleton" />)}</div>}>
            <ActivePage setActivePage={setActivePage} routeQuery={routeQuery} setRouteQuery={setRouteQuery} currentUser={user} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
