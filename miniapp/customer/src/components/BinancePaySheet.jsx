import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import api from '../utils/api';
import { haptic } from '../utils/haptic';
import { playSound } from '../utils/sound';

export default function BinancePaySheet() {
  const { currentOrder, submitBinanceProof, pollBinancePayment, pollOrder, publicSettings, locale } = useStore();
  const mode = currentOrder?.mode || 'manual';

  // Manual (USDT TRC20) fields
  const orderId = currentOrder?.orderId;
  const orderNumber = currentOrder?.orderNumber;
  const amount = currentOrder?.amount || 0;
  const paymentAmount = currentOrder?.paymentAmount || amount;
  const address = currentOrder?.wallet || '';
  const binanceId = currentOrder?.binanceId || '';
  const timeoutMinutes = currentOrder?.paymentTimeoutMinutes || 15;

  // Hosted (real Binance Pay) fields
  const checkoutUrl = currentOrder?.checkoutUrl || address;
  const binancePrepayId = currentOrder?.binancePrepayId || '';

  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(timeoutMinutes * 60);
  const [autoState, setAutoState] = useState('idle'); // idle | checking | detected
  const [memoCopied, setMemoCopied] = useState(false);
  const doneRef = useRef(false);

  const close = () => { playSound('close'); useStore.setState({ showBinanceSheet: false }); };

  useEffect(() => { playSound('open'); }, []);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const copy = (value, kind) => navigator.clipboard.writeText(value).then(() => {
    haptic.light();
    playSound('tap');
    if (kind === 'memo') { setMemoCopied(true); window.setTimeout(() => setMemoCopied(false), 1800); }
    else { setCopied(true); toast.success(t(locale, 'copied')); window.setTimeout(() => setCopied(false), 1800); }
  });

  // ── Hosted Binance Pay: poll until Binance reports PAID ──
  useEffect(() => {
    if (mode !== 'hosted' || !binancePrepayId || doneRef.current) return undefined;
    let active = true;
    const tick = async () => {
      try {
        const res = await api.get(`/orders/binance/status/${binancePrepayId}`);
        if (!active) return;
        if (res.data?.orderStatus === 'completed' || res.data?.data?.status === 'PAID') {
          doneRef.current = true;
          const order = await pollOrder(orderNumber, { timeoutMs: 6000, intervalMs: 1000 }).catch(() => null);
          if (order) {
            useStore.setState({
              currentOrder: { order, keys: order.keyValues || [], via: 'binance' },
              showBinanceSheet: false
            });
          }
        }
      } catch (_) { /* keep polling */ }
    };
    const interval = window.setInterval(tick, 4000);
    tick();
    return () => { active = false; window.clearInterval(interval); };
  }, [mode, binancePrepayId, orderNumber]);

  // ── Manual USDT: auto-detect an incoming on-chain transfer ──
  useEffect(() => {
    if (mode !== 'manual' || !orderId || doneRef.current) return undefined;
    let active = true;
    const tick = async () => {
      if (doneRef.current || !active) return;
      setAutoState('checking');
      try {
        const res = await pollBinancePayment(orderId);
        if (res?.completed && active) {
          doneRef.current = true;
          setAutoState('detected');
        }
      } catch (_) { /* keep polling */ }
    };
    const interval = window.setInterval(tick, 10000);
    return () => { active = false; window.clearInterval(interval); };
  }, [mode, orderId]);

  const submit = async () => {
    if (!txHash.trim()) {
      haptic.error();
      toast.error(t(locale, 'txHash'));
      return;
    }
    haptic.medium();
    setLoading(true);
    try {
      const res = await submitBinanceProof(txHash.trim());
      if (res?.completed) {
        haptic.success();
        playSound('success');
        // currentOrder is swapped to the completed order by the store.
        return;
      }
      haptic.success();
      playSound('success');
      toast.success(t(locale, 'submitted'));
      setAutoState('checking');
    } catch (error) {
      haptic.error();
      playSound('error');
      toast.error(error.response?.data?.error || t(locale, 'failed'));
    } finally {
      setLoading(false);
    }
  };

  const supportUsername = String(publicSettings?.support_username || 'support').replace(/^@/, '');
  const openSupport = () => {
    const url = `https://t.me/${supportUsername}`;
    try { window.Telegram?.WebApp?.openTelegramLink?.(url); } catch (_) { window.open(url, '_blank', 'noopener,noreferrer'); }
  };

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-black/75 border-0" onClick={close} aria-label={t(locale, 'cancel')} />
      <section className="fixed bottom-0 left-0 right-0 z-50 bottom-sheet rounded-t-[24px] max-h-[94dvh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={t(locale, 'binance')}>
        <div className="flex justify-center py-3"><span className="w-10 h-1 rounded-full bg-[#2d3748]" /></div>
        <div className="px-5 pb-7 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg font-black text-white flex items-center gap-2"><PremiumIcon name="coin" className="text-[#f0b90b]" /> {t(locale, 'binance')}</h2>
            <button type="button" onClick={close} className="w-10 h-10 min-h-0 rounded-xl border border-[#2d3748] text-[#9ca3af]">×</button>
          </div>

          <p className={`mx-auto w-fit px-3 py-1.5 rounded-lg border font-mono text-sm ${countdown > 300 ? 'border-[#10b981]/30 text-[#6ee7b7]' : 'border-[#ef4444]/30 text-[#fca5a5]'}`}>{Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}</p>

          <div className="gamer-card rounded-2xl p-4 text-center">
            <p className="m-0 text-xs text-[#9ca3af]">{t(locale, 'sendExactAmount')}</p>
            <strong className="block mt-1 text-2xl text-[#f5d06f]">{Number(paymentAmount).toFixed(6)} USDT</strong>
            <button type="button" onClick={() => copy(Number(paymentAmount).toFixed(6))} className="mt-3 min-h-0 px-3 py-1.5 rounded-lg border border-[#10b981]/25 text-xs text-[#6ee7b7]">{t(locale, 'copyAll')}</button>
          </div>

          <div className="grid justify-items-center gap-2">
            <div className="rounded-2xl bg-white p-3"><QRCodeSVG value={checkoutUrl} size={170} bgColor="#fff" fgColor="#000" level="H" /></div>
            <small className="text-[#9ca3af]">{t(locale, 'scanQr')}</small>
          </div>

          <div>
            <p className="mb-2 text-xs text-[#9ca3af]">{t(locale, 'orSendManually')}</p>
            <div className="flex items-center gap-2 rounded-xl border border-[#2d3748] bg-[#11141a] p-2">
              <code className="min-w-0 flex-1 break-all text-[11px] text-white">{address || t(locale, 'contactSupport')}</code>
              <button type="button" onClick={() => copy(address)} disabled={!address} className="w-10 h-10 min-h-0 flex-none rounded-lg border border-[#10b981]/25 text-[#6ee7b7]">{copied ? <PremiumIcon name="checkmark" /> : <PremiumIcon name="copy" />}</button>
            </div>
          </div>

          {binanceId && (
            <div className="rounded-xl border border-[#f0b90b]/25 bg-[#f0b90b]/5 p-3">
              <p className="m-0 text-[11px] text-[#f5d06f]">{t(locale, 'binanceIdLabel')}</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all text-[12px] text-white">{binanceId}</code>
                <button type="button" onClick={() => copy(binanceId)} className="w-10 h-10 min-h-0 flex-none rounded-lg border border-[#f0b90b]/30 text-[#f5d06f]"><PremiumIcon name="copy" /></button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-[#2d3748] bg-[#11141a] p-3">
            <p className="m-0 text-[11px] text-[#9ca3af]">{t(locale, 'includeOrderId')}</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-[12px] text-white">{orderNumber}</code>
              <button type="button" onClick={() => copy(orderNumber, 'memo')} className="w-10 h-10 min-h-0 flex-none rounded-lg border border-[#10b981]/25 text-[#6ee7b7]">{memoCopied ? <PremiumIcon name="checkmark" /> : <PremiumIcon name="copy" />}</button>
            </div>
          </div>

          {currentOrder?.checkoutUrl && mode === 'hosted' && (
            <a href={currentOrder.checkoutUrl} target="_blank" rel="noreferrer" className="block rounded-xl bg-[#f0b90b] py-3 text-center text-sm font-black text-[#16110a]">{locale === 'ar' ? 'فتح Binance' : 'Open Binance'}</a>
          )}

          {autoState === 'checking' && (
            <p className="m-0 flex items-center justify-center gap-2 text-center text-[12px] text-[#9ca3af]">
              <span className="stars-waiting-dot" aria-hidden="true" />
              {t(locale, 'autoChecking')}
            </p>
          )}

          <div>
            <label htmlFor="tx-hash" className="mb-2 block text-sm font-bold text-white">{t(locale, 'paymentProof')}</label>
            <input
              id="tx-hash"
              type="text"
              placeholder={t(locale, 'txHash')}
              value={txHash}
              onChange={(event) => setTxHash(event.target.value)}
              className="w-full h-11 rounded-xl border border-[#2d3748] bg-[#11141a] px-3 text-sm text-white outline-none focus:border-[#10b981]"
            />
          </div>

          <button type="button" onClick={submit} disabled={loading || !txHash.trim()} className="btn-sheen btn-sheen--on w-full rounded-xl bg-[#10b981] py-3 font-black text-[#06110b] disabled:opacity-45 active:scale-[.985] transition-transform">
            {loading ? t(locale, 'loading') : t(locale, 'submit')}
          </button>

          <button type="button" onClick={openSupport} className="w-full min-h-0 py-3 px-4 rounded-xl border border-[#a855f7]/40 bg-gradient-to-l from-[#a855f7]/15 to-[#7c3aed]/5 text-[#d8b4fe] flex items-center justify-between gap-3 font-black text-[13px] active:scale-[.985] transition-transform">
            <span className="flex items-center gap-2"><span aria-hidden="true">🎁</span>{t(locale, 'offersBalance')}</span>
            <span dir="ltr" className="text-[11px] opacity-80">@{supportUsername}</span>
          </button>
        </div>
      </section>
    </>
  );
}
