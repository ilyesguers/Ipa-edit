import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
import LanguagePicker from './components/LanguagePicker';
import SpaceBackground from './components/SpaceBackground';
import { isRTL } from './i18n';
import { initSoundUnlock } from './utils/sound';

// Tabs and sheets stay code-split so the first usable screen only downloads
// what it needs. This matters in Telegram and on Railway cold connections.
const ProductsTab = lazy(() => import('./components/tabs/ProductsTab'));
const MyKeysTab = lazy(() => import('./components/tabs/MyKeysTab'));
const HistoryTab = lazy(() => import('./components/tabs/HistoryTab'));
const ProfileTab = lazy(() => import('./components/tabs/ProfileTab'));
const SupportTab = lazy(() => import('./components/tabs/SupportTab'));
const DurationSheet = lazy(() => import('./components/DurationSheet'));
const CheckoutSheet = lazy(() => import('./components/CheckoutSheet'));
const BinancePaySheet = lazy(() => import('./components/BinancePaySheet'));
const OrderSuccessModal = lazy(() => import('./components/OrderSuccessModal'));

const TAB_COMPONENTS = {
  products: ProductsTab,
  keys: MyKeysTab,
  history: HistoryTab,
  profile: ProfileTab,
  support: SupportTab
};

const GuestUser = {
  firstName: 'Guest',
  username: 'guest',
  balance: 0,
  role: 'customer',
  totalOrders: 0
};

export default function App() {
  const {
    login,
    fetchPublicSettings,
    isLoading,
    activeTab,
    locale,
    showDurationSheet,
    showCheckout,
    showBinanceSheet,
    currentOrder,
    needsLanguageSelect,
    showLanguagePicker
  } = useStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData || '';

    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0d0f12');
        tg.setBackgroundColor('#0d0f12');
      } catch (_) {}
    }

    // Settings and auth start in parallel. The language gate remains the only
    // visible screen while this happens, rather than rendering the store under
    // an overlay and wasting work on product cards.
    fetchPublicSettings().catch(() => {});
    login(initData).catch(() => {
      useStore.setState({ user: GuestUser, isAuthenticated: true, isLoading: false });
    });
    initSoundUnlock();

    // Never leave a user at a loading screen when a slow Railway connection
    // takes too long. They can still browse as a guest and retry actions later.
    const authTimeout = window.setTimeout(() => {
      if (useStore.getState().isLoading) {
        useStore.setState({ user: GuestUser, isAuthenticated: true, isLoading: false });
      }
    }, 8_000);

    return () => window.clearTimeout(authTimeout);
  }, [fetchPublicSettings, login]);

  useEffect(() => {
    const rtl = isRTL(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.body.dir = rtl ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    if (currentOrder && !showBinanceSheet) {
      setSuccessData(currentOrder);
      setShowSuccess(true);
    }
  }, [currentOrder, showBinanceSheet]);

  // This must stay before LoadingScreen and the shell. On first use the
  // language picker is literally the only rendered application interface.
  if (needsLanguageSelect) return <LanguagePicker blocking />;
  if (isLoading) return <LoadingScreen />;

  const ActiveTab = TAB_COMPONENTS[activeTab] || ProductsTab;

  return (
    <div dir={isRTL(locale) ? 'rtl' : 'ltr'} className="app-shell flex min-h-screen flex-col bg-bg text-white">
      <Toaster
        position="bottom-center"
        gutter={10}
        toastOptions={{
          style: {
            background: '#161922',
            color: '#fff',
            border: '1px solid rgba(16,185,129,0.2)',
            fontFamily: 'Cairo',
            borderRadius: '12px',
            fontSize: '13px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            padding: '10px 14px',
            marginBottom: 'env(safe-area-inset-bottom)'
          },
          duration: 2500
        }}
      />

      <Header />
      <main className="app-content flex-1 overflow-y-auto">
        <SpaceBackground />
        <div key={activeTab} className="tab-view" role="region" aria-live="polite">
          <Suspense fallback={<div className="p-4 space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl skeleton" />)}</div>}>
            <ActiveTab />
          </Suspense>
        </div>
      </main>
      <BottomNav />

      {showDurationSheet && <Suspense fallback={null}><DurationSheet /></Suspense>}
      {showCheckout && <Suspense fallback={null}><CheckoutSheet /></Suspense>}
      {showBinanceSheet && <Suspense fallback={null}><BinancePaySheet /></Suspense>}
      {showSuccess && (
        <Suspense fallback={null}>
          <OrderSuccessModal
            data={successData}
            onClose={() => {
              setShowSuccess(false);
              setSuccessData(null);
              useStore.setState({ currentOrder: null });
            }}
          />
        </Suspense>
      )}

      {showLanguagePicker && <LanguagePicker />}
    </div>
  );
}
