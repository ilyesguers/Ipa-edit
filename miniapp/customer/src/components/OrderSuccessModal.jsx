import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { cleanDisplayText, t } from '../i18n';
import PremiumIcon from './PremiumIcon';
import { haptic } from '../utils/haptic';
import { playSound } from '../utils/sound';

export default function OrderSuccessModal({ data, onClose }) {
  const { locale } = useStore();
  const [copied, setCopied] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const keys = data?.keys || [];

  useEffect(() => { haptic.success(); playSound('success'); }, []);

  const copy = (key, index) => navigator.clipboard.writeText(key).then(() => {
    haptic.light();
    playSound('tap');
    setCopied(index);
    toast.success(t(locale, 'toastCopied'));
    window.setTimeout(() => setCopied(null), 1800);
  });

  const copyAll = useCallback(() => navigator.clipboard.writeText(keys.join('\n')).then(() => {
    haptic.light();
    playSound('tap');
    setCopiedAll(true);
    toast.success(t(locale, 'copied'));
    window.setTimeout(() => setCopiedAll(false), 1800);
  }), [keys, locale]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={t(locale, 'purchaseSuccess')}>
      <section className="w-full max-w-sm overflow-hidden rounded-3xl border border-[#10b981]/30 bg-[#161922]">
        <header className="p-5 text-center border-b border-[#2d3748]">
          <PremiumIcon name="checkmark" size="2rem" className="text-[#10b981]" />
          <h2 className="mt-2 text-xl font-black text-white">{t(locale, 'purchaseSuccess')}</h2>
          <p className="m-0 mt-1 text-xs text-[#9ca3af]">{t(locale, 'instantDelivery')}</p>
        </header>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-white">{t(locale, 'yourKeys')} ({keys.length})</strong>
            {keys.length > 1 && <button type="button" onClick={copyAll} className="min-h-0 rounded-lg border border-[#10b981]/30 px-3 py-1.5 text-xs font-bold text-[#6ee7b7]">{copiedAll ? t(locale, 'copied') : t(locale, 'copyAll')}</button>}
          </div>
          {keys.map((key, index) => (
            <div key={`${key}-${index}`} className="flex items-center gap-2 rounded-xl border border-[#2d3748] bg-[#11141a] p-2.5">
              <code className="min-w-0 flex-1 break-all text-xs text-[#d1fae5]">{key}</code>
              <button type="button" onClick={() => copy(key, index)} className="w-10 h-10 min-h-0 rounded-lg border border-[#10b981]/25 text-[#6ee7b7]" aria-label={t(locale, 'copyAll')}>
                <PremiumIcon name={copied === index ? 'checkmark' : 'copy'} />
              </button>
            </div>
          ))}
          <p className="m-0 text-center text-xs text-[#9ca3af]">{cleanDisplayText(data?.order?.productName)} · {cleanDisplayText(data?.order?.durationName)}</p>
          {data?.via === 'stars' && data?.starsAmount ? (
            <p className="m-0 text-center text-[11px] text-[#fde68a]">⭐ {data.starsAmount} {t(locale, 'starsLabel')}</p>
          ) : null}
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-[#10b981] py-3 font-black text-[#06110b]">{t(locale, 'thankYou')}</button>
        </div>
      </section>
    </div>
  );
}
