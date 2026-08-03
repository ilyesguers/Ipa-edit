import React, { useState } from 'react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { localizedName, t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';

export default function CheckoutSheet() {
  const {
    selectedProduct,
    selectedDuration,
    quantity,
    user,
    locale,
    couponDiscount,
    applyCoupon,
    purchaseWithWallet,
    purchaseWithBinance
  } = useStore();
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
  const close = () => useStore.setState({ showCheckout: false, showDurationSheet: true });

  const apply = async () => {
    if (!couponInput.trim()) return;
    setCouponState('loading');
    setCouponError('');
    try {
      await applyCoupon(couponInput, subtotal);
      useStore.setState({ couponCode: couponInput });
      setCouponState('success');
      haptic.success();
      toast.success(t(locale, 'applied'));
    } catch (error) {
      setCouponState('error');
      const message = error.response?.data?.error || t(locale, 'couponError');
      setCouponError(message);
      haptic.error();
      toast.error(message);
    }
  };

  const buyWallet = async () => {
    if (!hasBalance) {
      haptic.error();
      toast.error(t(locale, 'insufficient'));
      return;
    }
    haptic.medium();
    setLoading(true);
    try {
      await purchaseWithWallet();
      haptic.success();
      toast.success(t(locale, 'purchaseSuccess'));
    } catch (error) {
      haptic.error();
      toast.error(error.response?.data?.error || t(locale, 'failed'));
    } finally {
      setLoading(false);
    }
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
    } finally {
      setBinanceLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-black/75 border-0" onClick={close} aria-label={t(locale, 'cancel')} />
      <section className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet rounded-t-[24px] max-h-[92dvh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={t(locale, 'checkout')}>
        <div className="flex justify-center py-3"><span className="w-10 h-1 rounded-full bg-[#2d3748]" /></div>
        <div className="px-5 pb-7 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-[18px] font-black text-white flex items-center gap-2"><PremiumIcon name="shopping" className="text-[#10b981]" /> {t(locale, 'checkout')}</h2>
            <button type="button" onClick={close} className="w-10 h-10 min-h-0 p-0 rounded-xl border border-[#2d3748] bg-[#161922] text-[#9ca3af]" aria-label={t(locale, 'cancel')}>×</button>
          </div>

          <section className="gamer-card rounded-2xl p-4 space-y-3">
            <Summary label={t(locale, 'product')} value={localizedName(selectedProduct, locale)} icon="gamepad" />
            <Summary label={t(locale, 'duration')} value={localizedName(selectedDuration, locale)} icon="clock" />
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#2d3748]">
              <span className="text-[#9ca3af] text-[13px] font-bold flex items-center gap-2"><PremiumIcon name="orders" /> {t(locale, 'quantity')}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { haptic.light(); useStore.setState((state) => ({ quantity: Math.max(1, state.quantity - 1) })); }} disabled={quantity <= 1} className="w-10 h-10 min-h-0 rounded-xl bg-[#1f2430] text-white border border-[#2d3748] disabled:opacity-40">−</button>
                <strong className="w-7 text-center">{quantity}</strong>
                <button type="button" onClick={() => { haptic.light(); useStore.setState((state) => ({ quantity: Math.min(maxQty, state.quantity + 1) })); }} disabled={quantity >= maxQty} className="w-10 h-10 min-h-0 rounded-xl bg-[#1f2430] text-white border border-[#2d3748] disabled:opacity-40">+</button>
              </div>
            </div>
            <Summary label={t(locale, 'subtotal')} value={`$${subtotal.toFixed(2)}`} />
            {couponDiscount > 0 && <Summary label={t(locale, 'discount')} value={`−$${couponDiscount.toFixed(2)}`} icon="checkmark" accent />}
            <div className="flex justify-between items-center pt-3 border-t border-[#2d3748]">
              <strong className="text-white">{t(locale, 'total')}</strong>
              <strong className="text-[#60a5fa] text-[22px]">${final.toFixed(2)}</strong>
            </div>
          </section>

          <div className="flex gap-2">
            <input type="text" autoCapitalize="characters" placeholder={t(locale, 'coupon')} value={couponInput} onChange={(event) => { setCouponInput(event.target.value.toUpperCase()); setCouponError(''); if (couponState === 'error') setCouponState('idle'); }} disabled={couponState === 'success' || couponState === 'loading'} className="min-w-0 flex-1 h-11 bg-[#161922] border border-[#2d3748] rounded-xl px-3 text-sm text-white outline-none focus:border-[#10b981]" />
            <button type="button" onClick={apply} disabled={!couponInput || couponState === 'loading' || couponState === 'success'} className="px-4 min-h-0 rounded-xl font-black text-[12px] bg-[#10b981]/10 text-[#6ee7b7] border border-[#10b981]/30 disabled:opacity-40">
              {couponState === 'loading' ? '…' : couponState === 'success' ? t(locale, 'applied') : t(locale, 'apply')}
            </button>
          </div>
          {couponError && <p className="m-0 text-xs text-[#fca5a5]">{couponError}</p>}

          <div className="space-y-2">
            <PaymentButton icon="wallet" label={t(locale, 'payWallet')} suffix={`$${Number(user?.balance || 0).toFixed(2)}`} disabled={!hasBalance || loading} loading={loading} onClick={buyWallet} />
            <PaymentButton icon="coin" label={t(locale, 'payBinance')} suffix="USDT" disabled={binanceLoading} loading={binanceLoading} onClick={buyBinance} gold />
          </div>
          {!hasBalance && <p className="m-0 text-center text-[12px] text-[#fca5a5]">{t(locale, 'insufficient')}</p>}
        </div>
      </section>
    </>
  );
}

function Summary({ label, value, icon, accent = false }) {
  return (
    <div className="flex justify-between items-center gap-3 text-[13px]">
      <span className={`min-w-0 flex items-center gap-2 ${accent ? 'text-[#6ee7b7]' : 'text-[#9ca3af]'}`}>{icon && <PremiumIcon name={icon} />}{label}</span>
      <strong className={`max-w-[58%] truncate text-end ${accent ? 'text-[#6ee7b7]' : 'text-white'}`}>{value}</strong>
    </div>
  );
}

function PaymentButton({ icon, label, suffix, disabled, loading, onClick, gold = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`w-full min-h-0 py-3 px-4 rounded-xl border flex items-center justify-between gap-3 font-black text-[13px] disabled:opacity-45 ${gold ? 'border-[#f0b90b]/40 bg-[#f0b90b]/10 text-[#f5d06f]' : 'border-[#10b981]/35 bg-[#10b981]/10 text-[#6ee7b7]'}`}>
      <span className="flex items-center gap-2"><PremiumIcon name={icon} /> {loading ? '…' : label}</span>
      <span>{suffix}</span>
    </button>
  );
}
