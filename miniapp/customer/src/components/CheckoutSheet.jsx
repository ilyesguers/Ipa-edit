import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

// Coupon state machine states: 'idle' | 'loading' | 'success' | 'error'
const COUPON_STATES = {
  idle: { label: 'تقدم', color: 'neon', disabled: false },
  loading: { label: '⏳', color: 'muted', disabled: true },
  success: { label: '✓ مطبق', color: 'green', disabled: true },
  error: { label: '✗ خطأ', color: 'red', disabled: false },
};

export default function CheckoutSheet() {
  const {
    selectedProduct, selectedDuration, quantity, user,
    couponCode, couponDiscount, applyCoupon, purchaseWithWallet, purchaseWithBinance
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponState, setCouponState] = useState('idle');
  const [couponError, setCouponError] = useState('');
  const [loading, setLoading] = useState(false);
  const [binanceLoading, setBinanceLoading] = useState(false);

  if (!selectedProduct || !selectedDuration) return null;

  const subtotal = selectedDuration.price * quantity;
  const final = Math.max(0, subtotal - couponDiscount);
  const hasBalance = (user?.balance || 0) >= final;
  const insufficientAmount = final - (user?.balance || 0);

  // ── Coupon state machine ──
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponState('loading');
    setCouponError('');
    try {
      await applyCoupon(couponInput, subtotal);
      useStore.setState({ couponCode: couponInput });
      setCouponState('success');
      toast.success('✅ تم تطبيق الكوبون!');
    } catch (err) {
      setCouponState('error');
      setCouponError(err.response?.data?.error || 'كوبون غير صالح');
      toast.error(err.response?.data?.error || 'كوبون غير صالح');
      // Reset to idle after 2s
      setTimeout(() => setCouponState('idle'), 2000);
    }
  };

  const handleWalletBuy = async () => {
    if (!hasBalance) return toast.error('رصيد غير كافٍ');
    setLoading(true);
    try {
      await purchaseWithWallet();
      toast.success('✅ تم الشراء بنجاح!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل في الشراء');
    } finally {
      setLoading(false);
    }
  };

  const handleBinanceBuy = async () => {
    setBinanceLoading(true);
    try {
      await purchaseWithBinance();
    } catch (err) {
      toast.error(err.response?.data?.error || 'فشل في إنشاء طلب الدفع');
    } finally {
      setBinanceLoading(false);
    }
  };

  const couponBtn = COUPON_STATES[couponState];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => useStore.setState({ showCheckout: false, showDurationSheet: true })}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 32 }}
        className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet rounded-t-3xl"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        <div className="px-4 pb-8 space-y-4">
          <h2 className="text-xl font-black text-center text-white">💳 إتمام الشراء</h2>

          {/* Order Summary */}
          <div className="bg-[#1a1a1a] rounded-2xl p-4 space-y-2 border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted">المنتج</span>
              <span className="font-semibold text-white">{selectedProduct.nameAr || selectedProduct.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">المدة</span>
              <span className="font-semibold text-white">{selectedDuration.nameAr || selectedDuration.name}</span>
            </div>

            {/* Quantity */}
            <div className="flex justify-between items-center">
              <span className="text-muted text-sm">الكمية</span>
              <div className="flex items-center gap-3">
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => useStore.setState(s => ({ quantity: Math.max(1, s.quantity - 1) }))}
                  className="w-8 h-8 rounded-lg bg-[#2a2a2a] text-white font-bold flex items-center justify-center">-</motion.button>
                <span className="font-bold text-white w-6 text-center">{quantity}</span>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => useStore.setState(s => ({ quantity: s.quantity + 1 }))}
                  className="w-8 h-8 rounded-lg bg-[#2a2a2a] text-white font-bold flex items-center justify-center">+</motion.button>
              </div>
            </div>

            <div className="border-t border-border pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">المجموع</span>
                <span className="font-bold text-white">${subtotal.toFixed(2)}</span>
              </div>
              <AnimatePresence>
                {couponDiscount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-neon">خصم الكوبون</span>
                    <span className="font-bold text-neon">-${couponDiscount.toFixed(2)}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between mt-1">
                <span className="font-black text-white">الإجمالي</span>
                <span className="font-black text-xl text-neon-blue glow-blue">${final.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Coupon with state machine */}
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="رمز القسيمة (اختياري)"
                value={couponInput}
                onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); if (couponState === 'error') setCouponState('idle'); }}
                disabled={couponState === 'success' || couponState === 'loading'}
                className={`flex-1 bg-[#1a1a1a] border rounded-xl py-3 px-4 text-sm text-white placeholder-muted outline-none transition-colors
                  ${couponState === 'error' ? 'border-red/50 focus:border-red/70' : couponState === 'success' ? 'border-neon/50' : 'border-border focus:border-neon/50'}
                  disabled:opacity-50`}
              />
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={handleApplyCoupon}
                disabled={couponBtn.disabled || !couponInput}
                className={`px-4 py-3 rounded-xl font-bold text-sm border transition-all
                  ${couponState === 'success' ? 'bg-neon/10 text-neon border-neon/30' :
                    couponState === 'error' ? 'bg-red/10 text-red border-red/30' :
                    'bg-neon/10 text-neon border-neon/30 disabled:opacity-40'}`}
              >
                {couponBtn.label}
              </motion.button>
            </div>
            {/* Coupon error message */}
            <AnimatePresence>
              {couponError && couponState === 'error' && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-xs text-red mt-1 px-1"
                >
                  ⚠️ {couponError}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            {/* Wallet */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleWalletBuy}
              disabled={!hasBalance || loading}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-between px-5 border transition-all
                ${hasBalance
                  ? 'bg-neon/10 border-neon/30 text-neon hover:bg-neon/15'
                  : 'bg-[#1a1a1a] border-border text-muted cursor-not-allowed'
                }`}
            >
              <span className="flex items-center gap-2">
                {loading ? (
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>⏳</motion.span>
                ) : '💳'}
                الدفع من المحفظة
              </span>
              <span className="text-sm">${(user?.balance || 0).toFixed(2)}</span>
            </motion.button>

            {/* Binance */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleBinanceBuy}
              disabled={binanceLoading}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-between px-5 bg-[#f0b90b]/10 border border-[#f0b90b]/30 text-[#f0b90b] hover:bg-[#f0b90b]/15 transition-all disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                {binanceLoading ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block"
                  >
                    💎
                  </motion.span>
                ) : '💎'}
                الدفع التلقائي من بينانس
              </span>
              {binanceLoading ? (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-sm"
                >
                  جاري...
                </motion.span>
              ) : (
                <span className="text-xl">⚡</span>
              )}
            </motion.button>
          </div>

          {/* Insufficient balance message */}
          {!hasBalance && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red/5 border border-red/20 rounded-xl p-3 text-center"
            >
              <p className="text-xs text-red font-semibold">
                ⚠️ رصيدك غير كافٍ
              </p>
              <p className="text-[10px] text-red/70 mt-1">
                تحتاج ${(insufficientAmount).toFixed(2)} إضافية — قم بشحن رصيدك أولاً
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </>
  );
}
