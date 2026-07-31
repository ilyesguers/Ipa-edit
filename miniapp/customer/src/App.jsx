import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ProductsTab from './components/tabs/ProductsTab';
import MyKeysTab from './components/tabs/MyKeysTab';
import HistoryTab from './components/tabs/HistoryTab';
import ProfileTab from './components/tabs/ProfileTab';
import SupportTab from './components/tabs/SupportTab';
import DurationSheet from './components/DurationSheet';
import CheckoutSheet from './components/CheckoutSheet';
import BinancePaySheet from './components/BinancePaySheet';
import LoadingScreen from './components/LoadingScreen';
import OrderSuccessModal from './components/OrderSuccessModal';

const TAB_COMPONENTS = {
  products: ProductsTab,
  keys: MyKeysTab,
  history: HistoryTab,
  profile: ProfileTab,
  support: SupportTab,
};

export default function App() {
  const { login, fetchPublicSettings, isLoading, isAuthenticated, activeTab, locale, showDurationSheet, showCheckout, showBinanceSheet, currentOrder } = useStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

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

    // Telegram theme
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#050508');
        tg.setBackgroundColor('#050508');
      } catch {}
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    if (currentOrder && !showBinanceSheet) {
      setSuccessData(currentOrder);
      setShowSuccess(true);
    }
  }, [currentOrder]);

  if (isLoading) return <LoadingScreen />;

  const ActiveTab = TAB_COMPONENTS[activeTab] || ProductsTab;

  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} className="app-shell flex flex-col min-h-screen bg-bg text-white overflow-hidden relative">
      {/* Gaming background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050508] via-[#0a0a14] to-[#050508]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon/10 to-transparent" />
      </div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#12121c', color: '#fff', border: '1px solid rgba(0,255,136,0.2)', fontFamily: 'Cairo', borderRadius: '16px' },
          success: { iconTheme: { primary: '#00ff88', secondary: '#000' } },
          error: { iconTheme: { primary: '#ff3b5c', secondary: '#fff' } }
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />

        <main className="app-content flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.68, -0.55, 0.265, 1.55] }}
              className="h-full"
            >
              <ActiveTab />
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav />
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {showDurationSheet && <DurationSheet />}
        {showCheckout && <CheckoutSheet />}
        {showBinanceSheet && <BinancePaySheet />}
        {showSuccess && <OrderSuccessModal data={successData} onClose={() => { setShowSuccess(false); setSuccessData(null); useStore.setState({ currentOrder: null }); }} />}
      </AnimatePresence>
    </div>
  );
}
