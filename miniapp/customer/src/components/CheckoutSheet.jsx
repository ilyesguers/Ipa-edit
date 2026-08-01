import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { localizedName, t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';

export default function CheckoutSheet() {
  const { selectedProduct, selectedDuration, quantity, user, locale, couponDiscount, applyCoupon, purchaseWithWallet, purchaseWithBinance } = useStore();
  const [couponInput, setCouponInput] = useState('');
  const [couponState, setCouponState] = useState('idle');
  const [couponError, setCouponError] = useState('');
  const [loading, setLoading] = useState(false);
  const [binanceLoading, setBinanceLoading] = useState(false);
  if (!selectedProduct || !selectedDuration) return null;
  const maxQty = Math.min(Math.max(1, Number(selectedDuration.stockCount || 1)), 99);
  const subtotal = Number(selectedDuration.price || 0) * quantity;
  const final = Math.max(0, subtotal - couponDiscount);
  const hasBalance = Number(user?.balance || 0) >= final;

  const apply = async () => {
    if (!couponInput.trim()) return;
    setCouponState('loading');
    setCouponError('');
    try {
      await applyCoupon(couponInput, subtotal);
      useStore.setState({ couponCode: couponInput });
      setCouponState('success');
      haptic.success();
      toast.success(`🔥 ${t(locale, 'applied')} - You're legend! 👑`);
    } catch (error) {
      setCouponState('error');
      setCouponError(error.response?.data?.error || t(locale, 'couponError'));
      haptic.error();
      toast.error(error.response?.data?.error || t(locale, 'couponError'));
      setTimeout(() => setCouponState('idle'), 1800);
    }
  };

  const buyWallet = async () => {
    if (!hasBalance) {
      haptic.error();
      return toast.error(`💸 ${t(locale, 'insufficient')}`);
    }
    haptic.medium();
    setLoading(true);
    try {
      await purchaseWithWallet();
      haptic.success();
      toast.success(`🎉 ${t(locale, 'purchaseSuccess')}`);
    } catch (error) {
      haptic.error();
      toast.error(error.response?.data?.error || t(locale, 'failed'));
    } finally { setLoading(false); }
  };

  const buyBinance = async () => {
    haptic.medium();
    setBinanceLoading(true);
    try {
      await purchaseWithBinance();
      haptic.success();
    } catch (error) {
      haptic.error();
      toast.error(error.response?.data?.error || t(locale, 'failed'));
    } finally { setBinanceLoading(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => useStore.setState({ showCheckout: false, showDurationSheet: true })} className="fixed inset-0 bg-black/80 z-50" />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet rounded-t-[32px] max-h-[92vh] overflow-y-auto border-[#10b981]/20">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#10b981] via-[#3b82f6] to-[#6366f1]" />
        <div className="flex justify-center pt-4 pb-2"><div className="w-12 h-1.5 rounded-full bg-[#2d3748]" /></div>
        <div className="px-5 pb-8 space-y-5">
          <h2 className="text-[20px] font-black text-center text-white inline-flex items-center justify-center gap-2 w-full font-[Orbitron]"><PremiumIcon name="rocket" className="text-[#10b981]" /> {t(locale, 'checkout')}</h2>

          <div className="bg-[#161922] rounded-[20px] p-5 space-y-3 border border-[#2d3748] shadow-xl">
            <Summary label={t(locale, 'product')} value={localizedName(selectedProduct, locale)} icon="gamepad" />
            <Summary label={t(locale, 'duration')} value={localizedName(selectedDuration, locale)} icon="bolt" />
              <div className="flex justify-between items-center">
              <span className="text-[#9ca3af] text-[13px] font-bold flex items-center gap-1.5"><PremiumIcon name="target" size="0.9em" /> {t(locale, 'quantity')}</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => { haptic.light(); useStore.setState((state) => ({ quantity: Math.max(1, state.quantity - 1) })); }} disabled={quantity <= 1} className="w-11 h-11 rounded-xl bg-[#1f2430] text-white font-black hover:bg-[#2d3748] transition-colors border border-[#2d3748] disabled:opacity-40 text-lg">−</button>
                <span className="font-black text-white w-8 text-center text-[16px] bg-[#0d0f12] px-2 py-1 rounded-lg border border-[#2d3748]">{quantity}</span>
                <button type="button" onClick={() => { haptic.light(); useStore.setState((state) => ({ quantity: Math.min(maxQty, state.quantity + 1) })); }} disabled={quantity >= maxQty} className="w-11 h-11 rounded-xl bg-[#1f2430] text-white font-black hover:bg-[#2d3748] transition-colors border border-[#2d3748] disabled:opacity-40 text-lg">+</button>
              </div>
            </div>
            {quantity >= maxQty && (
              <p className="text-[10px] text-[#f0b90b] bg-[#f0b90b]/10 border border-[#f0b90b]/20 rounded-lg px-3 py-1.5 font-bold">
                ⚡ وصلت للحد الأقصى المتاح ({maxQty}) من المخزون
              </p>
            )}
            <div className="border-t border-[#1f2430] pt-3 space-y-2">
              <Summary label={t(locale, 'subtotal')} value={`$${subtotal.toFixed(2)}`} />
              <AnimatePresence>
                {couponDiscount > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex justify-between text-sm bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl px-3 py-2">
                    <span className="text-[#10b981] font-black flex items-center gap-1"><PremiumIcon name="fire" /> {t(locale, 'discount')}</span>
                    <span className="font-black text-[#10b981]">−${couponDiscount.toFixed(2)} 🔥</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex justify-between mt-2 bg-gradient-to-r from-[#10b981]/10 to-[#3b82f6]/10 rounded-xl px-3 py-3 border border-[#10b981]/20">
                <span className="font-black text-white text-[15px] flex items-center gap-2"><PremiumIcon name="crown" className="text-[#fbbf24]" /> {t(locale, 'total')}</span>
                <span className="font-black text-[22px] text-[#3b82f6] glow-blue font-[Orbitron]">${final.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5">
            <div className="flex-1 relative">
              <PremiumIcon name="gem" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#10b981]/60" />
              <input type="text" inputMode="text" autoCapitalize="characters" placeholder={t(locale, 'coupon')} value={couponInput} onChange={(event) => { setCouponInput(event.target.value.toUpperCase()); setCouponError(''); if (couponState === 'error') setCouponState('idle'); }} disabled={couponState === 'success' || couponState === 'loading'} className="w-full bg-[#161922] border border-[#2d3748] rounded-2xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-[#6b7280] outline-none focus:border-[#10b981]/50 transition-all" />
            </div>
            <button type="button" onClick={apply} disabled={!couponInput || couponState === 'loading' || couponState === 'success'} className="px-5 rounded-2xl font-black text-[13px] bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 disabled:opacity-40 hover:bg-[#10b981]/20 transition-all flex items-center gap-1">
              {couponState === 'success' ? `✅ ${t(locale, 'applied')}` : couponState === 'loading' ? '...' : <><PremiumIcon name="bolt" size="1em" /> {t(locale, 'apply')}</>}
            </button>
          </div>
          {couponError && <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl px-3 py-2">{couponError}</p>}

          <div className="space-y-3">
            <PaymentButton icon="wallet" label={t(locale, 'payWallet')} suffix={`$${Number(user?.balance || 0).toFixed(2)}`} disabled={!hasBalance || loading} loading={loading} onClick={buyWallet} />
            <PaymentButton icon="coin" label={t(locale, 'payBinance')} suffix={binanceLoading ? '...' : '🟡 FAST'} disabled={binanceLoading} loading={binanceLoading} onClick={buyBinance} gold />
          </div>

          {!hasBalance && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-2xl p-4 text-center">
              <p className="text-[13px] text-[#ef4444] font-black flex items-center justify-center gap-2"><PremiumIcon name="fire" /> {t(locale, 'insufficient')} 💸</p>
              <p className="text-[11px] text-[#9ca3af] mt-1">Top up and become legend! 🚀</p>
            </div>
          )}

          <p className="text-center text-[11px] text-[#6b7280] flex items-center justify-center gap-2"><PremiumIcon name="shield" className="text-[#10b981]" /> {t(locale, 'instantDelivery')} • {t(locale, 'gg')} 🔒⚡</p>
        </div>
      </motion.div>
    </>
  );
}
function Summary({ label, value, icon }) {
  return (
    <div className="flex justify-between text-[13px] items-center">
      <span className="text-[#9ca3af] font-bold flex items-center gap-1.5">{icon && <PremiumIcon name={icon} size="0.9em" className="text-[#10b981]/60" />}{label}</span>
      <span className="font-black text-white text-left max-w-[60%] truncate bg-[#0d0f12]/50 px-2.5 py-1 rounded-full border border-[#1f2430] text-[12px]">{value}</span>
    </div>
  );
}
function PaymentButton({ icon, label, suffix, disabled, loading, onClick, gold = false }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.97 }} whileHover={{ y: -1 }} onClick={onClick} disabled={disabled} className={`w-full py-4 rounded-2xl font-black text-[15px] flex items-center justify-between px-5 border-2 transition-all relative overflow-hidden group ${gold ? 'bg-gradient-to-r from-[#f0b90b]/15 to-[#f97316]/15 border-[#f0b90b]/30 text-[#f0b90b] hover:from-[#f0b90b]/25 hover:to-[#f97316]/25 hover:shadow-lg hover:shadow-[#f0b90b]/20' : disabled ? 'bg-[#161922] border-[#1f2430] text-[#6b7280]' : 'bg-gradient-to-r from-[#10b981]/15 to-[#3b82f6]/15 border-[#10b981]/30 text-[#10b981] hover:from-[#10b981]/25 hover:to-[#3b82f6]/25 hover:shadow-lg hover:shadow-[#10b981]/20'} disabled:opacity-60`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      <span className="flex items-center gap-2.5 relative"><span className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center">{loading ? '...' : <PremiumIcon name={icon} />}</span> {label}</span>
      <span className="text-[13px] font-black bg-black/20 px-3 py-1 rounded-full relative">{suffix}</span>
    </motion.button>
  );
}
