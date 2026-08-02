import React, { lazy, Suspense, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
import LanguagePicker from './components/LanguagePicker';
import { isRTL } from './i18n';

// Lazy-loaded tabs & sheets — only loaded when actually opened,
// so the initial bundle stays small and first paint is fast.
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
  support: SupportTab,
};

export default function App() {
  const { login, fetchPublicSettings, isLoading, isAuthenticated, activeTab, locale, showDurationSheet, showCheckout, showBinanceSheet, currentOrder, needsLanguageSelect, showLanguagePicker } = useStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  // A gentle, low-cost color rotation keeps the storefront feeling alive
  // without loading external background images or interrupting shopping.
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData || '';

    fetchPublicSettings().catch(() => {});

    // Auto-login with gamer fallback
    login(initData).catch(() => {
      useStore.setState({
        user: { firstName: 'Pro Gamer 😎', username: 'gamer', balance: 0, role: 'customer', totalOrders: 0 },
        isAuthenticated: true,
        isLoading: false
      });
    });

    // Anti-black-screen safety: if auth hangs (slow/flaky network), drop the
    // loading screen and show the store as a guest so the page is never blank.
    const authTimeout = setTimeout(() => {
      if (useStore.getState().isLoading) {
        useStore.setState({
          user: { firstName: 'Pro Gamer 😎', username: 'gamer', balance: 0, role: 'customer', totalOrders: 0 },
          isAuthenticated: true,
          isLoading: false
        });
      }
    }, 8000);

    return () => clearTimeout(authTimeout);

    // Telegram theme
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#0d0f12');
        tg.setBackgroundColor('#0d0f12');
      } catch {}
    }
  }, []);

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
  }, [currentOrder]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBackgroundIndex((current) => (current + 1) % 4);
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) return <LoadingScreen />;

  const ActiveTab = TAB_COMPONENTS[activeTab] || ProductsTab;

  return (
    <div dir={isRTL(locale) ? 'rtl' : 'ltr'} className="app-shell flex flex-col min-h-screen bg-bg text-white overflow-hidden relative">
      {/* Background palette rotates every two seconds; CSS transitions keep it smooth on mobile. */}
      <div aria-hidden="true" className={`ambient-background ambient-background-${backgroundIndex}`} />

      <Toaster
        position="bottom-center"
        gutter={12}
        toastOptions={{
          style: { background: '#161922', color: '#fff', border: '1px solid rgba(16,185,129,0.2)', fontFamily: 'Cairo', borderRadius: '14px', fontSize: '13px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)', padding: '10px 16px', marginBottom: 'env(safe-area-inset-bottom)' },
          success: { iconTheme: { primary: '#10b981', secondary: '#000' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          duration: 2500
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />

        <main className="app-content flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full"
            >
              <Suspense fallback={<div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl skeleton" />)}</div>}>
                <ActiveTab />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav />
      </div>

      {/* Overlays (lazy) */}
      <AnimatePresence>
        {showDurationSheet && (
          <Suspense fallback={null}><DurationSheet /></Suspense>
        )}
        {showCheckout && (
          <Suspense fallback={null}><CheckoutSheet /></Suspense>
        )}
        {showBinanceSheet && (
          <Suspense fallback={null}><BinancePaySheet /></Suspense>
        )}
        {showSuccess && (
          <Suspense fallback={null}><OrderSuccessModal data={successData} onClose={() => { setShowSuccess(false); setSuccessData(null); useStore.setState({ currentOrder: null }); }} /></Suspense>
        )}
      </AnimatePresence>

      {/* Language picker — blocking on the very first visit, re-openable anytime */}
      {(needsLanguageSelect || showLanguagePicker) && (
        <LanguagePicker blocking={needsLanguageSelect} />
      )}
    </div>
  );
}
