import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
import LanguagePicker from './components/LanguagePicker';
import LoginGate from './components/LoginGate';
import SpaceBackground from './components/SpaceBackground';
import { isRTL } from './i18n';
import { initSoundUnlock } from './utils/sound';

// Tabs and sheets stay code-split so the first usable screen only downloads
// what it needs. This matters in Telegram and on Railway cold connections.
const ProductsTab = lazy(() => import('./components/tabs/ProductsTab'));
const MyKeysTab = lazy(() => import('./components/tabs/MyKeysTab'));
const WheelTab = lazy(() => import('./components/tabs/WheelTab'));
const HistoryTab = lazy(() => import('./components/tabs/HistoryTab'));
const ProfileTab = lazy(() => import('./components/tabs/ProfileTab'));
const SupportTab = lazy(() => import('./components/tabs/SupportTab'));
const DurationSheet = lazy(() => import('./components/DurationSheet'));
const CheckoutSheet = lazy(() => import('./components/CheckoutSheet'));
const BinancePaySheet = lazy(() => import('./components/BinancePaySheet'));
const PayPalSheet = lazy(() => import('./components/PayPalSheet'));
const OrderSuccessModal = lazy(() => import('./components/OrderSuccessModal'));

const TAB_COMPONENTS = {
  products: ProductsTab,
  keys: MyKeysTab,
  wheel: WheelTab,
  history: HistoryTab,
  profile: ProfileTab,
  support: SupportTab
};

export default function App() {
  const {
    fetchPublicSettings,
    isLoading,
    isAuthenticated,
    activeTab,
    locale,
    showDurationSheet,
    showCheckout,
    showBinanceSheet,
    showPaypalSheet,
    currentOrder,
    needsLanguageSelect,
    showLanguagePicker
  } = useStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0d0f12');
        tg.setBackgroundColor('#0d0f12');
      } catch (_) {}
    }

    // Only public branding/support settings are fetched before login. Customer
    // identity is never inferred from Telegram and there is no guest bypass.
    fetchPublicSettings().catch(() => {});
    initSoundUnlock();
  }, [fetchPublicSettings]);

  useEffect(() => {
    const rtl = isRTL(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.body.dir = rtl ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    // Only show the success modal for a completed order. The payment sheets
    // set `currentOrder` to the *pending* order when they open, so we must not
    // trigger the celebration just because the sheet was dismissed.
    if (currentOrder?.order?.status === 'completed' && !showBinanceSheet && !showPaypalSheet) {
      setSuccessData(currentOrder);
      setShowSuccess(true);
    }
  }, [currentOrder, showBinanceSheet, showPaypalSheet]);

  // This must stay before LoadingScreen and the shell. On first use the
  // language picker is literally the only rendered application interface.
  if (needsLanguageSelect || (showLanguagePicker && !isAuthenticated)) return <LanguagePicker blocking />;
  if (!isAuthenticated) return <LoginGate />;
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
      {showPaypalSheet && <Suspense fallback={null}><PayPalSheet /></Suspense>}
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
