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
  const { login, fetchPublicSettings, isLoading, isAuthenticated, activeTab, showDurationSheet, showCheckout, showBinanceSheet, currentOrder } = useStore();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    const initData = tg?.initData || '';

    fetchPublicSettings().catch(() => {});

    // Auto-login
    login(initData).catch(() => {
      useStore.setState({
        user: { firstName: 'مستخدم', username: 'user', balance: 0, role: 'customer', totalOrders: 0 },
        isAuthenticated: true,
        isLoading: false
      });
    });
  }, []);

  useEffect(() => {
    if (currentOrder && !showBinanceSheet) {
      setSuccessData(currentOrder);
      setShowSuccess(true);
    }
  }, [currentOrder]);

  if (isLoading) return <LoadingScreen />;

  const ActiveTab = TAB_COMPONENTS[activeTab] || ProductsTab;

  return (
    <div className="flex flex-col min-h-screen bg-bg text-white overflow-hidden">
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a', fontFamily: 'Cairo' },
          success: { iconTheme: { primary: '#00ff88', secondary: '#000' } },
          error: { iconTheme: { primary: '#ff3b5c', secondary: '#fff' } }
        }}
      />

      <Header />

      <main className="flex-1 pb-20 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="h-full"
          >
            <ActiveTab />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />

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
