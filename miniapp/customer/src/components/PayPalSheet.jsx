import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';
import { playSound } from '../utils/sound';

export default function PayPalSheet() {
  const { currentPaypalOrder, submitPaypalProof, publicSettings } = useStore();
  const { orderId, orderNumber, amount, paypalLink, paypalEmail } = currentPaypalOrder || {};

  const [ref, setRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState((currentPaypalOrder?.paymentTimeoutMinutes || 15) * 60);
  const [submitted, setSubmitted] = useState(false);

  const close = () => { playSound('close'); useStore.setState({ showPaypalSheet: false }); };
  useEffect(() => { playSound('open'); }, []);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const locale = useStore.getState().locale;

  const copy = (value) => navigator.clipboard.writeText(value).then(() => {
    haptic.light();
    playSound('tap');
    setCopied(true);
    toast.success(t(locale, 'copied'));
    window.setTimeout(() => setCopied(false), 1800);
  });

  const openPaypal = () => {
    haptic.medium();
    playSound('tap');
    const url = paypalLink || (paypalEmail ? `https://www.paypal.com/paypalme/${paypalEmail.replace(/^@/, '')}` : null);
    if (!url) return;
    try { window.Telegram?.WebApp?.openInvoice?.(); } catch (_) { /* noop */ }
    try { window.Telegram?.WebApp?.openLink?.(url) || window.open(url, '_blank', 'noopener,noreferrer'); }
    catch (_) { window.open(url, '_blank', 'noopener,noreferrer'); }
  };

  const submit = async () => {
    if (!ref.trim()) {
      haptic.error();
      toast.error(t(locale, 'paypalRef'));
      return;
    }
    haptic.medium();
    setLoading(true);
    try {
      await submitPaypalProof(ref.trim());
      haptic.success();
      playSound('success');
      setSubmitted(true);
      toast.success(t(locale, 'submitted'));
      setTimeout(close, 1600);
    } catch (error) {
      haptic.error();
      playSound('error');
      toast.error(error.response?.data?.error || t(locale, 'failed'));
    } finally {
      setLoading(false);
    }
  };

  const supportUsername = String(publicSettings?.support_username || 'support').replace(/^@/, '');

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-black/75 border-0" onClick={close} aria-label={t(locale, 'cancel')} />
      <section className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet rounded-t-[24px] max-h-[94dvh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={t(locale, 'payPal')}>
        <div className="flex justify-center py-3"><span className="w-10 h-1 rounded-full bg-[#2d3748]" /></div>
        <div className="px-5 pb-7 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-black text-white flex items-center gap-2"><PremiumIcon name="coin" className="text-[#f0b90b]" /> {t(locale, 'payPal')}</h2>
            <button type="button" onClick={close} className="w-10 h-10 min-h-0 rounded-xl border border-[#2d3748] text-[#9ca3af]">×</button>
          </div>

          <p className={`mx-auto w-fit px-3 py-1.5 rounded-lg border font-mono text-sm ${countdown > 300 ? 'border-[#10b981]/30 text-[#6ee7b7]' : 'border-[#ef4444]/30 text-[#fca5a5]'}`}>{Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}</p>

          <div className="gamer-card rounded-2xl p-4 text-center">
            <p className="m-0 text-xs text-[#9ca3af]">{t(locale, 'amountDue')}</p>
            <strong className="block mt-1 text-2xl text-[#f5d06f]">${Number(amount || 0).toFixed(2)}</strong>
          </div>

          <button type="button" onClick={openPaypal} disabled={!paypalLink && !paypalEmail} className="btn-sheen btn-sheen--on w-full rounded-xl bg-[#f0b90b] py-3 font-black text-[#16110a] disabled:opacity-45 active:scale-[.985] transition-transform">
            {t(locale, 'openPaypal')}
          </button>

          <p className="m-0 text-center text-[11px] leading-5 text-[#9ca3af]">{t(locale, 'paypalInstructions')}</p>

          <div className="rounded-xl border border-[#2d3748] bg-[#11141a] p-3">
            <p className="m-0 text-[11px] text-[#9ca3af]">{t(locale, 'includeOrderId')}</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-[12px] text-white">{orderNumber}</code>
              <button type="button" onClick={() => copy(orderNumber)} className="w-10 h-10 min-h-0 flex-none rounded-lg border border-[#10b981]/25 text-[#6ee7b7]">{copied ? <PremiumIcon name="checkmark" /> : <PremiumIcon name="copy" />}</button>
            </div>
          </div>

          <div>
            <label htmlFor="paypal-ref" className="mb-2 block text-sm font-bold text-white">{t(locale, 'paymentProof')}</label>
            <input
              id="paypal-ref"
              type="text"
              placeholder={t(locale, 'paypalRef')}
              value={ref}
              onChange={(event) => setRef(event.target.value)}
              className="w-full h-11 rounded-xl border border-[#2d3748] bg-[#11141a] px-3 text-sm text-white outline-none focus:border-[#10b981]"
            />
          </div>

          <button type="button" onClick={submit} disabled={loading || !ref.trim() || submitted} className="btn-sheen btn-sheen--on w-full rounded-xl bg-[#10b981] py-3 font-black text-[#06110b] disabled:opacity-45 active:scale-[.985] transition-transform">
            {loading ? t(locale, 'loading') : submitted ? t(locale, 'submitted') : t(locale, 'submit')}
          </button>

          <a href={`https://t.me/${supportUsername}`} target="_blank" rel="noreferrer" className="block text-center text-[11px] text-[#9ca3af]">@{supportUsername}</a>
        </div>
      </section>
    </>
  );
}
